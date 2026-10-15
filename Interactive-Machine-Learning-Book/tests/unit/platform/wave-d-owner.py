"""Independent owner challenges; executed only by the combined owner milestone."""
import copy
import importlib.util
import itertools
import math
from fractions import Fraction
from pathlib import Path
import sys
import unittest
import numpy as np

BOOK = Path(__file__).resolve().parents[3]
def canonical(name, file):
    spec = importlib.util.spec_from_file_location(name, BOOK / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

svm = canonical('owner_svm', 'code/python/p07/svm.py')
evaluation = canonical('owner_evaluation', 'code/python/p08/evaluation.py')

def request(coordinates, labels, mode='hard', C=1, kind='linear', gamma=1):
    return dict(mode=mode, C=C, kernel=dict(kind=kind, gamma=gamma, coef0=1, degree=2),
                points=[dict(id=f'owner{i}', x=list(x), y=y) for i, (x, y) in enumerate(zip(coordinates, labels))])

def independent_gram(coordinates, kind, gamma=1):
    X = np.asarray(coordinates, dtype=float)
    if kind == 'linear':
        return X @ X.T
    if kind == 'polynomial':
        return (gamma * (X @ X.T) + 1) ** 2
    distances = np.sum((X[:, None, :] - X[None, :, :]) ** 2, axis=2)
    return np.exp(-gamma * distances)

def active_set_dual(K, labels, C):
    """Enumerate box faces and solve stationary KKT systems, independently of pair steps."""
    y = np.asarray(labels, dtype=float)
    Q = K * np.outer(y, y)
    n = len(y)
    assert n <= 6
    best = 0.
    for states in itertools.product((0, 1, 2), repeat=n):
        a = np.asarray([C if state == 2 else 0. for state in states])
        free = [i for i, state in enumerate(states) if state == 1]
        if free:
            m = len(free)
            A = np.zeros((m + 1, m + 1))
            A[:m, :m] = Q[np.ix_(free, free)]
            A[:m, m] = y[free]
            A[m, :m] = y[free]
            rhs = np.r_[np.ones(m) - (Q @ a)[free], -y @ a]
            solution = np.linalg.lstsq(A, rhs, rcond=None)[0]
            if np.linalg.norm(A @ solution - rhs, ord=np.inf) > 1e-10:
                continue
            a[free] = solution[:m]
        if abs(y @ a) > 1e-10 or np.min(a) < -1e-10 or np.max(a) > C + 1e-10:
            continue
        best = max(best, float(np.sum(a) - .5 * a @ Q @ a))
    return best

class SVMChallenges(unittest.TestCase):
    def assertClose(self, actual, expected, tolerance=2e-8):
        self.assertLessEqual(abs(actual - expected), tolerance * (1 + abs(expected)))

    def test_analytic_hard_translation_and_scale(self):
        for coordinates, expected_w, expected_b, objective, margin in [
            ([[-1, 0], [1, 0]], 1, 0, .5, 1),
            ([[1, 0], [3, 0]], 1, -2, .5, 1),
            ([[-2, 0], [2, 0]], .5, 0, .125, 2),
        ]:
            result = svm.svm(request(coordinates, [-1, 1]))
            self.assertEqual(result['status'], 'solved')
            self.assertClose(result['w'][0], expected_w)
            self.assertClose(result['w'][1], 0)
            self.assertClose(result['b'], expected_b)
            self.assertClose(result['primal'], objective)
            self.assertClose(result['dual'], objective)
            self.assertClose(result['halfMargin'], margin)
            for row, distance in zip(result['rows'], [-margin, margin]):
                self.assertClose(row['signedDistance'], distance)
                self.assertClose(row['margin'], 1)

    def test_exact_soft_box_regimes_and_hinge(self):
        for C in [.1, .5, 1]:
            a = min(C, .5)
            result = svm.svm(request([[-1, 0], [1, 0]], [-1, 1], 'soft', C))
            self.assertEqual(result['status'], 'approximate')
            for coefficient in result['alpha']:
                self.assertClose(coefficient, a)
            self.assertClose(result['w'][0], 2 * a)
            self.assertClose(result['primal'], 2 * a - 2 * a * a)
            self.assertClose(result['dual'], result['primal'])
        self.assertEqual([svm.hinge(m)['loss'] for m in [0, .5, 1, 2]], [1, .5, 0, 0])
        self.assertEqual(svm.hinge(1)['subgradient'], 0)

    def test_nonseparable_and_zero_norm(self):
        result = svm.svm(request([[0, 0], [0, 0]], [-1, 1]))
        self.assertEqual(result['status'], 'infeasible')
        self.assertIsNone(result['w'])
        soft = svm.svm(request([[0, 0], [0, 0]], [-1, 1], 'soft', .3))
        self.assertEqual(soft['status'], 'approximate')
        self.assertClose(soft['primal'], .6)
        self.assertClose(soft['norm2'], 0)
        self.assertIsNone(soft['halfMargin'])
        self.assertTrue(all(row['signedDistance'] is None for row in soft['rows']))
        xor = svm.svm(request([[-1, -1], [-1, 1], [1, -1], [1, 1]], [1, -1, -1, 1]))
        self.assertEqual(xor['status'], 'infeasible')

    def test_active_constraints_are_not_unique_dual_membership(self):
        result = svm.svm(request([[-1, -1], [-1, 1], [1, -1], [1, 1]], [-1, -1, 1, 1]))
        self.assertEqual(result['status'], 'solved')
        self.assertTrue(all(row['onMargin'] for row in result['rows']))
        self.assertClose(result['w'][0], 1)
        self.assertClose(result['w'][1], 0)
        self.assertClose(result['primal'], .5)
        self.assertClose(sum(result['alpha']), 1)

    def test_three_kernels_against_independent_active_set_optimization(self):
        coordinates = [[-2, -1], [-1, 1], [1, -1], [2, 1]]
        labels = [-1, -1, 1, 1]
        for kind in ['linear', 'polynomial', 'rbf']:
            K = independent_gram(coordinates, kind, .7)
            self.assertLessEqual(np.max(abs(K - K.T)), 1e-14)
            self.assertGreaterEqual(np.min(np.linalg.eigvalsh(K)), -1e-12)
            result = svm.svm(request(coordinates, labels, 'kernel', 1.3, kind, .7))
            self.assertEqual(result['status'], 'approximate')
            np.testing.assert_allclose(result['gram'], K, rtol=2e-12, atol=2e-12)
            optimum = active_set_dual(K, labels, 1.3)
            self.assertClose(result['dual'], optimum, 2e-5)
            reconstructed = K @ (np.asarray(result['alpha']) * labels) + result['b']
            np.testing.assert_allclose([r['score'] for r in result['rows']], reconstructed, rtol=2e-12, atol=2e-12)
            self.assertLessEqual(result['kkt'], svm.KKT_TOL)
            self.assertLessEqual(result['equality'], 1e-7)

    def test_nonlinear_xor_optimum_and_exact_kernel_entries(self):
        coordinates = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        labels = [1, -1, -1, 1]
        polynomial = svm.svm(request(coordinates, labels, 'kernel', 2, 'polynomial'))
        self.assertEqual(polynomial['status'], 'approximate')
        self.assertClose(polynomial['primal'], .25, 2e-5)
        self.assertTrue(all(row['decision'] == y for row, y in zip(polynomial['rows'], labels)))
        self.assertTrue(all(row['signedDistance'] is None for row in polynomial['rows']))
        rbf = svm.svm(request(coordinates, labels, 'kernel', 2, 'rbf', .5))
        self.assertEqual(rbf['status'], 'approximate')
        self.assertClose(rbf['primal'], 2 / (1 - math.exp(-2)) ** 2, 2e-5)
        for kind, expected in [('linear', 0), ('polynomial', 1), ('rbf', math.exp(-5))]:
            self.assertClose(svm.kernel_value([1, 2], [-2, 1], dict(kind=kind, gamma=.5, coef0=1, degree=2)), expected)

    def test_real_diagnostic_failure_rejects_prediction(self):
        state = request([[-5, 0], [5, 0], [0, 5]], [-1, 1, 1], 'kernel', 1, 'polynomial')
        state['kernel']['degree'] = 4
        result = svm.svm(state)
        self.assertEqual(result['gram'], [[456976, 331776, 1], [331776, 456976, 1], [1, 1, 456976]])
        self.assertEqual(result['status'], 'failed')
        self.assertGreater(result['kkt'], 2e-5)
        with self.assertRaises(ValueError):
            svm.decision(state, result, [0, 0])

    def test_exact_separable_determinant_cannot_be_false_infeasibility(self):
        e = 2 ** -52
        B, P = [1 + e, 1 + 2 * e], [1, 1 + e]
        exact = Fraction.from_float(B[0]) * Fraction.from_float(P[1]) - Fraction.from_float(B[1]) * Fraction.from_float(P[0])
        self.assertEqual(exact, Fraction(1, 2 ** 104))
        self.assertGreater(exact, 0)
        self.assertEqual(B[0] * P[1] - B[1] * P[0], 0)
        state = request([[0, 0], B, P], [-1, -1, 1])
        try:
            result = svm.svm(state)
        except ValueError as error:
            self.assertRegex(str(error), 'unresolved|representable|diagnostic')
        else:
            self.assertNotEqual(result['status'], 'infeasible')
            self.assertEqual(result['status'], 'failed')

class EvaluationChallenges(unittest.TestCase):
    def assertClose(self, actual, expected, tolerance=2e-12):
        self.assertLessEqual(abs(actual - float(expected)), tolerance * (1 + abs(float(expected))))

    def test_exact_metrics_brier_and_bins(self):
        probabilities = [.9, .8, .4, .1]
        labels = [1, 0, 1, 0]
        rows = [dict(id=str(i), p=p, y=y) for i, (p, y) in enumerate(zip(probabilities, labels))]
        m = evaluation.metrics(rows, .5)
        self.assertEqual([m[k] for k in ['tp', 'fp', 'tn', 'fn']], [1, 1, 1, 1])
        for name in ['accuracy', 'balancedAccuracy', 'precision', 'recall', 'f1']:
            self.assertEqual(m[name], .5)
        exact = sum((Fraction(str(p)) - y) ** 2 for p, y in zip(probabilities, labels)) / 4
        self.assertEqual(exact, Fraction(51, 200))
        self.assertClose(m['brier'], exact)
        self.assertEqual([b['count'] for b in m['bins']], [1, 0, 1, 0, 2])
        self.assertEqual([b['frequency'] for b in m['bins']], [0, None, 1, None, .5])
        self.assertClose(m['bins'][-1]['meanProbability'], Fraction(17, 20))

    def test_threshold_ties_zero_denominators_and_unbounded_log_loss(self):
        self.assertEqual(evaluation.metrics([dict(id='p', p=.5, y=1)], .5)['tp'], 1)
        empty_predictions = evaluation.metrics([dict(id='n', p=.2, y=0)], 1)
        self.assertIsNone(empty_predictions['precision'])
        self.assertIsNone(empty_predictions['recall'])
        self.assertIsNone(empty_predictions['f1'])
        self.assertIsNone(empty_predictions['balancedAccuracy'])
        log = evaluation.metrics([dict(id='wrong', p=0, y=1)], .5)
        self.assertIsNone(log['logLoss'])
        self.assertIn('Unbounded', log['logReason'])

    def test_training_only_imputation_scaling_and_exact_leakage(self):
        rows = [dict(id=str(i), group=str(i), x=[x], y=y) for i, (x, y) in enumerate([(0, 0), (2, 2), (100, 100)])]
        proper = evaluation.fit(rows, ['0', '1'], 1, 1)
        leaked = evaluation.fit(rows, ['0', '1'], 1, 1, ['0', '1', '2'])
        self.assertEqual(proper['preprocessing']['fitIds'], ['0', '1'])
        self.assertEqual(proper['preprocessing']['center'], 1)
        self.assertEqual(proper['preprocessing']['scale'], 1)
        self.assertClose(proper['slope'], Fraction(1, 2))
        self.assertClose(proper['trainingMse'], Fraction(1, 4))
        self.assertClose(proper['objective'], Fraction(1, 2))
        self.assertClose(leaked['preprocessing']['center'], 34)
        self.assertClose(leaked['preprocessing']['scale'] ** 2, Fraction(6536, 3))
        p = evaluation.evaluate(rows, ['2'], proper)
        q = evaluation.evaluate(rows, ['2'], leaked)
        self.assertClose(p['rows'][0]['prediction'], Fraction(101, 2))
        self.assertClose(q['rows'][0]['prediction'], Fraction(6836, 6539))
        self.assertGreater(q['mse'], p['mse'])
        missing = rows[:2] + [dict(id='missing', group='m', x=[None], y=1)]
        pre = evaluation.transform_fit(missing, ['0', '1', 'missing'])
        self.assertEqual(pre['impute'], 1)
        self.assertClose(pre['scale'] ** 2, Fraction(2, 3))

    def test_scalar_ridge_against_augmented_least_squares(self):
        rows = [dict(id=str(i), group=str(i), x=[x], y=y) for i, (x, y) in enumerate([(0, 1), (2, 2), (4, 5)])]
        for power, penalty in [(1, 0), (1, 1), (2, 4)]:
            model = evaluation.fit(rows, ['0', '1', '2'], power, penalty)
            z = (np.asarray([0, 2, 4]) - 2) / math.sqrt(8 / 3)
            features = z ** power
            A = np.c_[features, np.ones(3)]
            augmented = np.vstack([A, [math.sqrt(3 * penalty), 0]])
            expected = np.linalg.lstsq(augmented, np.r_[[1, 2, 5], 0], rcond=None)[0]
            self.assertClose(model['slope'], expected[0])
            self.assertClose(model['intercept'], expected[1])

    def test_exact_disjoint_group_folds_and_deterministic_seed(self):
        rows = evaluation.DEFAULT['rows']
        board = evaluation.split(rows, 7, 3)
        self.assertEqual(board, evaluation.split(rows, 7, 3))
        self.assertEqual(board['draws'][0], 1025555898)
        dev, test = set(board['development']), set(board['test'])
        self.assertFalse(dev & test)
        self.assertEqual(dev | test, {r['id'] for r in rows})
        seen = []
        groups = {r['id']: r['group'] for r in rows}
        for fold in board['folds']:
            train, validation = set(fold['train']), set(fold['validation'])
            self.assertFalse(train & validation)
            self.assertFalse((train | validation) & test)
            self.assertEqual(train | validation, dev)
            self.assertFalse({groups[i] for i in train} & {groups[i] for i in validation})
            seen.extend(fold['validation'])
        self.assertEqual(sorted(seen), sorted(dev))

    def test_test_set_has_no_influence_on_selection_curves_or_fit(self):
        state = copy.deepcopy(evaluation.DEFAULT)
        original = evaluation.experiment(state)
        test_ids = set(original['board']['test'])
        for row in state['rows']:
            if row['id'] in test_ids:
                row['x'] = [100]
                row['y'] = -100
        changed = evaluation.experiment(state)
        for key in ['board', 'candidates', 'selected', 'final', 'curves', 'leakage']:
            self.assertEqual(changed[key], original[key], key)
        self.assertNotEqual(changed['test'], original['test'])

    def test_curve_membership_objectives_and_preprocessing_provenance(self):
        result = evaluation.experiment(copy.deepcopy(evaluation.DEFAULT))
        previous = set()
        validation_ids = set(result['board']['folds'][0]['validation'])
        test_ids = set(result['board']['test'])
        for curve in result['curves']:
            ids = set(curve['ids'])
            self.assertLess(previous, ids)
            self.assertEqual(curve['n'], len(ids))
            self.assertFalse(ids & (validation_ids | test_ids))
            self.assertEqual(set(curve['model']['preprocessing']['fitIds']), ids)
            self.assertEqual(set(curve['validation']['ids']), validation_ids)
            training = evaluation.evaluate(evaluation.DEFAULT['rows'], curve['ids'], curve['model'])
            expected_mse = sum(r['residual'] ** 2 for r in training['rows']) / len(ids)
            self.assertClose(curve['model']['trainingMse'], expected_mse)
            self.assertClose(curve['model']['objective'], expected_mse + curve['model']['penalty'] * curve['model']['slope'] ** 2)
            previous = ids

    def test_binary64_nonassociativity_and_stable_rationalization(self):
        result = evaluation.numerics(1e8, 1e-8)
        self.assertEqual((result['left'], result['right']), (1, 0))
        self.assertEqual(result['fragile'], 0)
        self.assertClose(result['stable'], 5e-9)
        self.assertNotEqual(result['reciprocal'], result['nominalReciprocal'])
        self.assertEqual(float(2 ** 53) + 1, float(2 ** 53))

    def test_malformed_inputs_and_nonrepresentable_arithmetic(self):
        for change in [dict(seed=True), dict(folds=2.5), dict(threshold=float('nan'))]:
            with self.assertRaises((ValueError, TypeError)):
                evaluation.experiment(dict(evaluation.DEFAULT, **change))
        with self.assertRaises(ValueError):
            evaluation.metrics([dict(id='bad', y=True, p=.5)], .5)
        with self.assertRaises(ValueError):
            evaluation.transform_fit([dict(id='huge', x=[1e308]), dict(id='other', x=[-1e308])], ['huge', 'other'])
        invalid = request([[-1, 0], [1, 0]], [-1, 1])
        invalid['points'][0]['x'][0] = True
        with self.assertRaises(ValueError):
            svm.svm(invalid)

if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
