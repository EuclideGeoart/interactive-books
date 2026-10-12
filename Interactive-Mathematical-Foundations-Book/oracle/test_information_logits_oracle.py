import unittest,math,subprocess,sys
from pathlib import Path
from information_logits_oracle import pipeline,sequence
class Logits(unittest.TestCase):
    def test_literal_probabilities_and_logs(self):
        self.assertEqual(pipeline([0,0])['probabilities'],[.5,.5])
        self.assertEqual(pipeline([1000,0,-1000])['logProbabilities'],[0,-1000,-2000])
        self.assertEqual(pipeline([1e308,1e308])['logProbabilities'],[-math.log(2),-math.log(2)])
    def test_shift_identity_and_normalization(self):
        self.assertEqual(pipeline([1,2,3])['probabilities'],pipeline([1001,1002,1003])['probabilities'])
        self.assertAlmostEqual(sum(pipeline([1,2,3])['probabilities']),1,places=15)
    def test_policies(self):
        for z in [[],['NaN',0],['Infinity',0]]:self.assertEqual(pipeline(z)['status'],'invalid')
        self.assertEqual(pipeline(['-Infinity','-Infinity'])['status'],'undefined')
        self.assertEqual(pipeline([0,'-Infinity'])['probabilities'],[1,0])
    def test_token_loss_masks(self):
        p=[dict(logits=[0,0,0,0],target=2,ignored=False),dict(logits=[1000,0,-1000,-1000],target=3,ignored=True)]
        d=sequence(p);self.assertEqual(d['count'],1);self.assertEqual(d['mean'],math.log(4));self.assertEqual(d['losses'],[math.log(4),2000])
        self.assertIsNone(sequence([{**x,'ignored':True} for x in p])['mean'])
    def test_invalid_tokens(self):
        for p in [[],[dict(logits=[0,0],target=0,ignored=False)],[dict(logits=[0]*4,target=4,ignored=True)],[dict(logits=['NaN',0,0,0],target=0,ignored=True)]]:
            with self.assertRaises(ValueError):sequence(p)
    def test_references(self):
        root=Path(__file__).resolve().parents[1]
        for name in ['information_softmax.py','information_softmax_numpy.py','information_stability.py','information_stability_numpy.py','information_tokens.py','information_tokens_numpy.py']:
            subprocess.run([sys.executable,str(root/'code/python'/name)],check=True,capture_output=True,text=True)
