from fractions import Fraction as F
import subprocess
import sys
import unittest
from pathlib import Path
from numerical_algorithms_oracle import algorithm,matrix_case,row_solve
ROOT=Path(__file__).resolve().parents[1]
class AlgorithmTests(unittest.TestCase):
    def test_norm_literals(self):
        self.assertEqual(algorithm('3,4','hypot')['stable'],5)
        self.assertEqual(algorithm('3e200,4e200','hypot')['naive'],'Infinity')
        self.assertEqual(algorithm('3e-200,4e-200','hypot')['naive'],0)
    def test_small_change(self):
        self.assertEqual(algorithm('1e-16','log1p')['naive'],0)
        self.assertEqual(algorithm('1e-16','expm1')['naive'],0)
        self.assertGreater(algorithm('1e-16','log1p')['stable'],0)
    def test_sum_literal(self):
        self.assertEqual(algorithm('1e16,1,-1e16','sum')['stable'],1)
        self.assertEqual(algorithm('1e16,1,-1e16','sum')['naive'],0)
    def test_softmax_shift(self):
        self.assertEqual(algorithm('1000,1001,999','softmax')['naive'],'Infinity')
        self.assertEqual(algorithm('0,-1000','softmax')['logProbabilities'][1],-1000)
        self.assertAlmostEqual(sum(algorithm('1000,1001,999','softmax')['probabilities']),1,places=15)
    def test_scaling_bounds(self):
        self.assertEqual(algorithm('1e-8','scaling')['naive'],0)
        self.assertGreater(algorithm('1e-8','scaling')['stable'],0)
        self.assertEqual(algorithm('10000','scaling')['stable'],'Infinity')
    def test_matrix_literals(self):
        m=matrix_case('3,1,1,2','4,3');self.assertEqual(m['exact']['solution'],['1','1']);self.assertEqual(m['condition'],'16/5')
        ill=matrix_case('1,1,1,1.000000000001','2,2.0000000000010001');self.assertEqual(ill['exact']['solution'],['9999/10000','10001/10000']);self.assertEqual(ill['stored']['solution'],['1','1'])
        self.assertEqual(matrix_case('1,2,2,4','3,6')['exact']['kind'],'infinite');self.assertEqual(matrix_case('1,2,2,4','3,7')['exact']['kind'],'none')
        self.assertEqual(matrix_case('1,1,1,1.0000000000000001','2,2.0000000000000001')['stored']['kind'],'infinite')
    def test_six_runnable_references(self):
        for name in ['overflow_underflow.py','overflow_underflow_numpy.py','stable_algorithms.py','stable_algorithms_numpy.py','numerical_linear_algebra.py','numerical_linear_algebra_numpy.py']:
            with self.subTest(reference=name):subprocess.run([sys.executable,str(ROOT/'code/python'/name)],check=True,stdout=subprocess.DEVNULL)
if __name__=='__main__':unittest.main()
