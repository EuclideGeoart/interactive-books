"""Literal RNG replay, histogram policies, law assumptions, freshness and references."""
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

sys.path.insert(0,str(Path(__file__).resolve().parent))
import probability_sampling_oracle as oracle


class SamplingTests(unittest.TestCase):
    def assertClose(self, actual, expected):
        self.assertAlmostEqual(actual,expected,delta=2e-12*max(1,abs(expected)))

    def test_literal_uint32_sequences_and_replay(self):
        for seed,integers in [(0,[1013904223,1196435762,3519870697]),
                              (42,[1083814273,378494188,2479403867,955863294,1613448261,110225632])]:
            stream = oracle.uniforms(seed)
            self.assertEqual([next(stream) for _ in integers],[n/4294967296 for n in integers])
            self.assertEqual(oracle.lln('uniform',35,seed,24),oracle.lln('uniform',35,seed,24))
        self.assertNotEqual(oracle.lln(seed=42),oracle.lln(seed=43))
        self.assertTrue(all(0 <= next(oracle.uniforms(seed)) < 1 for seed in [0,1,42,2**32-1]))

    def test_literal_bernoulli_prefix_and_nonmonotone_error(self):
        result = oracle.lln('bernoulli',35,42,12)
        self.assertEqual(result['observations'],[1,1,0,1,0,1,0,1,0,0,0,0])
        self.assertEqual(result['sums'],[1,2,2,3,3,4,4,5,5,5,5,5])
        self.assertEqual(result['means'],[1,1,2/3,3/4,3/5,4/6,4/7,5/8,5/9,1/2,5/11,5/12])
        self.assertEqual(result['populationMean'],'7/20')
        self.assertEqual(result['populationVariance'],'91/400')
        self.assertEqual(result['finalMean'],5/12)
        self.assertEqual(result['errorIncreases'],3)
        self.assertClose(result['standardError'],math.sqrt(91/4800))
        self.assertGreater(result['deviations'][3],result['deviations'][2])

    def test_literal_uniform_prefix_and_exponential_inverse_transform(self):
        result = oracle.lln('uniform',35,42,3)
        self.assertEqual(result['observations'],[0.2523451747838408,0.08812504541128874,0.5772811982315034])
        self.assertEqual(result['finalSum'],0.9177514184266329)
        self.assertEqual(result['populationMean'],'1/2')
        self.assertEqual(result['populationVariance'],'1/12')
        exponential = oracle.lln('exponential',35,42,3)
        for x,u in zip(exponential['observations'],result['observations']):
            # Separate inverse expression checks log1p without reading TypeScript or fixtures.
            self.assertClose(x,-math.log(1-u))
        self.assertEqual(exponential['populationMean'],'1/1')
        self.assertEqual(exponential['populationVariance'],'1/1')

    def test_literal_contiguous_blocks_not_reseeded(self):
        result = oracle.clt('bernoulli',35,42,2,10)
        self.assertEqual(result['firstBlocks'],[[1,1],[0,1],[0,1]])
        self.assertEqual(result['sums'][:6],[2,1,1,1,0,0])
        self.assertEqual(result['means'][:6],[1,1/2,1/2,1/2,0,0])
        self.assertClose(result['z'][0],13*math.sqrt(2/91))
        self.assertEqual(result['iidMeanVariance'],'91/800')
        flat = sum(result['firstBlocks'],[])
        self.assertEqual(flat,oracle.lln('bernoulli',35,42,6)['observations'])

    def test_zero_variance_is_undefined_standardization(self):
        for p,value in [(0,0),(100,1)]:
            for dependent in [False,True]:
                result = oracle.clt('bernoulli',p,42,100,10,dependent)
                self.assertFalse(result['standardized'])
                self.assertEqual(result['z'],[None]*10)
                self.assertEqual(result['counts'],[])
                self.assertEqual(result['densities'],[])
                self.assertEqual(result['underflow']+result['overflow'],0)
                self.assertEqual(result['empiricalMean'],value)
                self.assertEqual(result['empiricalVariance'],0)
                self.assertEqual(result['meanVariance'],'0/1')
                lln = oracle.lln('bernoulli',p,42,25)
                self.assertEqual(lln['finalMean'],value)
                self.assertEqual(lln['standardError'],0)
                self.assertEqual(lln['errorIncreases'],0)

    def test_histogram_edge_tail_and_denominator_policy(self):
        # n=16, p=50: all successes give exactly z=+4 (excluded upper endpoint);
        # all failures give exactly z=-4 (included lower endpoint).
        with patch.object(oracle,'uniforms',return_value=iter([0.0]*160)):
            upper = oracle.clt('bernoulli',50,42,16,10)
        self.assertEqual(upper['z'],[4]*10)
        self.assertEqual(upper['overflow'],10)
        self.assertEqual(sum(upper['counts']),0)
        self.assertEqual(sum(upper['densities']),0)
        with patch.object(oracle,'uniforms',return_value=iter([0.75]*160)):
            lower = oracle.clt('bernoulli',50,42,16,10)
        self.assertEqual(lower['z'],[-4]*10)
        self.assertEqual(lower['counts'],[10]+[0]*23)
        self.assertEqual(lower['underflow'],0)
        with patch.object(oracle,'uniforms',return_value=iter(([0.0]*16+[0.75]*16)*5)):
            mixed = oracle.clt('bernoulli',50,42,16,10)
        self.assertEqual(mixed['counts'][0],5)
        self.assertEqual(mixed['overflow'],5)
        self.assertClose(mixed['densities'][0],1.5)
        self.assertClose(sum(mixed['densities'])*oracle.WIDTH,0.5)
        # Interior z=0 belongs to bin 12, following floor with binary64 width.
        with patch.object(oracle,'uniforms',return_value=iter([0.0,0.75]*10)):
            center = oracle.clt('bernoulli',50,42,2,10)
        self.assertEqual(center['counts'][12],10)
        with patch.object(oracle,'uniforms',return_value=iter(([0.0]*100+[0.75]*100)*5)):
            both_tails = oracle.clt('bernoulli',50,42,100,10)
        self.assertEqual(both_tails['underflow'],5)
        self.assertEqual(both_tails['overflow'],5)
        self.assertEqual(sum(both_tails['counts']),0)

    def test_dependence_counterexample_and_non_gaussian_population(self):
        for kind in ['bernoulli','uniform','exponential']:
            one = oracle.clt(kind,35,42,1,40,True)
            hundred = oracle.clt(kind,35,42,100,40,True)
            self.assertFalse(hundred['assumptionsSatisfied'])
            self.assertEqual(hundred['meanVariance'],hundred['populationVariance'])
            self.assertEqual(F(hundred['meanVariance']),100*F(hundred['iidMeanVariance']))
            for block in hundred['firstBlocks']:
                self.assertEqual(len(set(block)),1)
            for x,y,z1,z100 in zip(one['means'],hundred['means'],one['z'],hundred['z']):
                self.assertClose(x,y)
                self.assertClose(z100,10*z1)
        n1 = oracle.clt('bernoulli',50,42,1,1000)
        self.assertEqual(set(n1['z']),{-1,1})
        self.assertEqual(sum(c != 0 for c in n1['counts']),2)

    def test_invalid_inputs_and_limits(self):
        for invalid in [-1,2**32,1.5,True,'42',None,float('nan')]:
            with self.subTest(seed=invalid),self.assertRaises(ValueError):
                oracle.lln(seed=invalid)
            with self.subTest(seed=invalid),self.assertRaises(ValueError):
                oracle.clt(seed=invalid)
        for invalid in [-1,100.01,0.001,float('inf'),float('nan'),True,'35',None]:
            with self.subTest(p=invalid),self.assertRaises(ValueError):
                oracle.lln(p=invalid)
            with self.subTest(p=invalid),self.assertRaises(ValueError):
                oracle.clt(p=invalid)
        for kind in ['normal','cauchy',None,1]:
            with self.subTest(kind=kind),self.assertRaises(ValueError):
                oracle.lln(kind=kind)
        for trials in [0,4001,1.5,True,None]:
            with self.subTest(trials=trials),self.assertRaises(ValueError):
                oracle.lln(trials=trials)
        for n in [0,101,1.5,True,None]:
            with self.subTest(n=n),self.assertRaises(ValueError):
                oracle.clt(n=n)
        for repetitions in [0,9,1001,10.5,True,None]:
            with self.subTest(repetitions=repetitions),self.assertRaises(ValueError):
                oracle.clt(repetitions=repetitions)
        for dependent in [0,1,'true',None]:
            with self.subTest(dependent=dependent),self.assertRaises(ValueError):
                oracle.clt(dependent=dependent)

    def test_fixture_schema_and_all_run_invariants(self):
        data = oracle.build_fixture()
        self.assertEqual(set(data),{'policy','lln','clt'})
        self.assertEqual(len(data['lln']),32)
        self.assertEqual(len(data['clt']),44)
        for case in data['lln']:
            expected = case['expected']
            prefix = min(24,case['trials'])
            self.assertEqual(expected['prefixLength'],prefix)
            running = 0.0
            for i,x in enumerate(expected['observations']):
                running += x
                self.assertEqual(expected['sums'][i],running)
                self.assertEqual(expected['means'][i],running/(i+1))
                self.assertEqual(expected['deviations'][i],abs(running/(i+1)-float(F(expected['populationMean']))))
            self.assertEqual(expected['finalMean'],expected['finalSum']/case['trials'])
            self.assertLessEqual(expected['errorIncreases'],case['trials']-1)
            self.assertClose(expected['standardError'],math.sqrt(float(F(expected['populationVariance']))/case['trials']))
        for case in data['clt']:
            expected = case['expected']
            self.assertEqual(expected['prefixLength'],min(case['repetitions'],24))
            for block,total,mean,z in zip(expected['firstBlocks'],expected['sums'],expected['means'],expected['z']):
                self.assertEqual(len(block),case['n'])
                self.assertClose(total,sum(block))
                self.assertEqual(mean,total/case['n'])
                if expected['standardized']:
                    self.assertClose(z,math.sqrt(case['n'])*(mean-float(F(expected['populationMean'])))/math.sqrt(float(F(expected['populationVariance']))))
                else:
                    self.assertIsNone(z)
            if expected['standardized']:
                self.assertEqual(len(expected['counts']),24)
                self.assertEqual(sum(expected['counts'])+expected['underflow']+expected['overflow'],case['repetitions'])
                for count,density in zip(expected['counts'],expected['densities']):
                    self.assertEqual(density,count/(case['repetitions']*oracle.WIDTH))
                self.assertClose(sum(expected['densities'])*oracle.WIDTH+
                                 (expected['underflow']+expected['overflow'])/case['repetitions'],1)
            else:
                self.assertEqual(expected['counts'],[])
            self.assertGreaterEqual(expected['empiricalVariance'],0)
        self.assertEqual(json.loads(oracle.render(data)),data)
        self.assertEqual(oracle.render(data),oracle.render(oracle.build_fixture()))
        self.assertEqual(oracle.FIXTURE.read_text(encoding='utf-8'),oracle.render(data))

    def test_multiseed_aggregate_consistency_is_not_a_law_proof(self):
        # Deterministic smoke checks detect wrong source scales; loose margins are not theorem evidence.
        for kind,mean,var in [('bernoulli',0.35,0.2275),('uniform',0.5,1/12),('exponential',1,1)]:
            means = [oracle.lln(kind,35,seed,1000)['finalMean'] for seed in range(24)]
            self.assertLess(abs(sum(means)/len(means)-mean),6*math.sqrt(var/24000)+0.002)
            average = sum(oracle.clt(kind,35,seed,20,200)['empiricalVariance'] for seed in range(12))/12
            self.assertLess(abs(average-var/20),0.3*var/20)


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
                data['clt'][0]['expected']['counts'][0] += 1
                oracle.FIXTURE.write_text(oracle.render(data),encoding='utf-8')
                stale = oracle.FIXTURE.read_bytes()
                self.assertEqual(oracle.main(['--check']),1)
                self.assertEqual(oracle.FIXTURE.read_bytes(),stale)
                self.assertEqual(oracle.main(['--write']),0)
                self.assertEqual(oracle.FIXTURE.read_bytes(),original)


class ReferenceCodeTests(unittest.TestCase):
    def test_required_lln_and_clt_references_execute(self):
        for filename in ['probability_lln.py','probability_lln_numpy.py','probability_clt.py','probability_clt_numpy.py']:
            with self.subTest(filename=filename),redirect_stdout(StringIO()):
                runpy.run_path(str(oracle.ROOT/'code/python'/filename),run_name='__main__')


if __name__ == '__main__':
    unittest.main()
