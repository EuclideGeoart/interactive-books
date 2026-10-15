"""Authored for owner execution only; implementation author did not run it."""
from copy import deepcopy
from fractions import Fraction as F
import json
import unittest
from check_fixtures import check, load_canonical
from independent import ROOT, exact_forward, near

canonical = load_canonical()
DATA = json.loads((ROOT / "data/p09/examples.json").read_text())


class ForwardTests(unittest.TestCase):
    def test_committed_independent_literals(self):
        self.assertEqual(check(), 18)

    def test_all_shapes_and_multiple_output_rows(self):
        s = dict(kind="network", x=[1, 2, 3], W1=[[1, -1, 2]], b1=[1], W2=[[2], [-1]], b2=[0, 3], activation="identity")
        near(canonical.forward(s), exact_forward(s), exact=True)
        self.assertEqual([r["z"] for r in canonical.forward(s)["output"]], [12, -3])
        self.assertEqual(canonical.forward(DATA["neuron"])["shapes"]["b"], [1, 1])

    def test_xor_and_independent_affine_contradiction(self):
        outputs = []
        for x in DATA["binary"]:
            s = {**DATA["network"], "x": x}
            near(canonical.forward(s), exact_forward(s), exact=True)
            outputs.append(canonical.forward(s)["output"][0]["z"])
        self.assertEqual(outputs, [0, 1, 1, 0])
        b, c1, c2 = F(0), F(1), F(1)
        self.assertEqual(c1 + c2 + b, 2)
        self.assertNotEqual(c1 + c2 + b, outputs[-1])

    def test_wrong_types_nonfinite_and_shapes(self):
        for bad in (None, [], {}, True, "network"):
            with self.subTest(request=bad), self.assertRaises(ValueError):
                canonical.forward(bad)
        for base in (DATA["neuron"], DATA["network"]):
            for key, value in base.items():
                if key in ("kind", "activation"):
                    malformed = [None, [], {}, 0, True, "unknown"]
                elif isinstance(value, list):
                    malformed = [None, [], True, "1", [None], [[1], [1, 2]]]
                else:
                    malformed = [None, True, "1", [], float("nan"), float("inf")]
                for bad in malformed:
                    with self.subTest(key=key, bad=bad), self.assertRaises(ValueError):
                        canonical.forward({**base, key: bad})
            for bad in (None, True, "1", float("nan"), float("inf"), -float("inf")):
                s = deepcopy(base); s["x"][0] = bad
                with self.subTest(coordinate=bad), self.assertRaises(ValueError):
                    canonical.forward(s)
        for key, bad in (("W1", [[1]]), ("b1", [0]), ("W2", [[1]]), ("b2", [0, 0]), ("x", [1])):
            with self.subTest(shape=key), self.assertRaises(ValueError):
                canonical.forward({**DATA["network"], key: bad})
        with self.assertRaises(ValueError):
            canonical.forward({**DATA["neuron"], "w": [1]})
        with self.assertRaises(ValueError):
            canonical.forward({**DATA["neuron"], "b": 10**400})

    def test_every_network_parameter_boundary(self):
        for key in ("W1", "W2", "b1", "b2"):
            for bad in (True, "2", None, float("nan"), float("inf")):
                s = deepcopy(DATA["network"])
                if key.startswith("W"):
                    s[key][0][0] = bad
                else:
                    s[key][0] = bad
                with self.subTest(key=key, bad=bad), self.assertRaises(ValueError):
                    canonical.forward(s)

    def test_arithmetic_overflow_and_underflow(self):
        for x, w, b in (([1e308], [2], 0), ([1e308, 1e308], [1, 1], 0), ([1e308], [1], 1e308), ([1e-300], [1e-300], 0)):
            with self.subTest(x=x, w=w, b=b), self.assertRaises(ValueError):
                canonical.forward(dict(kind="neuron", x=x, w=w, b=b, activation="relu"))
        for s in (
            dict(kind="network", x=[2], W1=[[1e308]], b1=[0], W2=[[1]], b2=[0], activation="relu"),
            dict(kind="network", x=[1], W1=[[1]], b1=[1], W2=[[1e308]], b2=[0], activation="identity"),
            dict(kind="network", x=[1], W1=[[1e-300]], b1=[0], W2=[[1e-300]], b2=[0], activation="identity"),
        ):
            with self.subTest(s=s), self.assertRaises(ValueError):
                canonical.forward(s)

    def test_valid_forward_unrepresentable_collapse(self):
        s = dict(kind="network", x=[0], W1=[[1e308]], b1=[-1], W2=[[2]], b2=[0], activation="relu")
        result = canonical.forward(s)
        self.assertEqual(result["a1"], [0])
        self.assertEqual(result["output"][0]["z"], 0)
        self.assertEqual(result["collapse"]["status"], "unrepresentable")

    def test_identity_algebra_and_binary64_are_distinct(self):
        s = dict(kind="network", x=[1], W1=[[1]], b1=[1e16], W2=[[1]], b2=[-1e16], activation="identity")
        result = canonical.forward(s)
        self.assertEqual(exact_forward(s)["output"][0]["z"], 1)
        self.assertEqual(result["output"][0]["z"], 0)
        self.assertEqual(result["collapse"]["rows"][0]["z"], 1)
        self.assertEqual(result["collapse"]["difference"], [-1])

    def test_pure_results_detached_and_input_preserved(self):
        s = deepcopy(DATA["network"]); before = deepcopy(s)
        a, b = canonical.forward(s), canonical.forward(s)
        self.assertEqual(s, before)
        a["hidden"][0]["products"][0] = 99
        s["W1"][0][0] = 44
        self.assertEqual(b["hidden"][0]["products"][0], 1)


if __name__ == "__main__":
    unittest.main()
