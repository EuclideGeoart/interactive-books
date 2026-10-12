"""Literal checks for the independent M10 Block B oracle, and its eight references."""
from contextlib import redirect_stderr, redirect_stdout
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

import optimization_dynamics_oracle as oracle


class OptimizationDynamicsOracleTests(unittest.TestCase):
    def test_binary64_input_transition_uses_independent_exact_values(self):
        case = dict(config=dict(a=1, center=0, b1=0, b2=0, eta=.25, eps=.5), state=dict(point=[2,1], adam=dict(time=1, previous=dict(m=[0,0],v=[0,0]))))
        row = oracle.binary64_adam_transitions([case])[0]
        self.assertEqual(row['gradient'], [2,4])
        self.assertEqual(row['mhat'], [2,4])
        self.assertEqual(row['vhat'], [4,16])
        self.assertEqual(row['update'], [-.2,float(F(-2,9))])

    def test_gd_closed_form_hand_worked_steps(self):
        self.assertEqual(oracle.stability(K=2), [
            dict(k=0, status='finite', theta=[2.0, 1.0], loss=4.0, gradient=[2.0, 4.0],
                 update=[-0.5, -1.0], nextTheta=[1.5, 0.0], nextLoss=1.125),
            dict(k=1, status='finite', theta=[1.5, 0.0], loss=1.125, gradient=[1.5, 0.0],
                 update=[-0.375, 0.0], nextTheta=[1.125, 0.0], nextLoss=0.6328125),
        ])
        # x_3=2*(3/4)^3=27/32; L_3=(27/32)^2/2=729/2048.
        third = oracle.stability(K=3)[2]
        self.assertEqual(third['nextTheta'], [0.84375, 0.0])
        self.assertEqual(third['nextLoss'], 0.35595703125)
        self.assertEqual(oracle.stability(K=1, a=4, center=1)[0]['nextTheta'], [1.0, 0.0])
        self.assertEqual(oracle.stability(K=1, a=4, center=1)[0]['nextLoss'], 0.0)

    def test_rate_monotone_oscillation_boundary_and_divergence(self):
        slow = oracle.stability(eta=0.05, K=1)[0]
        self.assertEqual((slow['nextTheta'], slow['nextLoss']), ([1.9, 0.8], 3.085))
        oscillating = oracle.stability(eta=0.4, K=2)
        self.assertEqual(oscillating[0]['nextTheta'], [1.2, -0.6])
        self.assertEqual(oscillating[0]['nextLoss'], 1.44)
        self.assertEqual(oscillating[1]['nextTheta'], [0.72, 0.36])
        self.assertLess(oscillating[1]['nextLoss'], oscillating[0]['nextLoss'])
        boundary = oracle.stability(eta=0.5, K=2)
        self.assertEqual([r['nextTheta'][1] for r in boundary], [-1.0, 1.0])
        self.assertEqual([r['nextLoss'] for r in boundary], [2.5, 2.125])
        divergent = oracle.stability(eta=0.6, K=1)[0]
        self.assertEqual((divergent['nextTheta'], divergent['nextLoss']), ([0.8, -1.4], 4.24))
        self.assertGreater(divergent['nextLoss'], divergent['loss'])
        # Finite steps and a small gradient are not a convergence certificate.
        self.assertEqual(oracle.stability(start=[0, 0], K=2)[1]['nextLoss'], 0.0)

    def test_momentum_unrolled_literals_and_overshoot(self):
        rows = oracle.momentum(K=3)
        self.assertEqual(rows[0], dict(
            k=0, status='finite', theta=[2.0, 1.0], loss=4.0, gradient=[2.0, 4.0],
            velocity=[0.0, 0.0], nextVelocity=[2.0, 4.0], update=[-0.5, -1.0],
            nextTheta=[1.5, 0.0], nextLoss=1.125))
        self.assertEqual(rows[1], dict(
            k=1, status='finite', theta=[1.5, 0.0], loss=1.125, gradient=[1.5, 0.0],
            velocity=[2.0, 4.0], nextVelocity=[3.1, 3.2], update=[-0.775, -0.8],
            nextTheta=[0.725, -0.8], nextLoss=1.5428125))
        self.assertEqual(rows[2]['nextVelocity'], [3.205, -0.64])
        self.assertEqual(rows[2]['nextTheta'], [-0.07625, -0.64])
        self.assertGreater(rows[1]['nextLoss'], rows[1]['loss'])

    def test_zero_momentum_matches_closed_form_gd(self):
        for gd, momentum in zip(oracle.stability(K=12), oracle.momentum(K=12, beta=0)):
            self.assertEqual({key: momentum[key] for key in gd}, gd)
            self.assertEqual(momentum['nextVelocity'], momentum['gradient'])

    def test_lcg_uint32_literal_states_and_indices(self):
        for seed, states, indices in [
            (42, [1083814273, 378494188, 2479403867, 955863294], [1, 0, 2, 0]),
            (7, [1025555898, 3923423697, 2630631676, 3981355051], [0, 3, 2, 3]),
        ]:
            state = seed
            actual_states, actual_indices = [], []
            for _ in range(4):
                state = oracle.lcg_next(state)
                actual_states.append(state)
                actual_indices.append((4 * state) // 2 ** 32)
            self.assertEqual(actual_states, states)
            self.assertEqual(actual_indices, indices)
        self.assertEqual(oracle.lcg_next(0), 1013904223)
        self.assertEqual(oracle.lcg_next(2 ** 32 - 1), 1012239698)

    def test_full_data_gradient_loss_and_rng_no_advance(self):
        self.assertEqual(oracle.DATA, ((-1, -1), (0, 1), (1, 2), (2, 2)))
        gradients, gradient = oracle.batch_gradient([0, 0], [0, 1, 2, 3])
        self.assertEqual(gradients, [(F(-1), F(1)), (F(0), F(-1)), (F(-2), F(-2)), (F(-4), F(-2))])
        self.assertEqual(gradient, (F(-7, 4), F(-1)))
        self.assertEqual(oracle.full_loss([0, 0]), F(5, 4))
        for seed in (0, 7, 42, 2 ** 32 - 1):
            rows = oracle.batches(mode='full', batchSize=4, seed=seed, K=3)
            self.assertEqual(rows[0]['gradient'], [-1.75, -1.0])
            self.assertEqual(rows[0]['loss'], 1.25)
            self.assertEqual(rows[0]['nextTheta'], [0.175, 0.1])
            self.assertEqual(rows[0]['nextLoss'], 0.88046875)  # 1127/1280
            self.assertEqual(rows[1]['gradient'], [-1.4375, -0.8125])
            self.assertTrue(all(r['rngBefore'] == seed == r['rngAfter'] for r in rows))
            self.assertTrue(all(r['indices'] == [0, 1, 2, 3] for r in rows))

    def test_seeded_stochastic_and_replacement_batch_literals(self):
        stochastic = oracle.batches(mode='stochastic', batchSize=1, seed=42, K=2)
        first = stochastic[0]
        self.assertEqual((first['rngBefore'], first['rngAfter'], first['indices']), (42, 1083814273, [1]))
        self.assertEqual(first['perExampleGradients'], [[0.0, -1.0]])
        self.assertEqual(first['gradient'], [0.0, -1.0])
        self.assertEqual(first['nextTheta'], [0.0, 0.1])
        self.assertEqual(first['nextLoss'], 1.155)
        self.assertEqual(stochastic[1]['rngBefore'], 1083814273)
        self.assertEqual((stochastic[1]['rngAfter'], stochastic[1]['indices']), (378494188, [0]))
        seven = oracle.batches(mode='stochastic', batchSize=1, seed=7, K=1)[0]
        self.assertEqual(seven['gradient'], [-1.0, 1.0])
        self.assertEqual(seven['nextTheta'], [0.1, -0.1])
        self.assertEqual(seven['nextLoss'], 1.1825)
        mini = oracle.batches(mode='mini', batchSize=4, seed=42, K=1)[0]
        self.assertEqual((mini['rngBefore'], mini['rngAfter'], mini['indices']), (42, 955863294, [1, 0, 2, 0]))
        self.assertEqual(mini['perExampleGradients'], [[0.0, -1.0], [-1.0, 1.0], [-2.0, -2.0], [-1.0, 1.0]])
        self.assertEqual(mini['gradient'], [-1.0, -0.25])
        self.assertEqual(mini['nextTheta'], [0.1, 0.025])
        self.assertEqual(mini['nextLoss'], 1.0590625)  # 3389/3200
        self.assertEqual(oracle.batches(mode='mini', batchSize=2, K=1)[0]['gradient'], [-0.5, 0.0])
        self.assertEqual(oracle.batches(mode='mini', batchSize=2, K=1)[0]['nextLoss'], 1.164375)
        self.assertEqual(oracle.batches(mode='mini', batchSize=1, K=2), stochastic)

    def test_adam_first_exact_moments_bias_and_time_index(self):
        self.assertEqual(oracle.adam_moments([[2, 4]]), (
            (F(1, 5), F(2, 5)), (F(1, 250), F(2, 125)),
            (F(2), F(4)), (F(4), F(16)),
        ))
        first = oracle.adam(K=1)[0]
        self.assertEqual((first['k'], first['t']), (0, 1))
        self.assertEqual(first['m1'], [0.2, 0.4])
        self.assertEqual(first['m2'], [0.004, 0.016])
        self.assertEqual((first['bias1'], first['bias2']), (0.1, 0.001))
        self.assertEqual(first['m1Hat'], [2.0, 4.0])
        self.assertEqual(first['m2Hat'], [4.0, 16.0])
        self.assertEqual(first['denominator'], [2.00000001, 4.00000001])
        self.assertEqual(first['update'], [float(F(-50000000, 200000001)), float(F(-100000000, 400000001))])
        self.assertEqual(first['nextTheta'], [1.75000000125, 0.750000000625])

    def test_adam_zero_and_sign_changes_without_objective(self):
        zeros = oracle.adam(source='sequence', gradients=[[0, 0]] * 3, start=[0, 0], K=3)
        for t, row in enumerate(zeros, 1):
            self.assertEqual(row['t'], t)
            for key in ('theta', 'gradient', 'm1', 'm2', 'm1Hat', 'm2Hat', 'update', 'nextTheta'):
                self.assertEqual(row[key], [0.0, 0.0])
            self.assertEqual(row['denominator'], [1e-8, 1e-8])
            self.assertIsNone(row['loss'])
            self.assertIsNone(row['nextLoss'])
        history = [[2, 4], [0, 0], [-2, -4]]
        self.assertEqual(oracle.adam_moments(history), (
            (F(-19, 500), F(-19, 250)),
            (F(1998001, 250000000), F(1998001, 62500000)),
            (F(-38, 271), F(-76, 271)),
            (F(7992004, 2997001), F(31968016, 2997001)),
        ))
        rows = oracle.adam(source='sequence', gradients=history, K=3, start=[0, 0])
        self.assertEqual(rows[1]['m1'], [0.18, 0.36])
        self.assertEqual(rows[1]['m2'], [0.003996, 0.015984])
        self.assertLess(rows[1]['update'][0], 0.0)  # Past positive gradients still move parameters.
        self.assertGreater(rows[2]['update'][0], 0.0)
        self.assertGreater(rows[2]['update'][1], 0.0)

    def test_adam_epsilon_outside_sqrt_and_zero_decay(self):
        row = oracle.adam(source='sequence', gradients=[[1, -1]], start=[0, 0],
                          eta=0.25, eps=0.5, b1=0, b2=0, K=1)[0]
        self.assertEqual(row['denominator'], [1.5, 1.5])
        self.assertEqual(row['update'], [float(F(-1, 6)), float(F(1, 6))])
        self.assertEqual(row['m1'], [1.0, -1.0])
        self.assertEqual(row['m2'], [1.0, 1.0])
        self.assertEqual(row['m1Hat'], row['m1'])
        self.assertEqual(row['m2Hat'], row['m2'])

    def test_non_finite_outputs_stop_with_null_quantities(self):
        traces = [
            oracle.stability(start=[1e154, 0], eta=2.5, K=40),
            oracle.momentum(start=[1e153, 1e153], eta=10, K=40),
            oracle.batches(start=[2e154, 2e154], mode='full', batchSize=4, K=40),
            oracle.adam(source='sequence', gradients=[[1e200, 0], [0, 0]], K=2),
            oracle.adam(start=[1e308, 0], a=4, K=40),
        ]
        self.assertEqual([len(rows) for rows in traces], [2, 1, 1, 1, 1])
        self.assertEqual(traces[0][0]['status'], 'finite')
        metadata = {'k', 't', 'status', 'rngBefore', 'rngAfter', 'indices'}
        for rows in traces:
            self.assertEqual(rows[-1]['status'], 'non-finite')
            self.assertTrue(all(value is None for key, value in rows[-1].items() if key not in metadata))
            oracle.render(rows)  # allow_nan=False is the final serialization guard.
        self.assertEqual((traces[2][0]['rngBefore'], traces[2][0]['rngAfter']), (42, 42))
        # A finite first moment does not rescue an overflowing second moment.
        m1, m2, _, _ = oracle.adam_moments([[1e200, 0]])
        self.assertEqual(m1[0], F(10) ** 199)
        self.assertEqual(m2[0], F(10) ** 397)

    def test_invalid_optimizer_configurations(self):
        for method in (oracle.stability, oracle.momentum, oracle.adam):
            for config in ({'a': 0}, {'a': -1}, {'a': 0.125}, {'center': 0.125},
                           {'a': math.inf}, {'center': math.nan}, {'eta': 0}, {'eta': -0.1},
                           {'eta': math.inf}, {'K': -1}, {'K': 41}, {'K': 1.5}, {'K': True},
                           {'start': [0]}, {'start': [math.inf, 0]}):
                with self.subTest(method=method.__name__, config=config), self.assertRaises(ValueError):
                    method(**config)
        for beta in (-0.1, 1, 1.1, math.nan, math.inf):
            with self.subTest(beta=beta), self.assertRaises(ValueError):
                oracle.momentum(beta=beta)
        for parameter in ('b1', 'b2'):
            for value in (-0.1, 1, 1.1, math.nan, math.inf):
                with self.subTest(parameter=parameter, value=value), self.assertRaises(ValueError):
                    oracle.adam(**{parameter: value})
        for eps in (0, -1e-8, math.nan, math.inf):
            with self.subTest(eps=eps), self.assertRaises(ValueError):
                oracle.adam(eps=eps)
        for config in ({'source': 'other'}, {'source': 'sequence'},
                       {'source': 'sequence', 'gradients': [], 'K': 1},
                       {'source': 'sequence', 'gradients': [[1]], 'K': 1},
                       {'source': 'sequence', 'gradients': [[math.inf, 0]], 'K': 1},
                       {'source': 'quadratic', 'gradients': [[1, 1]]}):
            with self.subTest(config=config), self.assertRaises(ValueError):
                oracle.adam(**config)

    def test_invalid_batch_and_seed_inputs(self):
        for seed in (-1, 2 ** 32, 42.0, True, math.nan):
            for method in (oracle.lcg_next,):
                with self.subTest(seed=seed), self.assertRaises(ValueError):
                    method(seed)
            with self.subTest(seed=seed), self.assertRaises(ValueError):
                oracle.batches(seed=seed, K=0)
        for config in ({'batchSize': 0}, {'batchSize': -1}, {'batchSize': 5},
                       {'batchSize': 1.5}, {'batchSize': True}, {'mode': 'unknown'},
                       {'K': -1}, {'K': 41}, {'eta': 0}):
            with self.subTest(config=config), self.assertRaises(ValueError):
                oracle.batches(**config)
        for indices in ([], [-1], [0, -1], [4], [True], [1.0]):
            with self.subTest(indices=indices), self.assertRaises(ValueError):
                oracle.batch_gradient([0, 0], indices)

    def test_zero_steps_and_bounded_deterministic_fixture(self):
        for method in (oracle.stability, oracle.momentum, oracle.batches, oracle.adam):
            self.assertEqual(method(K=0), [])
        data = oracle.build_fixture()
        self.assertEqual(set(data), {'policy', 'stability', 'momentum', 'batches', 'adam'})
        self.assertEqual([len(data[name]) for name in ('stability', 'momentum', 'batches', 'adam')], [15, 12, 22, 17])
        self.assertEqual(oracle.render(data), oracle.render(oracle.build_fixture()))
        self.assertEqual(json.loads(oracle.render(data)), data)
        for name in ('stability', 'momentum', 'batches', 'adam'):
            for case in data[name]:
                self.assertEqual(set(case), {'config', 'expected'})
                rows, K = case['expected'], case['config']['K']
                self.assertLessEqual(len(rows), K)
                self.assertLessEqual(K, 40)
                self.assertEqual([r['k'] for r in rows], list(range(len(rows))))
                if len(rows) < K:
                    self.assertEqual(rows[-1]['status'], 'non-finite')
                self.assertTrue(all(r['status'] == 'finite' for r in rows[:-1]))
                if name == 'adam':
                    self.assertEqual([r['t'] for r in rows], list(range(1, len(rows) + 1)))
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

    def test_committed_fixture_is_fresh(self):
        self.assertEqual(oracle.FIXTURE.read_bytes(), oracle.render(oracle.build_fixture()).encode('utf-8'))

    def test_check_rejects_missing_and_stale_without_rewriting(self):
        with TemporaryDirectory() as directory, patch.object(oracle, 'FIXTURE', Path(directory) / 'fixture.json'):
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
                stale = json.loads(original)
                stale['momentum'][0]['expected'][0]['nextTheta'][0] = -999.0
                oracle.FIXTURE.write_text(oracle.render(stale), encoding='utf-8')
                stale_bytes = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']), 1)
                self.assertEqual(oracle.FIXTURE.read_bytes(), stale_bytes)
                self.assertEqual(oracle.main(['--write']), 0)
                self.assertEqual(oracle.FIXTURE.read_bytes(), original)

    def test_all_eight_block_b_reference_files_execute(self):
        for filename in (
            'optimization_rate.py', 'optimization_rate_numpy.py',
            'optimization_momentum.py', 'optimization_momentum_numpy.py',
            'optimization_stochastic.py', 'optimization_stochastic_numpy.py',
            'optimization_adam.py', 'optimization_adam_numpy.py',
        ):
            with self.subTest(filename=filename):
                result = subprocess.run([sys.executable, str(oracle.ROOT / 'code/python' / filename)],
                                        cwd=oracle.ROOT, capture_output=True, text=True, timeout=30)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
