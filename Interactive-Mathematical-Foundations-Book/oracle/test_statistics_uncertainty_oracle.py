import unittest, subprocess,sys,math
from pathlib import Path
from statistics_uncertainty_oracle import scatter,regression,intervals
class Uncertainty(unittest.TestCase):
    def test_hand_covariance(self):
        d=scatter([-3,-1,0,1,3],[-1,0,1,2,3],[1]*5)
        self.assertEqual([d[k] for k in ['varX','varY','covariance','determinant']],['4/1','2/1','14/5','4/25'])
        self.assertEqual(scatter([-2,0,2],[-2,0,2],[1]*3)['rank'],1)
        self.assertTrue(scatter([-1,1,0,0],[0,0,-1,1],[1]*4)['repeated'])
    def test_normal_equations(self):
        d=regression([-3,-1,0,1,3],[-1,0,1,2,3],[1]*5)
        self.assertEqual([d[k] for k in ['slope','intercept','rss','residualSum','orthogonality']],['7/10','1/1','1/5','0/1','0/1'])
        self.assertIsNone(regression([2,2,2],[1,2,4],[1]*3)['slope'])
    def test_coverage_and_seed(self):
        d=intervals(2,1.5,8,24,42,95)
        self.assertAlmostEqual(d['critical'],1.959963984540054,places=14)
        self.assertAlmostEqual(d['analyticCoverage'],.95,places=14)
        self.assertAlmostEqual(d['width'],2.0788557365245164,places=12)
        self.assertEqual(d,intervals(2,1.5,8,24,42,95))
        self.assertAlmostEqual(intervals(2,1.5,1,1,42,95)['analyticCoverage'],.95,places=14)
    def test_invalid(self):
        with self.assertRaises(ValueError):scatter([1],[1],[0])
        with self.assertRaises(ValueError):intervals(2,0,1,1,42,95)
    def test_references(self):
        root=Path(__file__).resolve().parents[1]
        for name in ['statistics_intervals.py','statistics_intervals_numpy.py','statistics_covariance.py','statistics_covariance_numpy.py','statistics_regression.py','statistics_regression_numpy.py']:
            subprocess.run([sys.executable,str(root/'code/python'/name)],check=True,capture_output=True,text=True)
