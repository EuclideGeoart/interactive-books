"""Literal tables, independent algebraic identities, freshness and required references."""
from contextlib import redirect_stdout, redirect_stderr
from fractions import Fraction as F
from io import StringIO
import json
import math
from pathlib import Path
import runpy
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import probability_joint_oracle as oracle

CANONICAL = [1,1,0,1,2,1,0,1,1]


class JointTests(unittest.TestCase):
    def test_canonical_literal(self):
        result = oracle.joint(CANONICAL)
        self.assertEqual(result['joint'], ['1/8','1/8','0/1','1/8','1/4','1/8','0/1','1/8','1/8'])
        self.assertEqual(result['rowMass'], ['1/4','1/2','1/4'])
        self.assertEqual(result['colMass'], ['1/4','1/2','1/4'])
        self.assertEqual(result['conditionalRows'], [['1/2','1/2','0/1'],['1/4','1/2','1/4'],['0/1','1/2','1/2']])
        self.assertEqual(result['conditionalCols'], result['conditionalRows'])
        self.assertEqual([result[k] for k in ('meanX','meanY','secondX','secondY','varX','varY','crossMoment','covariance')],
                         ['0/1','0/1','1/2','1/2','1/2','1/2','1/4','1/4'])
        self.assertEqual(result['correlation'], 0.5)
        self.assertFalse(result['independent'])

    def test_presets_correlation_and_non_equivalence(self):
        for table,cov,corr,independent in [
            ([1,2,1,2,4,2,1,2,1],'0/1',0,True),
            ([1,0,0,0,1,0,0,0,1],'2/3',1,False),
            ([0,0,1,0,1,0,1,0,0],'-2/3',-1,False),
            ([0,0,1,0,1,0,0,0,1],'0/1',0,False),
        ]:
            with self.subTest(table=table):
                result = oracle.joint(table)
                self.assertEqual(result['covariance'],cov)
                self.assertAlmostEqual(result['correlation'],corr)
                self.assertEqual(result['independent'],independent)

    def test_zero_marginals_and_constants(self):
        result = oracle.joint([0,0,0,1,2,3,0,0,0])
        self.assertEqual(result['rowMass'], ['0/1','1/1','0/1'])
        self.assertEqual(result['conditionalRows'], [None,['1/6','1/3','1/2'],None])
        self.assertEqual(result['conditionalCols'], [['0/1','1/1','0/1']]*3)
        self.assertEqual(result['varX'],'0/1')
        self.assertIsNone(result['correlation'])
        self.assertTrue(result['independent'])
        result = oracle.joint([1,0,0,2,0,0,3,0,0])
        self.assertEqual(result['conditionalCols'], [['1/6','1/3','1/2'],None,None])
        self.assertTrue(result['independent'])
        for sx,sy in [(0,1),(1,0),(0,0)]:
            result = oracle.joint(CANONICAL,sx,sy,1.25,-2.5)
            self.assertTrue(result['independent'])
            self.assertIsNone(result['correlation'])
            self.assertEqual(result['covariance'],'0/1')

    def test_transform_sign_scale_shift_literals(self):
        result = oracle.joint(CANONICAL,2,-3,1.25,-2.5)
        self.assertEqual(result['xValues'], ['-3/4','5/4','13/4'])
        self.assertEqual(result['yValues'], ['1/2','-5/2','-11/2'])
        self.assertEqual(result['meanX'],'5/4')
        self.assertEqual(result['meanY'],'-5/2')
        self.assertEqual(result['varX'],'2/1')
        self.assertEqual(result['varY'],'9/2')
        self.assertEqual(result['covariance'],'-3/2')
        self.assertEqual(result['correlation'],-0.5)
        self.assertEqual(oracle.joint([7*w for w in CANONICAL]),oracle.joint(CANONICAL))
        transposed = [CANONICAL[3*j+i] for i in range(3) for j in range(3)]
        self.assertEqual(oracle.joint(transposed)['covariance'],'1/4')

    def test_invalid_inputs(self):
        for invalid in (None, [], [1]*8, [1]*10, [0]*9, [-1]+[1]*8, [1000001]+[1]*8,
                        [True]+[1]*8, [1.0]+[1]*8, ['1']+[1]*8, [float('nan')]+[1]*8):
            with self.subTest(weights=invalid),self.assertRaises(ValueError):
                oracle.joint(invalid)
        for invalid in (float('nan'),float('inf'),float('-inf'),True,'1',None,0.001,1000000.01,-1000001,10**1000):
            for position in range(4):
                args = [1,1,0,0]
                args[position] = invalid
                with self.subTest(value=str(invalid),position=position),self.assertRaises(ValueError):
                    oracle.joint(CANONICAL,*args)

    def test_all_fixtures_pairwise_identities_and_normalization(self):
        data = oracle.build_fixture()
        self.assertEqual(len(data['cases']),112)
        for case in data['cases']:
            result = case['expected']
            weights = case['weights']
            total = sum(weights)
            mass = [F(p) for p in result['joint']]
            xs,ys = [F(p) for p in result['xValues']],[F(p) for p in result['yValues']]
            self.assertEqual(sum(mass),1)
            self.assertTrue(all(p >= 0 for p in mass))
            observations = [(xs[i],ys[j],weights[3*i+j]) for i in range(3) for j in range(3)]
            # Pairwise identities avoid computing deviations from the oracle's means.
            vx = sum(F(w*v,2*total**2)*(x-a)**2 for x,y,w in observations for a,b,v in observations)
            vy = sum(F(w*v,2*total**2)*(y-b)**2 for x,y,w in observations for a,b,v in observations)
            cov = sum(F(w*v,2*total**2)*(x-a)*(y-b) for x,y,w in observations for a,b,v in observations)
            self.assertEqual(F(result['varX']),vx)
            self.assertEqual(F(result['varY']),vy)
            self.assertEqual(F(result['covariance']),cov)
            self.assertLessEqual(cov**2,vx*vy)
            self.assertEqual(F(result['meanX']),sum(x*F(w,total) for x,y,w in observations))
            self.assertEqual(F(result['meanY']),sum(y*F(w,total) for x,y,w in observations))
            for marginals,conditionals in [(result['rowMass'],result['conditionalRows']),(result['colMass'],result['conditionalCols'])]:
                self.assertEqual(sum(map(F,marginals)),1)
                for marginal,conditional in zip(marginals,conditionals):
                    if F(marginal):
                        self.assertEqual(sum(map(F,conditional)),1)
                    else:
                        self.assertIsNone(conditional)
            primitive_independent = all(weights[3*i+j]*total == sum(weights[3*i:3*i+3])*sum(weights[j::3])
                                        for i in range(3) for j in range(3))
            self.assertEqual(result['independent'],case['xScale']==0 or case['yScale']==0 or primitive_independent)
            if vx and vy:
                self.assertAlmostEqual(result['correlation'],float(cov)/math.sqrt(float(vx*vy)),delta=2e-12)
                self.assertLessEqual(abs(result['correlation']),1+2e-12)
            else:
                self.assertIsNone(result['correlation'])
        self.assertEqual(json.loads(oracle.render(data)),data)
        self.assertEqual(oracle.FIXTURE.read_text(encoding='utf-8'),oracle.render(data))


