from fractions import Fraction as F
from pathlib import Path
import runpy
import unittest

from matrices_oracle import det2, matmul, matvec, rows, solve2, vector

ROOT = Path(__file__).resolve().parents[1]
PEDAGOGICAL = [
    'matrix_transform.py', 'matrix_vector.py', 'matrix_composition.py',
    'matrix_transpose_orthogonality.py', 'matrix_determinant.py', 'linear_systems.py',
]
NUMPY = [
    'matrix_transform_numpy.py', 'matrix_vector_numpy.py', 'matrix_composition_numpy.py',
    'matrix_transpose_orthogonality_numpy.py', 'matrix_determinant_numpy.py', 'linear_systems_numpy.py',
]


class MatricesOracleTests(unittest.TestCase):
    def test_literal_products_and_signed_area(self):
        self.assertEqual(matvec(rows([[2, -1], [1, 3]]), vector([4, 2])), [F(6), F(10)])
        self.assertEqual(matmul(rows([[1, 0], [1, 1]]), rows([[1, 1], [0, 1]])), rows([[1, 1], [1, 2]]))
        self.assertEqual(det2(rows([[0, 1], [1, 0]])), -1)
        self.assertEqual(det2(rows([[1, 2], [2, 4]])), 0)

    def test_literal_system_classifications(self):
        self.assertEqual(solve2(rows([[1, 1], [1, -1]]), vector([3, 1])), {'kind': 'unique', 'solution': [F(2), F(1)]})
        self.assertEqual(solve2(rows([[1, 1], [2, 2]]), vector([1, 3]))['kind'], 'none')
        self.assertEqual(solve2(rows([[1, 1], [2, 2]]), vector([1, 2]))['kind'], 'infinite')
        self.assertEqual(solve2(rows([[0, 0], [0, 0]]), vector([0, 1]))['kind'], 'none')

    def test_pedagogical_sources_execute(self):
        for name in PEDAGOGICAL:
            with self.subTest(name=name):
                runpy.run_path(str(ROOT / 'code/python' / name), run_name='__main__')

    def test_numpy_sources_execute(self):
        try:
            import numpy  # noqa: F401
        except ImportError:
            self.skipTest('NumPy not installed; install the repository oracle requirements')
        for name in NUMPY:
            with self.subTest(name=name):
                runpy.run_path(str(ROOT / 'code/python' / name), run_name='__main__')


if __name__ == '__main__':
    unittest.main()
