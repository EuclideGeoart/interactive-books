"""Focused canonical execution vs mathematically independent expected results."""
import copy
import importlib
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import warnings
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"code/python/p03"))
import nearest_neighbors as nearest
import distance_metrics as metric
import naive_bayes as bayes
import common
import cases
import independent
import generate_fixtures as golden

def assert_parity(test, actual, expected, path="root"):
    if isinstance(expected,bool) or expected is None or isinstance(expected,str):
        test.assertEqual(actual,expected,path)
    elif isinstance(expected,(int,float)):
        test.assertTrue(isinstance(actual,(int,float)) and math.isfinite(actual),path)
        test.assertLessEqual(abs(actual-expected),2e-12+1e-12*abs(expected),path)
    elif isinstance(expected,list):
        test.assertEqual(len(actual),len(expected),path)
        for j,v in enumerate(expected):
            assert_parity(test,actual[j],v,path+"."+str(j))
    else:
        for key,value in expected.items():
            assert_parity(test,actual[key],value,path+"."+key)

def neighbor_numbers(state):
    a=nearest.derive(state)
    return dict(a,orderedIds=[r["id"] for r in a["rows"]],distances=[r["distance"] for r in a["rows"]],reasonCode="k-too-large" if a["reason"] else None)

def bayes_numbers(state):
    a=bayes.derive(state)
    reason=a["reason"]
    code=None if reason is None else "no-prior" if reason.startswith("All prior") else "unknown-likelihood" if reason.startswith("A required") else "impossible"
    return dict(a,reasonCode=code)