class FreshnessTests(unittest.TestCase):
    def test_missing_stale_write_and_readonly_check(self):
        with TemporaryDirectory() as directory,patch.object(oracle,'FIXTURE',Path(directory)/'fixture.json'):
            with redirect_stdout(StringIO()),redirect_stderr(StringIO()):
                self.assertEqual(oracle.main([]),1)
                self.assertFalse(oracle.FIXTURE.exists())
                self.assertEqual(oracle.main(['--write']),0)
                original = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main([]),0)
                self.assertEqual(oracle.main(['--check']),0)
                self.assertEqual(oracle.FIXTURE.read_bytes(),original)
                data = json.loads(original)
                data['cases'][0]['expected']['independent'] = True
                oracle.FIXTURE.write_text(oracle.render(data),encoding='utf-8')
                stale = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']),1)
                self.assertEqual(oracle.FIXTURE.read_bytes(),stale)
                self.assertEqual(oracle.main(['--write']),0)
                self.assertEqual(oracle.FIXTURE.read_bytes(),original)


class ReferenceCodeTests(unittest.TestCase):
    def test_required_joint_and_covariance_references_execute(self):
        for filename in ['probability_joint.py','probability_joint_numpy.py',
                         'probability_covariance.py','probability_covariance_numpy.py']:
            with self.subTest(filename=filename),redirect_stdout(StringIO()):
                runpy.run_path(str(oracle.ROOT/'code/python'/filename),run_name='__main__')


if __name__ == '__main__':
    unittest.main()
