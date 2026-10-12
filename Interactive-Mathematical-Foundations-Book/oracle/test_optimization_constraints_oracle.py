"""Literal and independent-method checks for M10 Block C.

Covers canonical box/disk/penalty transitions, explicit start projection,
nearest-point KKT and idempotence, completed-square minima, rational closed
forms, clipping metadata, enabled/disabled/equality diagnostics and precedence,
finite transition guards versus retained failed evaluations, invalid numeric
boundaries, deterministic finite JSON and exact-byte CLI freshness. The four
Block C Python/NumPy references are discovered separately from the eight A/B
stems; all four named references must exist and execute successfully.
No TypeScript, model output or reference output supplies expected values.
"""
from contextlib import redirect_stderr, redirect_stdout
from decimal import Decimal, localcontext
from fractions import Fraction as F
from io import StringIO
import json
import math
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import optimization_constraints_oracle as oracle


class OptimizationConstraintsOracleTests(unittest.TestCase):
    def test_none_box_boundary_and_large_finite_literals(self):
        self.assertEqual(oracle.project([2, -3], 'none'), dict(
            status='finite', changed=False, point=[2., -3.], correction=[0., 0.], distance=0.,
            inputNorm=math.sqrt(13), projectedNorm=math.sqrt(13)))
        self.assertEqual(oracle.project([2, -3], 'box'), dict(
            status='finite', changed=True, point=[1., -1.], correction=[-1., 2.], distance=math.sqrt(5),
            inputNorm=math.sqrt(13), projectedNorm=math.sqrt(2)))
        for point in ([0, 0], [.25, -.75], [1, -1]):
            result = oracle.project(point, 'box')
            self.assertEqual(result['point'], point)
            self.assertFalse(result['changed'])
        self.assertEqual(oracle.project([-1.0001, .25], 'box')['correction'], [.0001, 0.])
        self.assertEqual(oracle.project([1e200, -1e200], 'box')['point'], [1., -1.])
        self.assertEqual(oracle.project([3, 4], 'disk')['point'], [.6, .8])
        self.assertEqual(oracle.project([-5, 12], 'disk')['point'], [float(F(-5, 13)), float(F(12, 13))])

    def test_disk_radicals_are_decimal80_and_large_norm_is_scaled(self):
        with localcontext() as context:
            context.prec = 80
            radius = Decimal(13).sqrt()
            result = oracle.project([2, -3], 'disk')
            self.assertEqual(result['point'], [float(Decimal(2) / radius), float(-Decimal(3) / radius)])
            self.assertEqual(result['projectedNorm'], 1.)
            large = oracle.project([1e200, -1e200], 'disk')
            self.assertEqual(large['status'], 'finite')
            inverse = Decimal(1) / Decimal(2).sqrt()
            self.assertEqual(large['point'], [float(inverse), float(-inverse)])
        for point in ([0, 0], [1, 0], [0, -1], [.6, .8], [.25, .25]):
            self.assertEqual(oracle.project(point, 'disk')['point'], point)
            self.assertFalse(oracle.project(point, 'disk')['changed'])

    def test_projection_idempotence_and_kkt_nearest_points(self):
        support = {
            'none': [(-3, 5), (0, 0), (1, -1)],
            'box': [(-1, -1), (-1, 1), (1, -1), (1, 1), (0, 0), (F(1, 3), F(-1, 2))],
            'disk': [(1, 0), (-1, 0), (0, 1), (0, -1), (0, 0), (F(3, 5), F(4, 5)), (F(-5, 13), F(12, 13))],
        }
        for case in oracle.build_fixture()['projections']:
            config, expected = case['config'], case['expected']
            constraint = config['constraint']
            with self.subTest(config=config):
                # Exporting a disk boundary can put it one ulp outside the circle.
                again_exported = oracle.project(expected['point'], constraint)['point']
                for actual, wanted in zip(again_exported, expected['point']):
                    self.assertLessEqual(abs(actual-wanted), 8*math.ulp(max(1,abs(wanted))))
                z = tuple(F(str(v)) for v in config['point'])
                q = oracle.fraction_projection(z, constraint)
                again = oracle.fraction_projection(q, constraint)
                if constraint != 'disk' or sum(v*v for v in q) == 1:
                    self.assertEqual(again, q)
                else:
                    self.assertTrue(all(abs(again[i]-q[i]) <= F(1,10**77) for i in (0,1)))
                residual = tuple(z[i] - q[i] for i in (0, 1))
                if constraint == 'box':
                    self.assertTrue(all(-1 <= v <= 1 for v in q))
                if constraint == 'disk':
                    # Only a genuine irrational radius has 80-digit roundoff here.
                    self.assertLessEqual(abs(sum(v*v for v in q) - 1) if expected['changed'] else 0, F(1, 10**77))
                for candidate in support[constraint]:
                    dot = sum(residual[i] * (candidate[i] - q[i]) for i in (0, 1))
                    self.assertLessEqual(dot, 0)  # normal-cone/KKT variational inequality
                    nearest = sum((z[i] - q[i]) ** 2 for i in (0, 1))
                    other = sum((z[i] - candidate[i]) ** 2 for i in (0, 1))
                    self.assertLessEqual(nearest, other)

    def test_quadratic_penalty_evaluation_literals(self):
        plain = oracle.evaluate(dict(point=[0, 1], a=1, center=2, **{'lambda': 0}))
        self.assertEqual(plain, dict(status='finite', baseLoss=4., penaltyLoss=0., loss=4.,
                                    gradient=[-2., 4.], hessian=[[1., 0.], [0., 4.]]))
        penalized = oracle.evaluate(dict(point=[0, 1], a=1, center=2, **{'lambda': 1}))
        self.assertEqual(penalized, dict(status='finite', baseLoss=4., penaltyLoss=1., loss=5.,
                                        gradient=[-2., 6.], hessian=[[3., 0.], [0., 6.]]))
        next_value = oracle.evaluate(dict(point=[.2, .4], a=1, center=2, **{'lambda': 1}))
        self.assertEqual((next_value['baseLoss'], next_value['penaltyLoss'], next_value['loss']), (1.94, .2, 2.14))
        self.assertEqual(next_value['gradient'], [-1.4, 2.4])

    def test_penalty_minima_completed_square_and_boundary_kkt(self):
        result = oracle.minimizer(dict(a=1, center=2, **{'lambda': 1}))
        self.assertEqual(result['point'], [float(F(2, 3)), 0.])
        self.assertEqual(result['loss'], float(F(4, 3)))
        self.assertEqual(result['baseLoss'], float(F(8, 9)))
        self.assertEqual(result['penaltyLoss'], float(F(4, 9)))
        self.assertEqual(result['gradient'], [0., 0.])
        self.assertEqual(result['hessian'], [[3., 0.], [0., 6.]])
        for constraint in ('box', 'disk'):
            for center, boundary, gradient in ((2, 1, -1), (-2, -1, 1)):
                with self.subTest(constraint=constraint, center=center):
                    result = oracle.minimizer(dict(a=1, center=center, constraint=constraint))
                    self.assertEqual(result['point'], [boundary, 0.])
                    self.assertEqual(result['unconstrainedPoint'], [center, 0.])
                    self.assertEqual(result['loss'], .5)
                    self.assertEqual(result['normalMultiplier'], 1.)
                    self.assertEqual(result['gradient'], [gradient, 0.])
                    self.assertEqual(gradient + result['normalMultiplier'] * boundary, 0.)
        # Minimum is strictly convex and unique; a stationary trace alone makes no such claim.
        for case in oracle.build_fixture()['penalties']['minimizers']:
            self.assertGreater(case['expected']['hessian'][0][0], 0)
            self.assertGreater(case['expected']['hessian'][1][1], 0)

    def test_flat_penalty_and_singular_critical_point(self):
        result = oracle.evaluate(dict(objective='flat', point=[1, -2], **{'lambda': .5}))
        self.assertEqual(result, dict(status='finite', baseLoss=17., penaltyLoss=2.5, loss=19.5,
                                     gradient=[5., -34.], hessian=[[13., 0.], [0., 49.]]))
        result = oracle.trace(dict(objective='flat', start=[0, 0]))
        self.assertEqual(result['reason'], 'zero-gradient')
        self.assertEqual(result['acceptedSteps'], 0)
        self.assertEqual(result['final']['evaluation']['hessian'], [[0., 0.], [0., 0.]])
        self.assertNotIn('optimal', result)
        self.assertNotIn('certificate', result)

    def test_saddle_zero_gradient_is_not_an_optimality_certificate(self):
        value = oracle.evaluate(dict(objective='saddle', point=[1, -2]))
        self.assertEqual(value['loss'], -3.)
        self.assertEqual(value['gradient'], [2., 4.])
        self.assertEqual(value['hessian'], [[2., 0.], [0., -2.]])
        result = oracle.trace(dict(objective='saddle', start=[0, 0]))
        self.assertEqual(result['reason'], 'zero-gradient')
        self.assertEqual(result['acceptedSteps'], 0)
        self.assertEqual(result['steps'], [])
        self.assertEqual(result['final']['evaluation']['hessian'], [[2., 0.], [0., -2.]])
        self.assertNotIn('certificate', result)

    def test_box_canonical_proposal_correction_and_displacement(self):
        result = oracle.trace(dict(a=1, center=2, start=[0, 1], eta=1, constraint='box'))
        first = result['steps'][0]
        self.assertEqual(first['currentLoss'], 4.)
        self.assertEqual(first['rawGradient'], [-2., 4.])
        self.assertEqual(first['appliedGradient'], [-2., 4.])
        self.assertEqual(first['clipScale'], 1.)
        self.assertEqual(first['proposedUpdate'], [2., -4.])
        self.assertEqual(first['proposal'], [2., -3.])
        self.assertEqual(first['nextPoint'], [1., -1.])
        self.assertEqual(first['nextLoss'], 2.5)
        self.assertEqual(first['projectionCorrection'], [-1., 2.])
        self.assertEqual(first['actualDisplacement'], [1., -2.])
        second = result['steps'][1]
        self.assertEqual(second['rawGradient'], [-1., -4.])
        self.assertEqual(second['proposal'], [2., 3.])
        self.assertEqual(second['projectionCorrection'], [-1., -2.])
        self.assertEqual(second['actualDisplacement'], [0., 2.])
        self.assertEqual(result['reason'], 'budget')
        self.assertEqual(result['acceptedSteps'], 12)
        self.assertTrue(all(step['nextLoss'] == 2.5 for step in result['steps']))

    def test_disk_canonical_projected_step(self):
        result = oracle.trace(dict(center=2, start=[0, 1], eta=1, iterations=1, constraint='disk'))
        row = result['steps'][0]
        with localcontext() as context:
            context.prec = 80
            root = Decimal(13).sqrt()
            x, y = Decimal(2)/root, -Decimal(3)/root
            expected_loss = (x-2)**2/2+2*y*y
            self.assertEqual(row['nextPoint'], [float(x), float(y)])
            self.assertEqual(row['nextLoss'], float(expected_loss))
            self.assertEqual(row['projectionCorrection'], [float(x-2), float(y+3)])
            self.assertEqual(row['actualDisplacement'], [float(x), float(y-1)])
        self.assertEqual(row['proposal'], [2., -3.])

    def test_explicit_initial_projection_before_evaluation(self):
        box = oracle.trace(dict(start=[2, -3], center=2, constraint='box', iterations=1))
        self.assertEqual(box['initial']['requestedStart'], [2., -3.])
        self.assertEqual(box['initial']['point'], [1., -1.])
        self.assertEqual(box['initial']['projectionCorrection'], [-1., 2.])
        self.assertEqual(box['initial']['evaluation']['loss'], 2.5)
        self.assertEqual(box['steps'][0]['currentPoint'], [1., -1.])
        disk = oracle.trace(dict(start=[3, 4], constraint='disk', iterations=1))
        self.assertEqual(disk['initial']['point'], [.6, .8])
        self.assertEqual(disk['initial']['projectionCorrection'], [-2.4, -3.2])
        none = oracle.trace(dict(start=[2, -3], iterations=0))
        self.assertEqual(none['initial']['point'], [2., -3.])
        self.assertEqual(none['initial']['projectionCorrection'], [0., 0.])
        rescued = oracle.trace(dict(objective='flat', start=[1e80, 0], constraint='box', iterations=1, eta=.125))
        self.assertEqual(rescued['initial']['point'], [1., 0.])
        self.assertEqual(rescued['initial']['evaluation']['loss'], 1.)
        self.assertEqual(rescued['steps'][0]['nextPoint'], [.5, 0.])

    def test_penalized_descent_and_exact_affine_history(self):
        config = dict(center=2, start=[0, 1], eta=.1, iterations=8, **{'lambda': 1})
        result = oracle.trace(config)
        first = result['steps'][0]
        self.assertEqual(first['currentLoss'], 5.)
        self.assertEqual(first['rawGradient'], [-2., 6.])
        self.assertEqual(first['nextPoint'], [.2, .4])
        self.assertEqual(first['nextLoss'], 2.14)
        exact = oracle.rational_history(config, 8)
        for k, row in enumerate(exact):
            x, y = F(2, 3)*(1-F(7, 10)**k), F(2, 5)**k
            loss = F(4, 3)+F(3, 2)*(x-F(2, 3))**2+3*y*y
            self.assertEqual([F(v) for v in row['point']], [x, y])
            self.assertEqual(F(row['loss']), loss)
            self.assertEqual([F(v) for v in row['gradient']], [3*x-2, 6*y])
        self.assertEqual(exact[0]['loss'], '5/1')
        self.assertEqual(exact[1]['loss'], '107/50')

    def test_default_quadratic_history_matches_closed_form(self):
        history = oracle.rational_history({}, 12)
        self.assertEqual(history[0], dict(k=0, point=['2/1', '1/1'], loss='4/1', gradient=['2/1', '4/1']))
        for k, row in enumerate(history[1:], start=1):
            x = 2 * F(3, 4)**k
            self.assertEqual([F(v) for v in row['point']], [x, 0])
            self.assertEqual(F(row['loss']), 2*F(9, 16)**k)
        self.assertEqual(history[3]['point'], ['27/32', '0/1'])
        self.assertEqual(history[3]['loss'], '729/2048')

    def test_clipping_preserves_raw_and_applied_metadata(self):
        row = oracle.trace(dict(clip=1, iterations=1))['steps'][0]
        with localcontext() as context:
            context.prec = 80
            root = Decimal(5).sqrt()
            self.assertEqual(row['rawNorm'], float(2*root))
            self.assertEqual(row['clipScale'], float(1/(2*root)))
            self.assertEqual(row['appliedGradient'], [float(1/root), float(2/root)])
            self.assertEqual(row['proposedUpdate'], [float(-Decimal('.25')/root), float(-Decimal('.5')/root)])
            self.assertEqual(row['nextPoint'], [float(2-Decimal('.25')/root), float(1-Decimal('.5')/root)])
        self.assertEqual(row['rawGradient'], [2., 4.])
        self.assertEqual(row['appliedNorm'], 1.)
        self.assertEqual(row['projectionCorrection'], [0., 0.])
        self.assertEqual(row['actualDisplacement'], row['proposedUpdate'])
        unclipped = oracle.trace(dict(iterations=1))['steps'][0]
        self.assertEqual(oracle.trace(dict(clip=10, iterations=1))['steps'][0], unclipped)
        boundary = oracle.trace(dict(start=[2, 0], clip=2, iterations=1))['steps'][0]
        self.assertEqual(boundary['clipScale'], 1.)
        self.assertEqual(boundary['appliedGradient'], [2., 0.])

    def test_gradient_threshold_before_twelfth_step_and_before_clip(self):
        result = oracle.trace(dict(gradientTolerance=.1))
        self.assertEqual(result['reason'], 'gradient-threshold')
        self.assertEqual(result['acceptedSteps'], 11)
        self.assertEqual(len(result['steps']), 11)
        self.assertEqual(result['final']['point'], [float(2*F(3, 4)**11), 0.])
        self.assertLessEqual(result['final']['rawNorm'], .1)
        self.assertGreater(result['steps'][-1]['rawNorm'], .1)
        raw = oracle.trace(dict(clip=.01, gradientTolerance=1, iterations=1))
        self.assertEqual(raw['reason'], 'budget')
        self.assertEqual(raw['acceptedSteps'], 1)
        self.assertEqual(raw['steps'][0]['appliedNorm'], .01)

    def test_absolute_loss_change_two_steps_and_budget(self):
        result = oracle.trace(dict(lossTolerance=.5))
        self.assertEqual(result['reason'], 'loss-change')
        self.assertEqual(result['acceptedSteps'], 2)
        self.assertEqual([r['lossChange'] for r in result['steps']], [2.875, .4921875])
        self.assertEqual(result['final']['point'], [1.125, 0.])
        limited = oracle.trace(dict(iterations=2))
        self.assertEqual(limited['reason'], 'budget')
        self.assertEqual(limited['acceptedSteps'], 2)
        self.assertEqual(limited['steps'], result['steps'])

    def test_disabled_thresholds_zero_and_boundary_stagnation(self):
        default = oracle.trace(dict(gradientTolerance=0, lossTolerance=0, clip=0))
        self.assertEqual(default['reason'], 'budget')
        self.assertEqual(default['acceptedSteps'], 12)
        stationary = oracle.trace(dict(start=[1, 0], center=2, constraint='box', lossTolerance=.01))
        self.assertEqual(stationary['reason'], 'loss-change')
        self.assertEqual(stationary['acceptedSteps'], 1)
        self.assertEqual(stationary['steps'][0]['rawGradient'], [-1., 0.])
        self.assertEqual(stationary['steps'][0]['actualDisplacement'], [0., 0.])
        self.assertEqual(stationary['steps'][0]['lossChange'], 0.)
        self.assertEqual(oracle.trace(dict(start=[0, 0]))['reason'], 'zero-gradient')

    def test_stop_precedence_equality_and_zero_budget(self):
        self.assertEqual(oracle.trace(dict(start=[0, 0], gradientTolerance=.1))['reason'], 'gradient-threshold')
        self.assertEqual(oracle.trace(dict(start=[2, 0], gradientTolerance=2))['acceptedSteps'], 0)
        equality = oracle.trace(dict(start=[2, 0], lossTolerance=.875, iterations=1))
        self.assertEqual(equality['reason'], 'loss-change')  # precedes budget
        divergence = oracle.trace(dict(eta=2, divergenceLimit=5, lossTolerance=100, iterations=1))
        self.assertEqual(divergence['reason'], 'divergence')  # precedes small loss change and budget
        exact_bound = oracle.trace(dict(start=[0, 1], eta=.5, divergenceLimit=1, lossTolerance=.1, iterations=1))
        self.assertEqual(exact_bound['reason'], 'loss-change')  # bound is strict >
        zero = oracle.trace(dict(iterations=0))
        self.assertEqual(zero['reason'], 'budget')
        self.assertEqual(zero['steps'], [])
        self.assertEqual(zero['initial']['evaluation']['loss'], 4.)
        invalid = oracle.trace(dict(objective='flat', start=[1e80, 0], gradientTolerance=1e300, iterations=0))
        self.assertEqual(invalid['reason'], 'non-finite-initial')

    def test_divergence_default_bound_and_configured_bound(self):
        result = oracle.trace(dict(eta=2))
        self.assertEqual(result['reason'], 'divergence')
        self.assertEqual(result['acceptedSteps'], 8)
        self.assertEqual(result['final']['point'], [2., float(7**8)])
        self.assertLess(math.hypot(*result['steps'][-1]['currentPoint']), 1e6)
        self.assertGreater(math.hypot(*result['final']['point']), 1e6)
        bounded = oracle.trace(dict(eta=2, divergenceLimit=5))
        self.assertEqual(bounded['acceptedSteps'], 1)
        self.assertEqual(bounded['final']['point'], [-2., -7.])

    def test_non_finite_transition_is_not_accepted_or_rescued_by_projection(self):
        for constraint in ('none', 'box', 'disk'):
            # For box/disk, a huge rate still overflows an otherwise finite proposal.
            start = [1e150, 0] if constraint == 'none' else [1, 0]
            config = dict(start=start, eta=1e308 if constraint != 'none' else 1e200,
                          a=4 if constraint != 'none' else 1, constraint=constraint, divergenceLimit=1e300)
            result = oracle.trace(config)
            with self.subTest(constraint=constraint):
                self.assertEqual(result['reason'], 'non-finite-transition')
                self.assertEqual(result['acceptedSteps'], 0)
                self.assertEqual(len(result['steps']), 1)
                row = result['steps'][0]
                self.assertFalse(row['accepted'])
                self.assertIsNone(row['proposedUpdate'])
                self.assertIsNone(row['proposal'])
                self.assertIsNone(row['nextPoint'])
                self.assertEqual(result['final']['point'], start)
                self.assertIsNotNone(row['rawGradient'])
                self.assertIsNotNone(row['appliedGradient'])
                self.assertEqual(row['status'], 'non-finite-transition')
                oracle.render(result)

    def test_non_finite_next_evaluation_retains_point_and_precedes_divergence(self):
        for bound in (1e300, 1e200):
            result = oracle.trace(dict(objective='flat', start=[3, 1], eta=2, divergenceLimit=bound))
            with self.subTest(bound=bound):
                self.assertEqual(result['reason'], 'non-finite-evaluation')
                self.assertEqual(result['acceptedSteps'], 5)
                self.assertEqual(len(result['steps']), 5)
                row = result['steps'][-1]
                self.assertTrue(row['accepted'])
                self.assertEqual(row['status'], 'non-finite-evaluation')
                self.assertEqual(result['final']['point'], row['nextPoint'])
                self.assertTrue(all(math.isfinite(v) for v in row['nextPoint']))
                self.assertIsNone(row['nextLoss'])
                self.assertIsNone(result['final']['rawNorm'])
                self.assertEqual(result['final']['evaluation'], dict(status='non-finite', **{k:None for k in oracle.EVALUATION_FIELDS}))
                self.assertTrue(all(r['status'] == 'finite' for r in result['steps'][:-1]))
                oracle.render(result)
        # Exact first quartic update: 3-2*4*27=-213, 1-2*4=-7.
        self.assertEqual(result['steps'][0]['nextPoint'], [-213., -7.])
        self.assertEqual(result['steps'][1]['nextPoint'], [77308563., 2737.])

    def test_non_finite_inputs_outputs_and_json_guard(self):
        for point in ([math.inf, 0], [0, math.nan], [0, -math.inf]):
            self.assertEqual(oracle.project(point)['status'], 'non-finite')
            self.assertEqual(oracle.evaluate(dict(point=point))['status'], 'non-finite')
            self.assertEqual(oracle.trace(dict(start=point))['reason'], 'non-finite-initial')
        for config in (dict(objective='flat', point=[1e80, 0]), dict(point=[1e154, 0], **{'lambda': 2})):
            result = oracle.evaluate(config)
            self.assertEqual(result, dict(status='non-finite', **{k:None for k in oracle.EVALUATION_FIELDS}))
        self.assertEqual(oracle.evaluate(dict(point=[1e154, 0]))['loss'], 5e307)
        with self.assertRaises(ValueError):
            oracle.render({'bad': math.inf})
        with self.assertRaises(ValueError):
            oracle.render({'bad': math.nan})

    def test_invalid_configuration_numeric_domains(self):
        invalid = [dict(a=0), dict(a=-1), dict(a=.125), dict(center=.125),
                   dict(a=math.inf), dict(center=math.nan), {'lambda': -1}, {'lambda': math.inf},
                   dict(a=True), dict(center='1'), dict(eta=0), dict(eta=-.1), dict(eta=math.inf),
                   dict(iterations=-1), dict(iterations=41), dict(iterations=1.5), dict(iterations=True),
                   dict(start=[0]), dict(start=[0, 0, 0]), dict(start=['0', 0]), dict(start=[True, 0]),
                   dict(objective='well'), dict(constraint='sphere'), dict(divergenceLimit=0),
                   dict(divergenceLimit=-1), dict(divergenceLimit=math.inf), dict(unknown=1)]
        invalid.extend({key:value} for key in ('gradientTolerance','lossTolerance','clip')
                       for value in (-1, math.inf, math.nan, True, '0'))
        for method in (oracle.trace, oracle.decimal_trace):
            for config in invalid + [[], 1, 'config']:
                with self.subTest(method=method.__name__, config=config), self.assertRaises(ValueError):
                    method(config)
        for method in (oracle.evaluate, oracle.minimizer):
            for config in ({'a':0}, {'a':.125}, {'center':.125}, {'lambda':-1}, {'lambda':True}, {'unknown':1}):
                with self.subTest(method=method.__name__, config=config), self.assertRaises(ValueError):
                    method(config)
        for point in ([0], [0,0,0], ['0',0], [True,0]):
            with self.subTest(point=point), self.assertRaises(ValueError):
                oracle.project(point)
        for constraint in ('sphere', '', None):
            with self.subTest(constraint=constraint), self.assertRaises(ValueError):
                oracle.project([0, 0], constraint)
        for method in ('other', None):
            with self.assertRaises(ValueError):
                oracle.project([0, 0], method=method)
        with self.assertRaises(ValueError):
            oracle.rational_history(dict(clip=1), 1)

    def test_all_fraction_and_decimal80_methods_agree_exactly_on_fixture(self):
        data = oracle.build_fixture()
        for case in data['projections']:
            with self.subTest(section='projections', config=case['config']):
                self.assertEqual(oracle.project(**case['config'], method='decimal'), case['expected'])
        for section, method in (('evaluations', oracle.evaluate), ('minimizers', oracle.minimizer)):
            for case in data['penalties'][section]:
                with self.subTest(section=section, config=case['config']):
                    self.assertEqual(method(case['config'], method='decimal'), case['expected'])
        for case in data['traces']:
            expected = {k:v for k,v in case['expected'].items() if k != 'exactHistory'}
            with self.subTest(section='traces', config=case['config']):
                self.assertEqual(oracle.decimal_trace(case['config']), expected)

    def test_secondary_mathematics_does_not_call_primary_methods(self):
        failure = AssertionError('secondary called Fraction mathematics')
        with patch.object(oracle, 'fraction_evaluation', side_effect=failure), \
             patch.object(oracle, 'fraction_projection', side_effect=failure), \
             patch.object(oracle, 'fraction_norm', side_effect=failure), \
             patch.object(oracle, 'trace', side_effect=failure), \
             patch.object(oracle, 'rational_history', side_effect=failure):
            self.assertEqual(oracle.project([3, 4], 'disk', method='decimal')['point'], [.6, .8])
            self.assertEqual(oracle.evaluate(dict(point=[0, 1], center=2, **{'lambda':1}), method='decimal')['loss'], 5.)
            self.assertEqual(oracle.minimizer(dict(center=2, **{'lambda':1}), method='decimal')['loss'], float(F(4, 3)))
            result = oracle.decimal_trace(dict(clip=1, constraint='disk', iterations=2))
            self.assertEqual(result['acceptedSteps'], 2)

    def test_primary_mathematics_does_not_call_secondary_methods(self):
        failure = AssertionError('primary called Decimal trajectory mathematics')
        with patch.object(oracle, 'decimal_evaluation', side_effect=failure), \
             patch.object(oracle, 'decimal_projection', side_effect=failure), \
             patch.object(oracle, 'decimal_norm', side_effect=failure), \
             patch.object(oracle, 'decimal_trace', side_effect=failure):
            self.assertEqual(oracle.project([3, 4], 'disk')['point'], [.6, .8])
            self.assertEqual(oracle.trace(dict(clip=1, constraint='disk', iterations=2))['acceptedSteps'], 2)

    def test_fixture_schema_bounds_rational_histories_and_determinism(self):
        data = oracle.build_fixture()
        self.assertEqual(set(data), {'policy','projections','penalties','traces'})
        self.assertEqual([len(data['projections']),len(data['penalties']['evaluations']),
                          len(data['penalties']['minimizers']),len(data['traces'])], [22,16,9,30])
        self.assertEqual(data['policy']['tolerance']['evaluationUlps'], 8)
        self.assertEqual(data['policy']['tolerance']['traceUlps'], 128)
        self.assertEqual(oracle.render(data), oracle.render(oracle.build_fixture()))
        self.assertEqual(json.loads(oracle.render(data)), data)
        reasons = set()
        for case in data['traces']:
            config, result = case['config'], case['expected']
            self.assertEqual(set(config), set(oracle.DEFAULTS))
            self.assertLessEqual(config['iterations'], 12)
            self.assertLessEqual(result['acceptedSteps'], config['iterations'])
            self.assertEqual([s['k'] for s in result['steps']], list(range(len(result['steps']))))
            self.assertEqual(sum(s['accepted'] for s in result['steps']), result['acceptedSteps'])
            reasons.add(result['reason'])
            if 'exactHistory' in result:
                history = result['exactHistory']
                self.assertEqual(len(history), result['acceptedSteps']+1)
                for k, row in enumerate(history):
                    point = result['initial']['point'] if k == 0 else result['steps'][k-1]['nextPoint']
                    loss = result['initial']['evaluation']['loss'] if k == 0 else result['steps'][k-1]['nextLoss']
                    self.assertEqual([float(F(v)) for v in row['point']], point)
                    self.assertEqual(float(F(row['loss'])), loss)
                    self.assertTrue(all(oracle.fraction_text(F(v)) == v for v in row['point']+row['gradient']+[row['loss']]))
        self.assertEqual(reasons, set(oracle.POLICY['stopping']['reasons']))
        def finite_json(value):
            if isinstance(value, dict):
                for item in value.values():
                    finite_json(item)
            elif isinstance(value, list):
                for item in value:
                    finite_json(item)
            elif type(value) is float:
                self.assertTrue(math.isfinite(value))
        finite_json(data)

    def test_saved_fixture_is_exactly_fresh(self):
        self.assertEqual(oracle.FIXTURE.read_bytes(), oracle.render(oracle.build_fixture()).encode('utf-8'))

    def test_cli_missing_stale_crlf_and_default_check_never_rewrite(self):
        with TemporaryDirectory() as directory, patch.object(oracle, 'FIXTURE', Path(directory)/'fixture.json'):
            with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertFalse(oracle.FIXTURE.exists())
                self.assertEqual(oracle.main(['--write']), 0)
                original = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']), 0)
                self.assertEqual(oracle.main([]), 0)
                self.assertEqual(oracle.FIXTURE.read_bytes(), original)
                crlf = original.replace(b'\n', b'\r\n')
                oracle.FIXTURE.write_bytes(crlf)
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertEqual(oracle.FIXTURE.read_bytes(), crlf)
                modified = json.loads(original)
                modified['traces'][0]['expected']['steps'][0]['nextPoint'][0] = -999.
                oracle.FIXTURE.write_text(oracle.render(modified), encoding='utf-8')
                stale_bytes = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertEqual(oracle.FIXTURE.read_bytes(), stale_bytes)
                self.assertEqual(oracle.main(['--write']), 0)
                self.assertEqual(oracle.FIXTURE.read_bytes(), original)

    def test_all_four_block_c_reference_files_execute(self):
        for name in ('optimization_constraints.py', 'optimization_constraints_numpy.py',
                     'optimization_diagnostics.py', 'optimization_diagnostics_numpy.py'):
            path = oracle.ROOT / 'code/python' / name
            with self.subTest(filename=name):
                self.assertTrue(path.is_file(), f'Required chapter reference is missing: {name}')
                result = subprocess.run([sys.executable, '-B', str(path)], cwd=oracle.ROOT,
                                        capture_output=True, text=True, timeout=30)
                self.assertEqual(result.returncode, 0, result.stdout+result.stderr)



if __name__ == '__main__':
    unittest.main()
