from fractions import Fraction as F
from pathlib import Path
import runpy
import unittest
import numpy as np
from least_squares_oracle import fit,cases
class LeastSquaresOracleTests(unittest.TestCase):
    def test_literals(self):
        d=fit([[1,-1],[1,0],[1,1]],[0,2,2])
        self.assertEqual(d['x'],['4/3','1']);self.assertEqual(d['objective'],'2/3')
        self.assertEqual(d['residual'],['-1/3','2/3','-1/3'])
        self.assertFalse(fit([[1,1],[1,1],[1,1]],[0,2,2])['unique'])
    def test_numpy_projection_and_optimality(self):
        for c in cases():
            a=np.array(c['a'],float);b=np.array(c['b'],float);e=c['expected']
            x,*_=np.linalg.lstsq(a,b,rcond=None);r=b-a@x
            np.testing.assert_allclose(a@x,[float(F(v)) for v in e['projected']],rtol=1e-10,atol=1e-10)
            self.assertAlmostEqual(float(r@r),float(F(e['objective'])),places=9)
            # Independent perturbations can never improve the residual objective.
            for offset in np.eye(a.shape[1]):self.assertGreaterEqual(np.linalg.norm(a@(x+offset)-b)**2+1e-10,r@r)
    def test_references(self):
        root=Path(__file__).resolve().parents[1]/'code/python'
        for f in ['least_squares.py','least_squares_numpy.py']:runpy.run_path(str(root/f))
