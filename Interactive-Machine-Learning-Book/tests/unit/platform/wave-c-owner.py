"""Owner-authored exact arithmetic and independent linear algebra challenges."""
import importlib.util
import itertools
from fractions import Fraction
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
C = load('owner_clustering', 'code/python/p05/clustering.py')
P = load('owner_pca', 'code/python/p06/pca.py')
def points(rows):
    return [dict(id=f'owner{i}', x=list(x)) for i, x in enumerate(rows)]
def state(rows, centers, scales=(1, 1)):
    return dict(points=points(rows), centers=[list(x) for x in centers], scales=list(scales),
                labels=None, phase='ready', iteration=0, stopped=False)
def cloud(rows, k=1, normalization='sample'):
    return dict(points=points(rows), k=k, normalization=normalization)

class OwnerChallenges(unittest.TestCase):
    def test_lloyd_hand_arithmetic(self):
        s = state([(0, 0), (2, 0), (8, 0), (10, 0)], [(0, 0), (10, 0)])
        initial = C.inspect_lloyd(s)
        self.assertEqual(initial['distances'], [[0, 100], [4, 64], [64, 4], [100, 0]])
        self.assertEqual(initial['labels'], [0, 0, 1, 1])
        self.assertEqual(initial['objective'], 8)
        update = C.lloyd_step(C.lloyd_step(s))
        self.assertEqual(update['centers'], [[1, 0], [9, 0]])
        self.assertEqual(C.inspect_lloyd(update)['objective'], 4)

    def test_exhaustive_partition_counterexample(self):
        rows = [0, 4, 5, 9]
        costs = []
        for labels in itertools.product([0, 1], repeat=4):
            if len(set(labels)) != 2:
                continue
            groups = [[Fraction(x) for x, label in zip(rows, labels) if label == j] for j in [0, 1]]
            means = [sum(g) / len(g) for g in groups]
            costs.append(sum((x - mean) ** 2 for group, mean in zip(groups, means) for x in group))
        self.assertEqual(min(costs), 14)
        result = C.lloyd_trace(state([(x, 0) for x in rows], [(0, 0), (9, 0)]))[-1]
        self.assertTrue(result['stopped'])
        self.assertEqual(C.inspect_lloyd(result)['objective'], 16)

    def test_monotonicity_seed_and_label_permutation(self):
        rows = [(0, 0), (2, 0), (8, 0), (10, 0)]
        values = [C.inspect_lloyd(s)['objective'] for s in C.lloyd_trace(state(rows, [(0, 0), (10, 0)]))]
        self.assertTrue(all(after <= before for before, after in zip(values, values[1:])))
        self.assertEqual(C.initialize(points(rows), 2, 7), [[0, 0], [10, 0]])
        self.assertEqual(C.initialize(points(rows), 2, 0), [[0, 0], [2, 0]])
        self.assertTrue(C.same_partition([0, 0, 1, 1], [7, 7, 2, 2]))

    def test_empty_coincident_and_scaling(self):
        empty = C.lloyd_step(C.lloyd_step(state([(0, 0), (2, 0)], [(0, 0), (4, 0)])))
        self.assertEqual(empty['centers'], [[1, 0], [4, 0]])
        coincident = C.inspect_lloyd(state([(1, 1)] * 3, [(1, 1)] * 3))
        self.assertEqual([c['count'] for c in coincident['clusters']], [3, 0, 0])
        rows = [(0, 0), (0, 2), (3, 0), (3, 2)]
        self.assertEqual(C.inspect_lloyd(state(rows, [(0, 0), (3, 2)], (1, .1)))['labels'], [0, 1, 0, 1])

    def test_linkage_and_density(self):
        for linkage, height in [('single', 3), ('complete', 5), ('average', 4)]:
            self.assertEqual([m['height'] for m in C.hierarchical(points([(0, 0), (2, 0), (5, 0)]), linkage)['merges']], [2, height])
        density = C.dbscan(points([(0, 0), (.5, 0), (1, 0), (5, 0)]), .5, 3)
        self.assertEqual(density['neighborhoods'], [[0, 1], [0, 1, 2], [1, 2], [3]])
        self.assertEqual(density['kinds'], ['border', 'core', 'border', 'noise'])

    def test_clustering_arithmetic_boundaries(self):
        with self.assertRaisesRegex(ValueError, 'underflow'):
            C.squared_distance([1e-200, 0], [0, 0])
        with self.assertRaises(ValueError):
            C.squared_distance([1e308, 0], [-1e308, 0])

    def test_pca_exact_covariance_and_translation(self):
        line = [(-1, -2), (0, 0), (1, 2)]
        result = P.pca(cloud(line))
        self.assertEqual(result['covariance'], [[1, 2], [2, 4]])
        np.testing.assert_allclose(result['eigenvalues'], [5, 0], atol=2e-12, rtol=2e-12)
        axis = np.asarray(result['axes'][0])
        np.testing.assert_allclose(np.outer(axis, axis), [[.2, .4], [.4, .8]], atol=2e-12, rtol=2e-12)
        translated = P.pca(cloud([(x + 4, y + 7) for x, y in line]))
        self.assertEqual(translated['covariance'], result['covariance'])
        self.assertEqual(translated['mean'], [4, 7])

    def test_independent_fraction_covariance_and_eigh(self):
        rows = [(Fraction(-2), Fraction(1)), (Fraction(-1), Fraction(3)),
                (Fraction(1), Fraction(-2)), (Fraction(2), Fraction(-2))]
        means = [sum(x[j] for x in rows) / len(rows) for j in [0, 1]]
        centered = [[x[j] - means[j] for j in [0, 1]] for x in rows]
        covariance = np.array([[float(sum(x[i] * x[j] for x in centered) / 3) for j in [0, 1]] for i in [0, 1]])
        eigenvalues, V = np.linalg.eigh(covariance)
        result = P.pca(cloud([[float(x) for x in row] for row in rows]))
        np.testing.assert_allclose(result['covariance'], covariance, atol=2e-12, rtol=2e-12)
        np.testing.assert_allclose(result['eigenvalues'], eigenvalues[::-1], atol=2e-12, rtol=2e-12)
        projector = np.outer(V[:, -1], V[:, -1])
        np.testing.assert_allclose(np.outer(result['axes'][0], result['axes'][0]), projector, atol=2e-12, rtol=2e-12)
        Xc = np.array(centered, dtype=float)
        residual = Xc - Xc @ projector
        self.assertAlmostEqual(result['sse'], float(np.sum(residual ** 2)), places=11)

    def test_pca_component_shapes_and_energy(self):
        rows = [(-1, -2), (0, 0), (1, 2)]
        for k in [0, 1, 2]:
            result = P.pca(cloud(rows, k))
            self.assertTrue(all(len(row['scores']) == k and len(row['reconstructed']) == 2 for row in result['rows']))
            self.assertAlmostEqual(result['sse'], 2 * sum(result['eigenvalues'][k:]), places=11)
        self.assertEqual(P.pca(cloud(rows, 0))['sse'], 10)
        self.assertEqual(P.pca(cloud(rows, 2))['sse'], 0)

    def test_repeated_zero_and_singleton(self):
        isotropic = P.pca(cloud([(1, 0), (-1, 0), (0, 1), (0, -1)]))
        self.assertTrue(isotropic['repeated'])
        self.assertAlmostEqual(isotropic['retained'], .5)
        self.assertAlmostEqual(isotropic['sse'], 2)
        zero = P.pca(cloud([(3, -4), (3, -4)]))
        self.assertTrue(zero['zeroVariance']); self.assertIsNone(zero['ratios'])
        self.assertEqual(zero['sse'], 0)
        self.assertEqual(P.pca(cloud([(3, -4)]))['status'], 'undefined')
        self.assertEqual(P.pca(cloud([(3, -4)], normalization='population'))['sse'], 0)

    def test_small_eigenvalue_relative_accuracy(self):
        result = P.pca(cloud([(1e6, 1), (-1e6, 1), (1e6, -1), (-1e6, -1)]))
        self.assertLessEqual(abs(result['eigenvalues'][1] / (4 / 3) - 1), 2e-12)
        self.assertAlmostEqual(result['sse'], 4)

    def test_pca_parameter_and_underflow_boundaries(self):
        self.assertEqual(P.pca(cloud([(-1, -2), (0, 0), (1, 2)], k=1.0))['status'], 'defined')
        with self.assertRaises(ValueError):
            P.pca(cloud([(0, 0)], k=True))
        with self.assertRaisesRegex(ValueError, 'underflow'):
            P.pca(cloud([(1e-200, 0), (-1e-200, 0)]))

if __name__ == '__main__':
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(OwnerChallenges))
    sys.exit(not result.wasSuccessful())
