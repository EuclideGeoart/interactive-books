import unittest,math,subprocess,sys
from pathlib import Path
from decimal import Decimal
from information_probability_oracle import information,entropy,product
class InformationProbability(unittest.TestCase):
    def test_hand_products(self):
        self.assertEqual(product([.5,.25,.8],1)['exact'],'1/10')
        self.assertAlmostEqual(product([.5,.25,.8],1)['logLikelihood'],-math.log(10),places=14)
        self.assertEqual(product([0,.5],1)['logLikelihood'],'-Infinity')
        self.assertTrue(math.isfinite(product([.5,.5,.5],400)['logLikelihood']))
    def test_boundary_surprise(self):
        self.assertEqual(information('1/4','bits'),2)
        self.assertEqual(information('1','nats'),0)
        self.assertEqual(information('0','nats'),Decimal('Infinity'))
    def test_entropy_extrema(self):
        self.assertEqual(entropy([1,0,0],'bits')['value'],0)
        self.assertEqual(entropy([2,1,1],'bits')['terms'],[.5,.5,.5])
        self.assertEqual(entropy([1,1,1,1],'bits')['value'],2)
        # Concavity is proved in the chapter; these literal cases only check the implementation.
        self.assertLess(entropy([99,1],'bits')['value'],1)
    def test_invalid(self):
        for p in ['-1/4','5/4']:
            with self.assertRaises(ValueError):information(p,'nats')
        for w in [[],[0,0],[-1,2],[.5,1],[1]*7]:
            with self.assertRaises(ValueError):entropy(w,'nats')
    def test_references(self):
        root=Path(__file__).resolve().parents[1]
        for name in ['information_logs.py','information_logs_numpy.py','information_surprise.py','information_surprise_numpy.py','information_entropy.py','information_entropy_numpy.py']:
            subprocess.run([sys.executable,str(root/'code/python'/name)],check=True,capture_output=True,text=True)
