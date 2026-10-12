import unittest,subprocess,sys,math
from pathlib import Path
from fractions import Fraction as F
from statistics_likelihood_oracle import inference
class Likelihood(unittest.TestCase):
    def test_literal_likelihood_and_optimizer(self):
        d=inference([1,0,1,1,0],.6,2,2)
        self.assertEqual(d['likelihood'],'108/3125');self.assertEqual(d['mle'],'3/5');self.assertEqual(d['mode'],dict(kind='interior',modes=['4/7']))
        self.assertEqual(inference([1,1,1],1,1,1)['mle'],'1/1')
        self.assertEqual(inference([0,0,0],0,1,1)['mle'],'0/1')
        self.assertIsNone(inference([],0,1,1)['mle'])
    def test_beta_normalization_by_polynomial_integral(self):
        d=inference([1,0,1,1,0],.5,2,2)
        self.assertEqual((d['a'],d['b']),(5,4));self.assertAlmostEqual(d['evidence'],3/140,places=14)
        self.assertAlmostEqual(d['posterior']['value'],35/16,places=13)
        self.assertEqual(280*(F(1,5)-3*F(1,6)+3*F(1,7)-F(1,8)),1)
    def test_boundary_and_nonunique_policies(self):
        self.assertEqual(inference([],0,1,1)['mode']['kind'],'uniform')
        self.assertEqual(inference([],0,.5,.5)['mode']['modes'],['0/1','1/1'])
        self.assertEqual(inference([1],0,.5,.5)['prior']['kind'],'divergent')
        self.assertEqual(inference([1],0,.5,.5)['unnormalized']['kind'],'zero')
        self.assertEqual(inference([1],0,.5,.5)['logLikelihood'],'-Infinity')
    def test_invalid(self):
        for kwargs in [dict(data=[2],theta=.5,alpha=1,beta=1),dict(data=[],theta=1.1,alpha=1,beta=1),dict(data=[],theta=.5,alpha=.75,beta=1)]:
            with self.assertRaises(ValueError):inference(**kwargs)
    def test_references(self):
        root=Path(__file__).resolve().parents[1]
        for name in ['statistics_likelihood.py','statistics_likelihood_numpy.py','statistics_mle.py','statistics_mle_numpy.py','statistics_map.py','statistics_map_numpy.py']:
            subprocess.run([sys.executable,str(root/'code/python'/name)],check=True,capture_output=True,text=True)
