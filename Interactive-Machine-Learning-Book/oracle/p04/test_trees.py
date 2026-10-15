import copy
import os
import pty
import json
import subprocess
import sys
import unittest
from pathlib import Path
from fractions import Fraction
from generate_fixtures import canonical as c, generate, CASES, expected, summarize, compare
from independent import enumerate_partitions, moments, pruning_oracle, exhaustive_tree, state_at
ROOT=Path(__file__).resolve().parents[2]

class IndependentTreeChecks(unittest.TestCase):
    def test_exhaustive_fraction_splits(self):
        rows=[dict(id=f"r{i}",x=[i,i],y=y) for i,y in enumerate([0,1,1,0])]
        splits=enumerate_partitions(rows,c.DEFAULT_OPTIONS,[0,1])
        self.assertEqual(len(splits),6)
        self.assertEqual(splits[0]["gain"],Fraction(1,6))
        best=c.best_split(c.candidates(rows,c.DEFAULT_OPTIONS))
        self.assertEqual((best["feature"],best["threshold"]),(0,.5))
    def test_literal_entropy_and_zero(self):
        o=dict(c.DEFAULT_OPTIONS,dimensions=1,criterion="entropy")
        rows=[dict(id=f"r{i}",x=[i],y=y) for i,y in enumerate([0,0,1,1,1])]
        self.assertAlmostEqual(c.stats(rows,o)["impurity"],.9709505944546686,14)
        self.assertEqual(c.stats(rows[:2],o)["impurity"],0)
        self.assertEqual(c.stats([],o)["impurity"],0)
        self.assertIsNone(c.stats([],o)["value"])
    def test_literal_regression_pruning(self):
        o=dict(c.DEFAULT_OPTIONS,dimensions=1,task="regression",criterion="sse")
        rows=[dict(id=f"r{i}",x=[i],y=y) for i,y in enumerate([1,1,5,5,5])]
        exact=moments(rows,o)
        self.assertEqual(exact["mean"],Fraction(17,5));self.assertEqual(exact["risk"],Fraction(96,5))
        t=c.train_tree(rows,o)
        self.assertEqual(c.prune_tree(t,3.84)["leaves"],1)
        self.assertEqual(c.prune_tree(t,3.84-1e-10)["leaves"],2)
        self.assertEqual(pruning_oracle(exhaustive_tree(rows,o),3.84)["leaves"],1)
    def test_closed_form_disjoint_streams(self):
        for seed in [0,7,2**32-1]:
            for depth in [0,1,3,5]:
                o=dict(c.DEFAULT_OPTIONS,mtry=1,maxDepth=depth)
                result=c.bagging(c.CLASS_ROWS,o,seed,3)
                budget=2**depth-1
                for i,t in enumerate(result["trees"]):
                    start=i*(6+budget)
                    self.assertEqual(t["bootstrapSeed"],state_at(seed,start))
                    self.assertEqual(t["featureSeed"],state_at(seed,start+6))
                    self.assertEqual(t["sample"]["indices"],[state_at(seed,start+k)*6//2**32 for k in range(1,7)])
                    self.assertLessEqual(sum(bool(n["features"]) for n in c.nodes(t["tree"])),budget)
    def test_literal_bootstrap_oob_and_empty(self):
        b=c.bootstrap(c.CLASS_ROWS,c.DEFAULT_OPTIONS,0)
        self.assertEqual(b["indices"],[1,1,4,4,2,3])
        self.assertEqual([r["count"] for r in b["counts"]],[0,2,1,1,2,0])
        self.assertEqual(b["oobIds"],["s1","s6"])
        self.assertIsNone(c.bagging(c.CLASS_ROWS[:1],c.DEFAULT_OPTIONS,7,3)["oobMetric"]["value"])
    def test_tiny_fraction_stages(self):
        o=dict(c.DEFAULT_OPTIONS,task="regression",criterion="sse",maxDepth=1)
        rows=[dict(id=f"a{i}",x=[i+1,int(i>1)],y=y) for i,y in enumerate([0,0,2,2])]
        b=c.boosting(rows,o,.5,3)
        self.assertEqual([s["lossAfter"] for s in b["stages"]],[.125,.03125,.0078125])
        self.assertEqual(b["stages"][0]["residuals"],[-1,-1,1,1])
        self.assertEqual(b["predictions"],[.125,.125,1.875,1.875])
    def test_strict_shapes_and_types(self):
        o=c.DEFAULT_OPTIONS
        for bad in [True,False,"1",float("nan"),float("inf")]:
            with self.subTest(bad=bad),self.assertRaises(ValueError):
                c.train_tree([dict(id="a",x=[1,0],y=bad)],o)
            with self.subTest(feature=bad),self.assertRaises(ValueError):
                c.train_tree([dict(id="a",x=[bad,0],y=0)],o)
        for data in [[],c.CLASS_ROWS[:2],c.CLASS_ROWS]:
            t=c.train_tree(data,o)
            for x in [[0],[0,0,0],[True,0],["0",0]]:
                with self.assertRaises(ValueError):c.predict(t,x)
        for key in ["dimensions","maxDepth","minLeaf","mtry","seed"]:
            with self.assertRaises(ValueError):c.train_tree(c.CLASS_ROWS,dict(o,**{key:True}))
    def test_missing_row_features_rejected_by_training_and_serialized_cli(self):
        o=dict(c.DEFAULT_OPTIONS,maxDepth=0)
        regression=dict(o,task="regression",criterion="sse")
        for feature in [1,0]:
            rows=copy.deepcopy(c.CLASS_ROWS)
            rows[0]["x"][feature]=None
            rows=json.loads(json.dumps(rows))  # JS array holes serialize as JSON null.
            saved=copy.deepcopy(rows)
            calls=[lambda:c.train_tree(rows,o),lambda:c.validate_rows(rows,o),
                   lambda:c.stats(rows,o),lambda:c.candidates(rows,o),
                   lambda:c.evaluate_split(rows,o,0,2.5),
                   lambda:c.bootstrap(rows,o,7,0),lambda:c.bagging(rows,o,7,0),
                   lambda:c.bagging(rows,dict(o,mtry=1),7,0),
                   lambda:c.boosting(rows,regression,.5,0)]
            for i,call in enumerate(calls):
                with self.subTest(feature=feature,boundary=i),self.assertRaisesRegex(ValueError,"Feature must be a finite number"):
                    call()
            request=dict(operation="tree",rows=rows,options=o)
            output=subprocess.run([str(ROOT/".venv/bin/python"),"-B",str(ROOT/"code/python/p04/trees_ensembles.py")],
                                  input=json.dumps(request),text=True,capture_output=True)
            self.assertEqual(output.returncode,2)
            error=json.loads(output.stdout)
            self.assertEqual(set(error),{"error"});self.assertIn("Feature must be a finite number",error["error"])
            self.assertEqual(rows,saved)
    def test_missing_query_features_rejected_at_terminal_leaves_and_serialized_cli(self):
        o=dict(c.DEFAULT_OPTIONS,maxDepth=0)
        trees=[c.train_tree([],o),c.train_tree(c.CLASS_ROWS[:2],o),
               c.train_tree(c.CLASS_ROWS,o),c.train_tree(c.CLASS_ROWS,c.DEFAULT_OPTIONS)]
        for feature in [1,0]:
            query=[1,0];query[feature]=None
            query=json.loads(json.dumps(query))
            for tree in trees:
                with self.subTest(feature=feature,reason=tree["reason"]),self.assertRaisesRegex(ValueError,"Prediction feature must be a finite number"):
                    c.predict(tree,query)
            request=dict(operation="tree",rows=c.CLASS_ROWS,options=o,probe=query)
            output=subprocess.run([str(ROOT/".venv/bin/python"),"-B",str(ROOT/"code/python/p04/trees_ensembles.py")],
                                  input=json.dumps(request),text=True,capture_output=True)
            self.assertEqual(output.returncode,2)
            error=json.loads(output.stdout)
            self.assertEqual(set(error),{"error"});self.assertIn("Prediction feature must be a finite number",error["error"])
            self.assertIsNone(query[feature])
    def test_missing_mean_observations_rejected_before_constant_shortcut(self):
        for dense in [[1,1,1],[.1,.1,.1],[1,2,3]]:
            for index in [1,0,2]:
                values=list(dense);values[index]=None
                values=json.loads(json.dumps(values))
                with self.subTest(dense=dense,index=index),self.assertRaisesRegex(ValueError,"mean must be a finite number"):
                    c.finite_mean(values,"mean")
                self.assertIsNone(values[index])
    def test_binary64_normalization_and_integer_floats(self):
        rows=[dict(id=f"r{i}",x=[2**53+i],y=y) for i,y in enumerate([0,1,1])]
        saved=copy.deepcopy(rows)
        o=dict(c.DEFAULT_OPTIONS,dimensions=1.0,maxDepth=3.0,minLeaf=1.0,mtry=0.0,seed=7.0)
        t=c.train_tree(rows,o)
        self.assertEqual(t["split"]["leftIds"],t["left"]["rowIds"])
        self.assertEqual(t["split"]["rightIds"],t["right"]["rowIds"])
        self.assertEqual(t["left"]["rowIds"],["r0","r1"])
        self.assertEqual(rows,saved)
        self.assertEqual(len(c.bootstrap(rows,o,7.0,3.0)["indices"]),3)
        self.assertEqual(len(c.bagging(rows,o,7.0,2.0)["trees"]),2)
        r=dict(o,task="regression",criterion="sse")
        self.assertEqual(len(c.boosting(rows,r,.5,2.0)["stages"]),2)
    def test_actual_canonical_cli(self):
        request=CASES[0]
        output=subprocess.run([str(ROOT/".venv/bin/python"),"-B",str(ROOT/"code/python/p04/trees_ensembles.py")],
                              input=json.dumps(request),text=True,capture_output=True,check=True)
        compare(expected(request),summarize(request,json.loads(output.stdout)),"canonical process")
        bad=dict(request,probe=[0]*(request["options"]["dimensions"]+1))
        output=subprocess.run([str(ROOT/".venv/bin/python"),"-B",str(ROOT/"code/python/p04/trees_ensembles.py")],
                              input=json.dumps(bad),text=True,capture_output=True)
        self.assertEqual(output.returncode,2);self.assertIn("declared",json.loads(output.stdout)["error"])
    @unittest.skipUnless(os.name == "posix", "Interactive terminal proof uses POSIX PTY.")
    def test_bare_command_chooses_default_without_waiting_for_terminal_eof(self):
        master,slave=pty.openpty()
        process=None
        try:
            process=subprocess.Popen([str(ROOT/".venv/bin/python"),"-B",str(ROOT/"code/python/p04/trees_ensembles.py")],
                                     stdin=slave,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
            os.close(slave);slave=None
            # Keep master open: no EOF is sent. The documented bare command
            # must choose its demonstration while stdin remains a real TTY.
            out,err=process.communicate(timeout=4)
            self.assertEqual(process.returncode,0,err)
            request=next(r for r in CASES if r["name"]=="boosting")
            compare(expected(request),summarize(request,json.loads(out)),"TTY default")
        finally:
            if process is not None and process.poll() is None:
                process.kill();process.communicate()
            if slave is not None:os.close(slave)
            os.close(master)
    def test_exact_decimal_constant_mean_ensemble_oob_and_boosting(self):
        rows=[dict(id=f"d{i}",x=[i],y=.1) for i in range(3)]
        o=dict(c.DEFAULT_OPTIONS,dimensions=1,task="regression",criterion="sse")
        exact=moments(rows,o)
        self.assertEqual(exact["mean"],Fraction(.1));self.assertEqual(exact["risk"],0)
        t=c.train_tree(rows,o)
        self.assertEqual(t["stats"]["mean"],.1);self.assertEqual(t["stats"]["risk"],0)
        self.assertIsNone(t["split"])
        b=c.boosting(rows,o,.5,3)
        self.assertEqual(b["baseline"],.1);self.assertEqual(b["loss"]["value"],0)
        self.assertEqual(b["predictions"],[.1]*3)
        self.assertTrue(all(s["residuals"]==[0]*3 for s in b["stages"]))
        e=c.bagging(rows,o,7,3)
        self.assertEqual([p["value"] for p in e["predictions"]],[.1]*3)
        self.assertGreater(e["eligible"],0);self.assertEqual(e["oobMetric"]["value"],0)
        for p in e["oob"]:
            if p["value"] is not None:self.assertEqual(p["value"],.1)
        close=[dict(rows[0]),dict(rows[1],y=.10000000000000006)]
        t=c.train_tree(close,o)
        self.assertIsNotNone(t["split"]);self.assertGreater(t["stats"]["risk"],0)
        self.assertEqual(t["stats"]["risk"],float(moments(close,o)["risk"]))
        # The constant shortcut never attempts an overflowing sum; genuinely
        # varying overflowing sums/SSE still fail rather than becoming infinity.
        self.assertEqual(c.finite_mean([1e308]*3,"large constant"),1e308)
        with self.assertRaises(ValueError):c.finite_mean([1e308,9e307],"overflow")
    def test_fresh_independent_cases(self):
        self.assertEqual(len(generate()["cases"]),23)

if __name__=="__main__":unittest.main(verbosity=2)
