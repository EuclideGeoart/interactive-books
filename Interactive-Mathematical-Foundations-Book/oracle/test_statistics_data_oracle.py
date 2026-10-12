import unittest, subprocess, sys
from pathlib import Path
from fractions import Fraction as F
from itertools import product
from statistics_data_oracle import summary, sampling
class StatisticsData(unittest.TestCase):
    def test_literals(self):
        self.assertEqual(summary([1,2,2,3,7]),dict(mean='3/1',median='2/1',mad='1/1',variance='22/5',sampleVariance='11/2',modes=['2/1'],ordered=['1/1','2/1','2/1','3/1','7/1']))
        self.assertIsNone(summary([4])['sampleVariance'])
        self.assertEqual(summary([1,1,3,3])['modes'],['1/1','3/1'])
        self.assertEqual(summary([1,2,3])['modes'],[])
    def test_seed_and_combinatorics(self):
        run=sampling(42,4,1,False,0)
        self.assertEqual(run['samples'],[[2,0,6,1]])
        self.assertEqual(run['estimates'],['9/4'])
        means=[F(sum(xs),2) for xs in product([0,1,2,3,6,7,8,9],repeat=2)]
        self.assertEqual(sum(means)/64,F(9,2))
        self.assertEqual(sum((x-F(9,2))**2 for x in means)/64,F(41,8))
        self.assertEqual(sampling(42,32,64,True,0)['theoreticalBias'],'3/1')
    def test_invalid(self):
        for xs in [[],[21],[0.001]]:
            with self.assertRaises(ValueError): summary(xs)
        with self.assertRaises(ValueError): sampling(-1,1,1,False,0)
    def test_references(self):
        root=Path(__file__).resolve().parents[1]
        for file in ['statistics_summaries.py','statistics_summaries_numpy.py','statistics_spread.py','statistics_spread_numpy.py','statistics_sampling.py','statistics_sampling_numpy.py','statistics_estimators.py','statistics_estimators_numpy.py']:
            subprocess.run([sys.executable,str(root/'code/python'/file)],check=True,capture_output=True,text=True)
