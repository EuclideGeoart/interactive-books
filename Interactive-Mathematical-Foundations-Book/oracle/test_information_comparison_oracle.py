import unittest,math,subprocess,sys
from pathlib import Path
from information_comparison_oracle import compare
class Comparison(unittest.TestCase):
    def test_literal_one_hot_and_zero(self):
        self.assertEqual(compare(['0','1','0'],['1/2','1/4','1/4'],'bits')['cross'],2)
        self.assertEqual(compare(['1','0'],['1','0'],'bits')['crossTerms'],[0,0])
        self.assertEqual(compare(['1','0'],['0','1'],'bits')['cross'],'Infinity')
    def test_asymmetry_and_identity(self):
        self.assertEqual(compare(['1','0'],['1/2','1/2'],'bits')['kl'],1)
        self.assertEqual(compare(['1/2','1/2'],['1','0'],'bits')['kl'],'Infinity')
        p=['1/2','1/4','1/4'];q=['1/4','1/2','1/4'];d=compare(p,q,'bits')
        self.assertEqual(d['entropy'],1.5);self.assertEqual(d['cross'],1.75);self.assertEqual(d['kl'],.25)
        self.assertEqual(d['klTerms'],[.5,-.25,0])
    def test_triangle_counterexample(self):
        p=['1/10','9/10'];q=['1/5','4/5'];r=['3/10','7/10']
        self.assertGreater(compare(p,r,'nats')['kl'],compare(p,q,'nats')['kl']+compare(q,r,'nats')['kl'])
    def test_invalid(self):
        for p,q in [([],[]),(['1/2'],['1']),(['-1','2'],['1','0']),(['1'],['1','0'])]:
            with self.assertRaises(ValueError):compare(p,q,'nats')
    def test_references(self):
        root=Path(__file__).resolve().parents[1]
        for name in ['information_cross.py','information_cross_numpy.py','information_kl.py','information_kl_numpy.py']:
            subprocess.run([sys.executable,str(root/'code/python'/name)],check=True,capture_output=True,text=True)
