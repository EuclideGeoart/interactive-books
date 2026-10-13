"""Focused canonical execution, oracle and edge-case tests."""
from copy import deepcopy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import numpy as np
import generate_fixtures as g
p,f,t,s,c,a = g.p,g.f,g.t,g.s,g.c,g.a

class FoundationTests(unittest.TestCase):
    def test_literal_oracle(self):
        a.self_test()

    def test_golden_independent_checks(self):
        result = g.build()
        self.assertEqual(result['pipeline']['before']['numerical']['mse'],4.1)
        self.assertEqual(result['nearRank']['fit']['coefficients'],None)

    def test_canonical_scripts_really_execute(self):
        for name in ('pipeline.py','samples_features.py','learning_problems.py','split_generalization.py','optimization_loop.py','capacity_baselines.py'):
            with self.subTest(name=name):
                result = subprocess.run([sys.executable,'-B',str(g.ROOT/'code/python/p01'/name)],capture_output=True,text=True,check=True)
                self.assertIsNotNone(json.loads(result.stdout))

    def test_seed_order_group_invariants(self):
        for seed in (0,42,0xffffffff):
            for groups in (True,False):
                original = s.seed_split(s.SPLIT_SAMPLES,seed,groups)
                reverse = s.seed_split(list(reversed(s.SPLIT_SAMPLES)),seed,groups)
                self.assertEqual(json.dumps(original),json.dumps(reverse))
                self.assertEqual(original['assignments'],a.partition(s.SPLIT_SAMPLES,seed,groups))
                derived = s.derive_split(original)
                self.assertEqual(sum(row['count'] for row in derived['subsets']),12)
                if groups:
                    self.assertEqual(derived['groupLeaks'],[])

    def test_group_move_and_leak(self):
        grouped = s.assign_split(s.SPLIT_CANONICAL,'g1-a','test')
        self.assertEqual(grouped['assignments']['g1-a'],grouped['assignments']['g1-b'])
        unsafe = {**deepcopy(grouped),'keepGroups':False}
        unsafe = s.assign_split(unsafe,'g1-a','validation')
        self.assertIn('g1',s.derive_split(unsafe)['groupLeaks'])
        self.assertTrue(s.derive_split(unsafe)['duplicateLeaks'])

    def test_leakage_exact_and_counterfactual(self):
        data = s.leakage_example(42,10)
        self.assertEqual((data['honestMSE'],data['leakedMSE']),(0,9))
        self.assertEqual((data['targetCentering']['honestMSE'],data['targetCentering']['leakedMSE']),(81,36))
        changed = s.leakage_example(42,13)
        self.assertEqual(data['trainingMean'],changed['trainingMean'])
        self.assertNotEqual(data['wholeMean'],changed['wholeMean'])

    def test_feature_shape_type_and_absent_targets(self):
        for n in range(1,7):
            for d in range(1,4):
                result = f.derive_features({**f.FEATURE_CANONICAL,'sampleCount':n,'featureCount':d})
                self.assertEqual(result['shapes'],dict(X=[n,d],weights=[d,1],targets=[n,1]))
        unlabelled = f.derive_features(f.feature_target_kind(f.FEATURE_CANONICAL,'none'))
        self.assertIsNone(unlabelled['y'])
        bad = deepcopy(f.FEATURE_CANONICAL); bad['samples'][0]['values'][1] = .5
        with self.assertRaises(ValueError): f.derive_features(bad)

    def test_task_semantics(self):
        expected = {'price':'regression','spam':'classification','binary-code':'classification','proportion':'regression','customers':'unsupervised','ignore-label':'unsupervised'}
        for identifier,choice in expected.items():
            self.assertTrue(t.derive_task(dict(scenario=identifier,choice=choice))['correct'])

    def test_training_only_fit_and_baseline(self):
        original = c.derive_capacity(c.CAPACITY_CANONICAL)
        changed_state = c.assign_capacity(c.CAPACITY_CANONICAL,'p1','validation')
        changed = c.derive_capacity(changed_state)
        training = [row for row in changed['samples'] if row['partition']=='train']
        self.assertNotIn('p1',changed['trainingIds'])
        g.close(changed['baselineMean'],a.baseline([row['y'] for row in training]))
        self.assertNotEqual(original['coefficients'],changed['coefficients'])
        self.assertEqual(len(changed['samples']),17)

    def test_empty_rank_and_one_sample(self):
        empty = {**c.CAPACITY_CANONICAL,'source':'manual','assignments':{f'p{i}':'validation' for i in range(1,18)}}
        result = c.derive_capacity(empty)
        self.assertIsNone(result['baselineMean']); self.assertIsNone(result['coefficients'])
        self.assertTrue(all(error['mse'] is None for error in result['errors']))
        self.assertIsNone(c.capacity_candidates(empty)['selectedDegree'])
        self.assertIsNone(c.fit_capacity([dict(id='a',x=0,y=1)],1)['coefficients'])
        self.assertEqual(c.fit_capacity([dict(id='a',x=0,y=1)],0)['coefficients'],[1])
        constant = [dict(id=str(i),x=.5,y=i) for i in range(3)]
        self.assertIsNone(c.fit_capacity(constant,1)['coefficients'])

    def test_near_rank_policy_not_wide_tolerance(self):
        near = [dict(id=str(i),x=x,y=2*x+1) for i,x in enumerate((.5-1.3e-12,.5,.5+1.3e-12))]
        self.assertTrue(a.qr_rank_rejected(near,1))
        self.assertEqual(c.fit_capacity(near,1),dict(coefficients=None,reason=c.RANK_REASON))
        well = [dict(id=str(i),x=x,y=2*x+1) for i,x in enumerate((.5-1e-5,.5,.5+1e-5))]
        coefficients = c.fit_capacity(well,1)['coefficients']
        for actual,expected in zip(coefficients,[1,2]): g.close(actual,expected,1e-9)

    def test_capacity_zero_noise_and_selection_reproducibility(self):
        state = {**c.CAPACITY_CANONICAL,'noise':0}
        result = c.derive_capacity(state)
        for actual,expected in zip(result['coefficients'],[1,2,-1]): g.close(actual,expected)
        self.assertLess(result['errors'][1]['mse'],1e-25)
        self.assertEqual(c.capacity_candidates(state)['selectedDegree'],2)
        self.assertEqual(c.capacity_candidates(state),c.capacity_candidates(deepcopy(state)))

    def test_detached_input_and_inference(self):
        state = deepcopy(p.PIPELINE_CANONICAL)
        trace = p.pipeline_trace(state)
        trace[0]['state']['regression']['samples'][0]['x'] = 4
        self.assertEqual(state['regression']['samples'][0]['x'],-2)
        inference = {**state,'mode':'inference'}
        self.assertIsNone(p.derive_pipeline(inference)['loss'])
        with self.assertRaises(ValueError): p.pipeline_update(inference)

    def test_invalid_and_golden_staleness(self):
        for seed in (-1,1.5,2**32):
            with self.assertRaises(ValueError): s.seed_split(s.SPLIT_SAMPLES,seed,True)
        for noise in (-1,float('nan'),3):
            with self.assertRaises(ValueError): c.derive_capacity({**c.CAPACITY_CANONICAL,'noise':noise})
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary)/'fixture.json'
            with self.assertRaises(ValueError): g.check(path)
            path.write_text('stale\n')
            with self.assertRaises(ValueError): g.check(path)
            path.write_text(g.serialized())
            g.check(path)


    def test_category_requires_primitive_string(self):
        state = f.feature_target_kind(f.FEATURE_CANONICAL, 'category')
        for target in (['ready'], {'value':'ready'}, None, True, 1):
            bad = deepcopy(state)
            bad['samples'][0]['target'] = target
            with self.subTest(target=target), self.assertRaises(ValueError):
                f.derive_features(bad)
        self.assertTrue(all(type(row[0]) is str for row in f.derive_features(state)['y']))

    def test_numeric_boundaries_reject_bool_and_nonnumeric(self):
        def split_rows(key,value):
            return [{**row,key:value} if i==0 else row.copy() for i,row in enumerate(s.SPLIT_SAMPLES)]
        calls = {
            'pipeline query':lambda v:p.derive_pipeline({**p.PIPELINE_CANONICAL,'mode':'inference','query':v}),
            'pipeline trace query':lambda v:p.pipeline_trace({**p.PIPELINE_CANONICAL,'query':v}),
            'pipeline update query':lambda v:p.pipeline_update({**p.PIPELINE_CANONICAL,'query':v}),
            'capacity observations noise':lambda v:c.observations({**c.CAPACITY_CANONICAL,'noise':v}),
            'capacity data noise':lambda v:c.capacity_data({**c.CAPACITY_CANONICAL,'noise':v}),
            'capacity candidates noise':lambda v:c.capacity_candidates({**c.CAPACITY_CANONICAL,'noise':v}),
            'capacity trace noise':lambda v:c.capacity_trace({**c.CAPACITY_CANONICAL,'noise':v}),
            'fit x':lambda v:c.fit_capacity([dict(id='a',x=v,y=1)],0),
            'fit y':lambda v:c.fit_capacity([dict(id='a',x=0,y=v)],0),
            'prediction x':lambda v:c.polynomial_prediction(v,[1,2]),
            'prediction coefficient':lambda v:c.polynomial_prediction(1,[1,v]),
            'split x':lambda v:s.seed_split(split_rows('x',v),42,True),
            'split y':lambda v:s.seed_split(split_rows('y',v),42,True),
            'derive split x':lambda v:s.derive_split({**s.SPLIT_CANONICAL,'samples':split_rows('x',v)}),
            'centering distance':lambda v:s.leakage_example(42,v),
        }
        for value in (True,False,None,'1',[],{},float('nan'),float('inf'),10**400):
            for name,call in calls.items():
                with self.subTest(surface=name,value=repr(value)), self.assertRaises(ValueError):
                    call(value)
        for value in (1,1.0):
            self.assertEqual(p.derive_pipeline({**p.PIPELINE_CANONICAL,'mode':'inference','query':value})['prediction'],.5)
            self.assertEqual(c.fit_capacity([dict(id='a',x=0,y=value)],0)['coefficients'],[1])
            self.assertEqual(c.polynomial_prediction(value,[1,2]),3)
            self.assertEqual(len(c.observations({**c.CAPACITY_CANONICAL,'noise':value})),17)
            self.assertEqual(len(s.seed_split(split_rows('x',value),42,True)['samples']),12)

    def test_numeric_duplicate_equality_and_canonical_display(self):
        rows = [dict(id='integer',group='a',x=1,y=2),dict(id='float',group='b',x=1.0,y=2.0),dict(id='other',group='c',x=3,y=4)]
        state = dict(samples=rows,seed=42,keepGroups=False,source='manual',assignments=dict(integer='train',float='validation',other='test'))
        result = s.derive_split(state)
        self.assertEqual(result['duplicateLeaks'],['1|2'])
        self.assertEqual([subset['mse'] for subset in result['subsets']],[0,0,4])
        self.assertEqual(s.derive_split({**state,'samples':list(reversed(rows))})['duplicateLeaks'],['1|2'])
        for value,text in [(0.0,'0'),(-0.0,'0'),(1e-7,'1e-7'),(1e-6,'0.000001')]:
            changed = [{**row,'x':value,'y':2.0} if row['id']!='other' else row for row in rows]
            self.assertEqual(s.derive_split({**state,'samples':changed})['duplicateLeaks'],[text+'|2'])

if __name__ == '__main__':
    unittest.main()
