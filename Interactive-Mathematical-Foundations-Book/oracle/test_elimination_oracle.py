from fractions import Fraction as F
from pathlib import Path
import runpy
import unittest
import numpy as np
from elimination_oracle import solve, structural_rank, cases

class EliminationOracleTests(unittest.TestCase):
    def test_literals(self):
        self.assertEqual(solve([[1, 1], [1, -1]], [3, 1])['particular'], ['2', '1'])
        self.assertEqual(solve([[0, 1, 2], [0, 2, 4]], [1, 2])['nullspace'], [['1', '0', '0'], ['0', '-2', '1']])
        self.assertEqual(solve([[1, 1], [2, 2]], [1, 3])['kind'], 'none')
        self.assertEqual(solve([[2, 1], [1, 1]], [0, 0])['inverse'], [['1', '-1'], ['-1', '2']])
        self.assertEqual(structural_rank([[F(4), F('3.99')], [F('3.99'), F('3.98')]]), 2)
    def test_numpy_inverse_and_rank(self):
        for c in cases():
            a = np.array(c['a'], float)
            e = c['expected']
            self.assertEqual(np.linalg.matrix_rank(a), e['rank'])
            if e['inverse']:
                expected = np.array([[float(F(x)) for x in row] for row in e['inverse']])
                np.testing.assert_allclose(np.linalg.inv(a), expected, rtol=2e-10, atol=2e-10)
    def test_references(self):
        root = Path(__file__).resolve().parents[1]/'code/python'
        for file in ['elimination.py', 'elimination_numpy.py', 'rank.py', 'rank_numpy.py', 'inverse.py', 'inverse_numpy.py']:
            runpy.run_path(str(root/file))
