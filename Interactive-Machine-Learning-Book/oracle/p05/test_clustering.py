"""Owner-run canonical NumPy vs genuinely independent mathematical tests.
Authored only: no author-side execution, fixture generation or acceptance.
"""
import json
import subprocess
import sys
import unittest
import io
import runpy
from unittest.mock import patch
from copy import deepcopy
from pathlib import Path
from fractions import Fraction
from independent import expected, quadratic, global_tiny, density, initialization
from generate_fixtures import compare
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/"code/python/p05"))
import clustering as canonical
DOCUMENT = json.loads((ROOT/"fixtures/p05/clustering.json").read_text())


class ClusteringTests(unittest.TestCase):
    def test_literals_independent_and_actual_python(self):
        for case in DOCUMENT["cases"]:
            with self.subTest(case=case["name"]):
                oracle = expected(case["input"])
                compare(case["expected"], oracle)
                actual = canonical.dispatch(deepcopy(case["input"]))
                compare(actual, oracle)
                for key in ("labels", "empty", "neighborhoods", "core", "kinds", "count"):
                    if key in oracle:
                        self.assertEqual(actual[key], oracle[key])

    def test_actual_executable_dispatch(self):
        case = next(c for c in DOCUMENT["cases"] if c["name"] == "mean-update")
        output = subprocess.run([sys.executable, "-B", str(ROOT/"code/python/p05/clustering.py")], input=json.dumps(case["input"]), text=True, capture_output=True, check=True)
        compare(json.loads(output.stdout), expected(case["input"]))

    def test_cli_default_terminal_and_invalid_input(self):
        class Terminal:
            def isatty(self): return True
            def read(self): raise AssertionError("Interactive default must not wait for EOF")
        output = io.StringIO()
        with patch("sys.stdin", Terminal()), patch("sys.stdout", output):
            runpy.run_path(str(ROOT/"code/python/p05/clustering.py"), run_name="__main__")
        self.assertEqual(json.loads(output.getvalue())["proposedObjective"], 4)
        empty = subprocess.run([sys.executable,"-B",str(ROOT/"code/python/p05/clustering.py")],input="",text=True,capture_output=True)
        self.assertEqual(empty.returncode,0)
        self.assertEqual(json.loads(empty.stdout)["afterObjective"],4)
        for raw in ("{", "[]", json.dumps({"operation":"initialize","points":[],"k":1,"seed":0})):
            result = subprocess.run([sys.executable,"-B",str(ROOT/"code/python/p05/clustering.py")],input=raw,text=True,capture_output=True)
            self.assertNotEqual(result.returncode,0)
            self.assertIn("Clustering input error:",result.stderr)
            self.assertNotIn("Traceback",result.stderr)

    def test_exact_lloyd_monotonic_half_steps_and_fixed_point(self):
        state = deepcopy(DOCUMENT["cases"][0]["input"]["state"])
        frames = canonical.lloyd_trace(state)
        values = []
        for frame in frames:
            a = canonical.inspect_lloyd(frame)
            value = sum(quadratic(p["x"],frame["centers"][label],frame["scales"]) for p,label in zip(frame["points"],a["labels"]))
            self.assertEqual(float(value), a["objective"])
            values.append(value)
        self.assertEqual(values, [Fraction(8),Fraction(8),Fraction(4),Fraction(4),Fraction(4)])
        self.assertTrue(all(b <= a for a,b in zip(values,values[1:])))
        self.assertTrue(frames[-1]["stopped"])
        self.assertEqual(state["centers"], [[-3,0],[1,0]])
        self.assertIsNot(frames[0]["points"], state["points"])

    def test_local_minimum_is_not_global_optimum(self):
        case = next(c for c in DOCUMENT["cases"] if c["name"] == "horizontal-local-minimum")
        state = case["input"]["state"]
        self.assertTrue(canonical.lloyd_step(state)["stopped"])
        points = [p["x"] for p in state["points"]]
        optimum, labels = global_tiny(points, 2)
        self.assertEqual(optimum, 4)
        self.assertEqual(labels, [0,0,1,1])
        self.assertEqual(canonical.inspect_lloyd(state)["objective"], 16)

    def test_seeds_full_uint32_and_k_bounds(self):
        points = DOCUMENT["cases"][0]["input"]["state"]["points"]
        for seed in (0,7,42,2**32-1):
            for k in range(1,len(points)+1):
                request = {"points":points,"k":k,"seed":seed}
                self.assertEqual(canonical.initialize(points,k,seed), initialization(request)["centers"])
                self.assertEqual(len({tuple(c) for c in canonical.initialize(points,k,seed)}),k)
        for k in (0,5,1.5):
            with self.assertRaises(ValueError): canonical.initialize(points,k,0)
        for seed in (-1,2**32,True,1.5,"7"):
            with self.assertRaises(ValueError): canonical.initialize(points,2,seed)

    def test_permuted_labels_preserve_partition(self):
        self.assertTrue(canonical.same_partition([0,0,1,2],[2,2,0,1]))
        self.assertFalse(canonical.same_partition([0,0,1],[0,1,1]))
        with self.assertRaises(ValueError): canonical.same_partition([0],[])
        with self.assertRaises(ValueError): canonical.same_partition([-1],[-1])

    def test_actual_decimal_stage_density_and_border_traversal(self):
        points = [{"id":str(i),"x":[x,0]} for i,x in enumerate([0,.1,.2,.3,.6,2])]
        request = {"points":points,"epsilon":.31,"minPoints":4}
        compare(canonical.dispatch({"operation":"dbscan",**request}), density(request))
        self.assertEqual(canonical.dbscan(points,.31,4)["kinds"], ["core"]*4+["border","noise"])
        shared = deepcopy(next(c["input"] for c in DOCUMENT["cases"] if c["name"] == "density-shared-border"))
        first = canonical.dispatch(shared)
        self.assertEqual(first["labels"][-1], 0)
        self.assertEqual(first["count"], 2)
        # Noise visited BEFORE its adjacent core becomes border when expanded.
        border = shared["points"].pop()
        shared["points"].insert(0,border)
        compare(canonical.dispatch(shared), density(shared))
        self.assertEqual(canonical.dispatch(shared)["kinds"][0], "border")
        # Swap components: the same border now joins the opposite physical group.
        shared["points"] = shared["points"][5:9]+shared["points"][1:5]+shared["points"][:1]
        compare(canonical.dispatch(shared), density(shared))
        self.assertEqual(canonical.dispatch(shared)["labels"][-1], 0)

    def test_closed_epsilon_self_and_coincidence(self):
        points = [{"id":"a","x":[0,0]},{"id":"b","x":[1,0]}]
        self.assertEqual(canonical.dbscan(points,1,2)["labels"],[0,0])
        self.assertEqual(canonical.dbscan(points,0,1)["labels"],[0,1])
        self.assertEqual(canonical.dbscan(points,0,2)["labels"],[-1,-1])

    def test_dense_shapes_ids_and_finite_arithmetic(self):
        bad_points = [[],[{"id":"","x":[0,0]}],[{"id":"a","x":[0]}],[{"id":"a","x":[0,0,0]}],[{"id":"a","x":[True,0]}],[{"id":"a","x":["1",0]}],[{"id":"a","x":[float("nan"),0]}],[{"id":"a","x":[0,0]},{"id":"a","x":[1,0]}]]
        for points in bad_points:
            with self.subTest(points=points), self.assertRaises(ValueError): canonical.dbscan(points,1,1)
        for scales in ([0,1],[-1,1],[1], [1,float("inf")]):
            with self.assertRaises(ValueError): canonical.squared_distance([0,0],[1,0],scales)
        for a,b,s in (([1e308,0],[-1e308,0],[1,1]),([1e200,0],[0,0],[1,1]),([1,0],[0,0],[1e-300,1])):
            with self.assertRaises(ValueError): canonical.squared_distance(a,b,s)

    def test_nonzero_distance_underflow_is_rejected(self):
        for a,b,s in (([1e-200,0],[0,0],[1,1]),([5e-324,0],[0,0],[1e308,1]),([1e-200,1],[0,0],[1,1])):
            with self.assertRaisesRegex(ValueError,"underflow.*rescale"):
                canonical.squared_distance(a,b,s)
        points = [{"id":"a","x":[0,0]},{"id":"b","x":[1e-200,0]}]
        with self.assertRaisesRegex(ValueError,"underflow"):
            canonical.dbscan(points,0,2)
        self.assertEqual(canonical.squared_distance([0,0],[0,0]),0)
        # Losing a small positive square in a large nonzero sum is ordinary rounding.
        self.assertEqual(canonical.squared_distance([1e-100,1],[0,0]),1)

    def test_phase_and_assignment_boundaries(self):
        state = deepcopy(DOCUMENT["cases"][0]["input"]["state"])
        for patch in ({"labels":[]},{"centers":[]},{"phase":"unknown"},{"iteration":-1},{"stopped":1}):
            with self.assertRaises(ValueError): canonical.inspect_lloyd({**state,**patch})
        for labels in ([0],[0,0,0,2],[0,0,0,True]):
            with self.assertRaises(ValueError): canonical.inspect_lloyd({**state,"phase":"assign","labels":labels})
        with self.assertRaises(ValueError): canonical.lloyd_trace(state,101)


if __name__ == "__main__":
    unittest.main()
