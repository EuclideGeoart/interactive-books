import math
from pathlib import Path
import runpy
import unittest
from fractions import Fraction as F
from linear_algebra_oracle import coordinates, expected, inner, norm, normalize

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    'linear_addition.py', 'linear_scaling.py', 'linear_norms.py', 'linear_dot.py',
    'linear_projection.py', 'linear_span.py', 'linear_basis.py',
    'linear_addition_numpy.py', 'linear_scaling_numpy.py', 'linear_norms_numpy.py',
    'linear_dot_numpy.py', 'linear_projection_numpy.py', 'linear_span_numpy.py', 'linear_basis_numpy.py',
]


class LinearAlgebraOracleTests(unittest.TestCase):
    def test_literal_arithmetic_and_norms(self):
        d = expected(dict(u=[2, 1], v=[1, 3], p=[3, 0], k=-2, a=1, b=-1))
        self.assertEqual(d['sum'], [3, 4])
        self.assertEqual(d['difference'], [-1, 2])
        self.assertEqual(d['scaled'], [-2, -6])
        self.assertEqual(d['dot'], 5)
        self.assertEqual(d['projection']['vector'], [2, 1])
        self.assertEqual(d['projection']['residual'], [-1, 2])
        self.assertEqual(d['projection']['residualDot'], 0)
        self.assertEqual(norm((F(3), F(4))), 5)
        self.assertEqual(inner((F(2), F(1)), (F(-1), F(2))), 0)

    def test_literal_elimination_and_singular_cases(self):
        self.assertEqual(coordinates((F(2), F(1)), (F(1), F(2)), (F(3), F(0))), [2, -1])
        self.assertEqual(coordinates((F(0), F(2)), (F(3), F(0)), (F(3), F(2))), [1, 1])
        self.assertIsNone(coordinates((F(1), F(1)), (F(2), F(2)), (F(3), F(3))))
        for u, v, p, rank, reachable in [([0, 0], [0, 0], [0, 0], 0, True), ([0, 0], [0, 0], [1, 0], 0, False), ([1, 1], [2, 2], [3, 3], 1, True), ([1, 1], [2, 2], [3, 0], 1, False)]:
            d = expected(dict(u=u, v=v, p=p, k=0, a=1, b=2))
            self.assertEqual((d['rank'], d['reachable']), (rank, reachable))
            self.assertIsNone(d['coords'])

    def test_literal_extremes(self):
        self.assertIsNone(normalize((F(0), F(0))))
        for x in [1.7e308, 1e-300, 5e-324]:
            result = normalize((F.from_float(x), F.from_float(x)))
            self.assertAlmostEqual(result[0], math.sqrt(0.5), places=15)
            self.assertAlmostEqual(result[1], math.sqrt(0.5), places=15)

    def test_all_pedagogical_sources_execute(self):
        for file in SOURCES[:7]:
            with self.subTest(file=file):
                runpy.run_path(str(ROOT / 'code/python' / file), run_name='__main__')

    def test_reference_invalid_and_zero_policies(self):
        load = lambda name: runpy.run_path(str(ROOT / 'code/python' / name))
        normalize_ref = load('linear_norms.py')['normalize']
        angle_ref = load('linear_dot.py')['angle']
        project = load('linear_projection.py')['project']
        coords = load('linear_basis.py')['coordinates']
        with self.assertRaises(ValueError): normalize_ref((0, 0))
        with self.assertRaises(ValueError): normalize_ref((math.inf, 1))
        with self.assertRaises(ValueError): angle_ref((0, 0), (1, 1))
        with self.assertRaises(ValueError): project((1, 2), (0, 0))
        with self.assertRaises(ValueError): coords((1, 1), (2, 2), (3, 3))
        self.assertEqual(project((0, 0), (1, 2))[:2], ((F(0), F(0)), (F(0), F(0))))

    def test_all_numpy_sources_execute(self):
        try:
            import numpy as np
        except ImportError:
            self.skipTest('NumPy not installed; install the repository oracle requirements')
        for file in SOURCES[7:]:
            with self.subTest(file=file):
                runpy.run_path(str(ROOT / 'code/python' / file), run_name='__main__')
        numpy_norm = runpy.run_path(str(ROOT / 'code/python/linear_norms_numpy.py'))['normalize']
        for v in [[1.7e308, 1.7e308], [5e-324, 5e-324]]:
            np.testing.assert_allclose(numpy_norm(v), [math.sqrt(0.5), math.sqrt(0.5)], rtol=2e-16, atol=0)
        with self.assertRaises(ValueError): numpy_norm([0, 0])


if __name__ == '__main__':
    unittest.main()
