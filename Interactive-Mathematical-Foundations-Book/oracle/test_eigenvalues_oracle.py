from pathlib import Path
import runpy
import unittest
import numpy as np
from eigenvalues_oracle import spectrum,cases
class EigenOracleTests(unittest.TestCase):
    def test_literals(self):
        self.assertEqual(spectrum([[2,0],[0,-1]])['values'],[2,-1])
        self.assertEqual(spectrum([[1,1],[0,1]])['kind'],'defective')
        self.assertEqual(spectrum([[2,0],[0,2]])['kind'],'scalar')
        self.assertEqual(spectrum([[0,-1],[1,0]])['kind'],'no-real')
        self.assertEqual(spectrum([[0,2],[1,0]])['discriminant'],'8')
    def test_numpy_and_characteristic_residuals(self):
        for c in cases():
            a=np.array(c['a'],float); e=c['expected']; values,vectors=np.linalg.eig(a)
            for value,vector in zip(values,vectors.T):
                self.assertLess(np.linalg.norm(a@vector-value*vector),256*np.finfo(float).eps*max(1,np.linalg.norm(a)))
            if e['kind']!='no-real': np.testing.assert_allclose(sorted(values.real),sorted(e['values']),atol=1e-12,rtol=1e-12)
    def test_references(self):
        root=Path(__file__).resolve().parents[1]/'code/python'
        for f in ['eigenvalues.py','eigenvalues_numpy.py']: runpy.run_path(str(root/f))