class InstanceMethods(unittest.TestCase):
    def test_exhaustive_neighbors(self):
        for name,state in cases.states()["neighbors"]:
            with self.subTest(name=name):
                assert_parity(self,neighbor_numbers(state),independent.neighbors(state))
    def test_decimal_norm_and_closed_form_seed(self):
        for name,state in cases.states()["metrics"]:
            with self.subTest(name=name):
                assert_parity(self,metric.derive(state),independent.metrics(state))
    def test_rational_bayes_products(self):
        for name,state in cases.states()["bayes"]:
            with self.subTest(name=name):
                assert_parity(self,bayes_numbers(state),independent.bayes(state))
    def test_actual_canonical_execution(self):
        for name,module,oracle in (("nearest_neighbors",nearest,independent.neighbors),("distance_metrics",metric,independent.metrics),("naive_bayes",bayes,independent.bayes)):
            completed=subprocess.run([sys.executable,"-B",str(ROOT/"code/python/p03"/(name+".py"))],capture_output=True,text=True,check=True)
            self.assertEqual(completed.stderr,"")
            output=json.loads(completed.stdout)
            for frame in output["trace"]:
                expected=oracle(frame["state"])
                actual=neighbor_numbers(frame["state"]) if name=="nearest_neighbors" else bayes_numbers(frame["state"]) if name=="naive_bayes" else frame["derived"]
                assert_parity(self,actual,expected)
            self.assertEqual(output["before"]["state"],module.CANONICAL)
            self.assertIn("after",output)
    def test_binary64_large_integer_execution(self):
        program = 'import json;from common import distance;print(json.dumps([distance([2**53+1],[2**53]),distance([10**100+1],[10**100])]))'
        completed=subprocess.run([sys.executable,"-B","-c",program],cwd=ROOT/"code/python/p03",capture_output=True,text=True,check=True)
        self.assertEqual(json.loads(completed.stdout),[0.0,0.0])
        state=next(state for name,state in cases.states()["neighbors"] if name=="binary64-integer-duplicates")
        actual=nearest.derive(state)
        self.assertEqual(actual["duplicateIds"],["a","b"])
        self.assertEqual([r["distance"] for r in actual["rows"]],[0.0,0.0])
        self.assertEqual(actual["rows"][0]["x"],float(2**53+1))
    def test_strict_numeric_types_on_public_surface(self):
        operations=[
            lambda v:common.distance([v],[0]),lambda v:common.distance([0],[v]),
            lambda v:common.distance([0],[0],scales=[v]),lambda v:common.distance([0],[0],"Lp",v),
            lambda v:nearest.derive(cases.changed(cases.NEIGHBORS,query={"x":v,"y":0})),
            lambda v:nearest.derive(cases.changed(cases.NEIGHBORS,k=v)),
            lambda v:metric.derive(cases.changed(cases.METRICS,seed=v)),
            lambda v:metric.derive(cases.changed(cases.METRICS,dimension=v)),
            lambda v:metric.summarize([v]),lambda v:bayes.derive(cases.changed(cases.BAYES,alpha=v)),
            lambda v:bayes.derive(cases.changed(cases.BAYES,query=[v,1])),
        ]
        for v in (True,False,"1",[],{},None,float("nan"),float("inf"),10**1000):
            for j,operation in enumerate(operations):
                with self.subTest(value=repr(v),surface=j):
                    with self.assertRaises(ValueError):
                        operation(v)
        self.assertEqual(common.distance([3],[0]),3)
        self.assertEqual(common.distance([3.0],[0.0]),3)
    def test_count_and_prior_boundaries(self):
        for field in ("count","priorWeight","positive"):
            state=copy.deepcopy(cases.BAYES)
            state["classes"][0][field]=[True,1] if field=="positive" else True
            with self.assertRaises(ValueError):
                bayes.derive(state)
        state=copy.deepcopy(cases.BAYES);state["classes"][0]["count"]=3
        with self.assertRaises(ValueError):
            bayes.derive(state)
    def test_shapes_and_invalid_k(self):
        state=cases.changed(cases.NEIGHBORS,k=7)
        self.assertIsNone(nearest.derive(state)["regression"])
        for value in (0,1.5,65):
            with self.assertRaises(ValueError):
                nearest.derive(cases.changed(cases.NEIGHBORS,k=value))
        for samples in ([],[cases.NEIGHBORS["samples"][0]]*2):
            with self.assertRaises(ValueError):
                nearest.derive(cases.changed(cases.NEIGHBORS,samples=samples))
    def test_serialized_invalid_observations_reject_before_trace(self):
        for row in (None,False,1,"row",[],{},{"id":"incomplete"}):
            state=copy.deepcopy(cases.NEIGHBORS)
            state["samples"].append(row);state["k"]=7
            state=json.loads(json.dumps(state))
            with self.subTest(row=row):
                for operation in (nearest.derive,nearest.trace):
                    with self.assertRaisesRegex(ValueError,"Observation at index 6"):
                        operation(state)

    def test_wide_float_norm_and_finite_failures(self):
        self.assertEqual(common.distance([1e200],[0]),1e200)
        self.assertEqual(common.distance([1e-300],[0]),1e-300)
        with self.assertRaises(ValueError):
            common.distance([1e308],[-1e308])
        with self.assertRaises(ValueError):
            common.distance([1e308,1e308],[0,0],"L1")
        with warnings.catch_warnings():
            warnings.simplefilter("error")
            self.assertEqual(metric.summarize([1e308,1e308])["mean"],1e308)
    def test_seed_prefix_and_embedded_line_counterexample(self):
        a=metric.derive(cases.changed(cases.METRICS,dimension=1,distribution="line"))
        b=metric.derive(cases.changed(cases.METRICS,dimension=32,distribution="line"))
        self.assertEqual([r["distance"] for r in a["rows"]],[r["distance"] for r in b["rows"]])
        for i,u in enumerate(common.lcg(42),1):
            self.assertEqual(u,independent.seed_integer(42,i)/2**32)
            if i==20:
                break
    def test_zero_mean_relative_summary(self):
        a=metric.summarize([0,0])
        self.assertIsNone(a["relativeSpread"]);self.assertIsNotNone(a["reason"])
    def test_tiny_evidence_stays_defined(self):
        state=next(state for name,state in cases.states()["bayes"] if name=="tiny")
        a=bayes.derive(state)
        self.assertTrue(a["evidenceUnderflow"]);self.assertEqual([r["score"] for r in a["rows"]],[0,0])
        self.assertAlmostEqual(a["rows"][0]["posterior"],.4,places=12)
        self.assertIsNone(a["reason"])
    def test_input_and_history_detachment(self):
        for state,module in ((cases.NEIGHBORS,nearest),(cases.METRICS,metric),(cases.BAYES,bayes)):
            original=copy.deepcopy(state);trace=module.trace(state)
            self.assertEqual(original,state)
            trace[0]["state"]["provenance"]="edit" if "provenance" in state else "new"
            self.assertEqual(original,state)
            self.assertNotIn("edit",str(trace[-1]["state"]))
    def test_distinct_count_rational_tie(self):
        state=cases.changed(cases.BAYES,alpha=0,classes=[
            {"id":"A","priorWeight":1,"count":9,"positive":[1,1]},
            {"id":"B","priorWeight":1,"count":18,"positive":[2,2]}])
        a=bayes.derive(state)
        self.assertEqual([r["posterior"] for r in a["rows"]],[.5,.5])
        self.assertEqual(a["prediction"],"A");self.assertTrue(a["tiedPosterior"])
    def test_supplied_scale_components_are_strict(self):
        with self.assertRaises(ValueError):
            common.distance([1],[0],scales=None)
        for scale in (None,True,"1"):
            with self.assertRaises(ValueError):
                common.distance([1],[0],"L2",2,[scale])
    def test_tiny_and_subnormal_summary(self):
        a=metric.summarize([0,1e-200])
        self.assertEqual(a["sd"],5e-201);self.assertEqual(a["coefficientOfVariation"],1)
        smallest=float.fromhex("0x0.0000000000001p-1022")
        equal=metric.summarize([smallest,smallest])
        self.assertEqual(equal["mean"],smallest);self.assertIsNone(equal["reason"])
        mixed=metric.summarize([0,smallest])
        self.assertEqual(mixed["coefficientOfVariation"],1)
        self.assertTrue(mixed["meanUnderflow"]);self.assertTrue(mixed["sdUnderflow"])
        distinct=metric.summarize([smallest,2*smallest])
        self.assertAlmostEqual(distinct["coefficientOfVariation"],1/3,places=14)

    def test_exact_decision_ties_and_unequal_rounded_posterior(self):
        examples=dict(cases.states()["bayes"])
        for name in ("different-factor-product-tie","weighted-unsmoothed-tie","smoothed-exact-tie"):
            a=bayes.derive(examples[name])
            self.assertEqual([r["posterior"] for r in a["rows"]],[.5,.5])
            self.assertEqual(a["scoreOrder"],0);self.assertEqual(a["prediction"],"A")
        a=bayes.derive(examples["unequal-rounded-posterior"])
        self.assertEqual(a["scoreOrder"],1);self.assertEqual(a["prediction"],"A")
        self.assertFalse(a["tiedPosterior"]);json.dumps(a,allow_nan=False)
    def test_exact_tiny_summary_goldens(self):
        for c in golden.document()["summaries"]:
            a=metric.summarize(c["values"]);expected=c["expected"]
            self.assertEqual(a["mean"],expected["mean"]);self.assertEqual(a["sd"],expected["sd"])
            assert_parity(self,a,expected)

    def test_large_constant_summary_literals(self):
        for value,count in ((1e308,6),(sys.float_info.max,9)):
            values=[value]*count
            with self.subTest(value=value,count=count):
                a=metric.summarize(values)
                self.assertEqual(a["mean"],value);self.assertEqual(a["sd"],0)
                self.assertEqual(a["relativeSpread"],0);self.assertEqual(a["coefficientOfVariation"],0)
                self.assertIsNone(a["reason"])
                assert_parity(self,a,independent.summary_reference(values))
        self.assertGreater(metric.summarize([1e308,1e308*(1-sys.float_info.epsilon)])["sd"],0)

    def test_required_bayes_tuple_positions_before_trace(self):
        for j in range(2):
            for field in ("query","observed","positive-A","positive-B"):
                for missing in ("null","short"):
                    state=copy.deepcopy(cases.BAYES)
                    values=state[field] if field in ("query","observed") else state["classes"][0 if field=="positive-A" else 1]["positive"]
                    if missing=="null":
                        values[j]=None
                    else:
                        del values[j]
                    with self.subTest(field=field,position=j,missing=missing):
                        with self.assertRaises(ValueError):
                            bayes.derive(state)
                        with self.assertRaises(ValueError):
                            bayes.trace(state)

    def test_missing_and_stale_goldens_fail(self):
        with tempfile.TemporaryDirectory() as temp:
            output=Path(temp)/"test.json"
            command=[sys.executable,"-B",str(ROOT/"oracle/p03/generate_fixtures.py"),"--check","--output",str(output)]
            missing=subprocess.run(command,capture_output=True,text=True)
            self.assertNotEqual(missing.returncode,0)
            output.write_bytes(golden.serialized())
            fresh=subprocess.run(command,capture_output=True,text=True)
            self.assertEqual(fresh.returncode,0,fresh.stderr)
            output.write_text("{}")
            stale=subprocess.run(command,capture_output=True,text=True)
            self.assertNotEqual(stale.returncode,0)

if __name__=="__main__":
    unittest.main()
