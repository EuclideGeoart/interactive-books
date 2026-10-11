from pathlib import Path
import runpy
import unittest
import numpy as np
from svd_oracle import cases,decompose,TOLERANCE
class SVDOracleTests(unittest.TestCase):
    def test_literal_spectrum_and_rank(self):
        self.assertEqual(decompose([[3,0],[0,-1]])['singular'],[3.,1.])
        self.assertEqual(decompose([[1,2],[2,4]])['rank'],1)
        self.assertEqual(decompose([[1,2],[2,4]])['singular'],[5.,0.])
        self.assertEqual(decompose([[0,0],[0,0]])['rank'],0)
        self.assertTrue(decompose([[0,2],[2,0]])['repeated'])
        self.assertEqual(decompose([[4,3.99],[3.99,3.98]])['rank'],2)
    def test_numpy_low_rank_and_pseudoinverse_properties(self):
        for c in cases():
            a=np.array(c['a'],float);u,s,vt=np.linalg.svd(a);scale=max(1,np.linalg.norm(a))
            one=s[0]*np.outer(u[:,0],vt[0])
            self.assertLessEqual(abs(np.linalg.norm(a-one,'fro')-s[1]),TOLERANCE*scale)
            self.assertGreaterEqual(s[0],s[1]);self.assertGreaterEqual(s[1],0)
            # Penrose identities checked only where inverse recovery has a meaningful rounding budget.
            if c['expected']['rank']<2 or s[0]/s[1]*TOLERANCE<1e-4:
                pinv=np.linalg.pinv(a,rcond=0 if c['expected']['rank']==2 else 1e-12)
                np.testing.assert_allclose(a@pinv@a,a,atol=1e-9*scale,rtol=1e-9)
    def test_references_against_independent_numpy(self):
        root=Path(__file__).resolve().parents[1]/'code/python'
        reference=runpy.run_path(str(root/'svd.py'))['svd2']
        runpy.run_path(str(root/'svd_numpy.py'))
        for c in cases():
            a=np.array(c['a'],float);u,s,vt=reference(c['a']);u=np.array(u);vt=np.array(vt);scale=max(1,np.linalg.norm(a))
            self.assertLessEqual(np.linalg.norm(a-u@np.diag(s)@vt)/scale,TOLERANCE)
            self.assertLessEqual(np.linalg.norm(u.T@u-np.eye(2)),TOLERANCE)
            self.assertLessEqual(np.linalg.norm(vt@vt.T-np.eye(2)),TOLERANCE)
