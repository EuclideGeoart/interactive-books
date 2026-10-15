"""Owner-only authored tests. IMPLEMENTER MUST NOT EXECUTE."""
import copy
from fractions import Fraction as F
import json
import math
import subprocess
import sys
import unittest
import numpy as np
from independent import ROOT, canonical, near, verify_experiment, verify_fit, verify_metrics, verify_split, closed_states


class EvaluationOracle(unittest.TestCase):
    def test_hand_literals(self):
        from check_fixtures import check
        self.assertEqual(check(), 6)

    def test_group_folds_and_closed_form_lcg(self):
        for seed in (0, 7, 31, 2**32-1):
            for folds in (2, 3, 4):
                verify_split(canonical.DATA["rows"], seed, folds)
        self.assertEqual(closed_states(0, 1), [1013904223])
        self.assertEqual(canonical.experiment(canonical.DEFAULT), canonical.experiment(copy.deepcopy(canonical.DEFAULT)))

    def test_all_fits_nested_curves_and_parameters(self):
        for seed in (0, 7, 103):
            for folds in (2, 3, 4):
                verify_experiment(dict(canonical.DEFAULT, seed=seed, folds=folds))

    def test_test_mutation_independence(self):
        base = canonical.experiment(canonical.DEFAULT)
        changed = copy.deepcopy(canonical.DEFAULT)
        for row in changed["rows"]:
            if row["id"] in base["board"]["test"]:
                row.update(x=[20], y=-20)
        actual = verify_experiment(changed)
        for key in ("board", "candidates", "selected", "curves", "final", "leakage"):
            self.assertEqual(base[key], actual[key], key)
        self.assertNotEqual(base["test"], actual["test"])

    def test_heldout_feature_does_not_fit_proper_transform(self):
        request = copy.deepcopy(canonical.DEFAULT)
        board = canonical.split(request["rows"], request["seed"], request["folds"])
        T, V = board["folds"][0]["train"], board["folds"][0]["validation"]
        proper = canonical.fit(request["rows"], T, 1, 1)
        leaked = canonical.fit(request["rows"], T, 1, 1, T+V)
        for row in request["rows"]:
            if row["id"] in V:
                row["x"] = [20]
        self.assertEqual(proper, canonical.fit(request["rows"], T, 1, 1))
        self.assertNotEqual(leaked["preprocessing"], canonical.fit(request["rows"], T, 1, 1, T+V)["preprocessing"])

    def test_constant_identification_and_exact_ties(self):
        request = copy.deepcopy(canonical.DEFAULT)
        for r in request["rows"]:
            r.update(x=[1], y=2)
        result = verify_experiment(request)
        self.assertEqual(result["selected"], dict(power=1, penalty=0))
        self.assertTrue(result["final"]["preprocessing"]["constant"])
        self.assertEqual(result["final"]["slope"], 0)
        self.assertEqual(result["test"]["mse"], 0)

    def test_metrics_all_cutoffs_bin_edges_missing_classes(self):
        rows = canonical.DATA["probabilities"]
        for threshold in (0, .2, .4, .5, .6, .8, .9, 1):
            verify_metrics(rows, threshold)
        edge = [dict(id=str(i), p=p, y=i % 2) for i, p in enumerate((0, .2, .4, .6, .8, 1))]
        actual = verify_metrics(edge, .5)
        self.assertEqual([b["count"] for b in actual["bins"]], [1, 1, 1, 1, 2])
        for y in (0, 1):
            single = verify_metrics([dict(id="only", y=y, p=.5)], 1)
            self.assertIsNone(single["balancedAccuracy"])
            self.assertIsNone(single["precision"])
        all_negative = verify_metrics([dict(id="only", y=0, p=.2)], .5)
        self.assertIsNone(all_negative["recall"]); self.assertIsNone(all_negative["f1"])

    def test_binary64_independent_rounding_and_conditioning(self):
        result = canonical.numerics(1e8, 1e-8)
        huge = F.from_float(1e16)
        exact_inner = -huge+1
        rounded_inner = F.from_float(float(exact_inner))
        self.assertEqual(result["left"], float(huge-huge+1))
        self.assertEqual(result["right"], float(huge+rounded_inner))
        self.assertEqual(result["fragile"], 0)
        # Decimal high precision is independent of fragile binary64 root subtraction.
        from decimal import Decimal, localcontext
        with localcontext() as context:
            context.prec = 70
            t = Decimal(100000000)
            exact = 1 / ((t*t+1).sqrt()+t)
            near(result["stable"], float(exact), atol=0, rtol=2e-12)
        a = F.from_float(1+1e-8)
        spacing = a-1
        self.assertEqual(result["difference"], float(spacing))
        near(result["reciprocal"], float(1/spacing))
        near(result["condition"], float((abs(a)+1)/abs(spacing)))
        self.assertGreater(result["condition"], 1e8)
        self.assertNotEqual(result["reciprocal"], result["nominalReciprocal"])

    def test_unavailable_numeric_states(self):
        all_missing = copy.deepcopy(canonical.DEFAULT)
        for r in all_missing["rows"]:
            r["x"] = [None]
        with self.assertRaises(ValueError):
            canonical.experiment(all_missing)
        for magnitude in (1e200, 1e-200):
            rows = [dict(id="a", group="a", x=[-magnitude], y=0), dict(id="b", group="b", x=[magnitude], y=1)]
            with self.assertRaises(ValueError):
                canonical.fit(rows, ["a", "b"], 1, 1)

    def test_invalid_boundary_inputs(self):
        for field, values in {"seed": [True, -1, 2**32, .5, "7", None], "folds": [True, 1, 5, 2.5],
                              "threshold": [True, -1, 2, float("inf")], "phase": [True, -1, 5],
                              "t": [True, 0, float("nan")], "delta": [True, 0, .2]}.items():
            for value in values:
                with self.subTest(field=field, value=value):
                    with self.assertRaises(ValueError):
                        canonical.experiment(dict(canonical.DEFAULT, **{field: value}))
        for change in (dict(x=[]), dict(x=[1, 2]), dict(x=[True]), dict(x=[float("nan")]), dict(y=True), dict(id=""), dict(group="")):
            request = copy.deepcopy(canonical.DEFAULT); request["rows"][0].update(change)
            with self.assertRaises(ValueError):
                canonical.experiment(request)
        request = copy.deepcopy(canonical.DEFAULT); request["rows"][1]["id"] = request["rows"][0]["id"]
        with self.assertRaises(ValueError):
            canonical.experiment(request)
        for rows in ([], [None], [dict(id="x", y=True, p=.5)], [dict(id="x", y=1, p=True)]):
            with self.assertRaises((ValueError, TypeError)):
                canonical.metrics(rows, .5)
        for value in (True, np.bool_(True), np.complex64(1), 10**1000):
            with self.assertRaises(ValueError):
                canonical.number(value)

    def test_actual_canonical_cli_and_error_exit(self):
        run = subprocess.run([sys.executable, "-B", str(ROOT / "code/python/p08/evaluation.py")], input=json.dumps(canonical.DEFAULT), text=True, capture_output=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(json.loads(run.stdout), canonical.experiment(canonical.DEFAULT))
        bad = subprocess.run([sys.executable, "-B", str(ROOT / "code/python/p08/evaluation.py")], input='{"seed":true}', text=True, capture_output=True)
        self.assertNotEqual(bad.returncode, 0); self.assertEqual(bad.stdout, "")


if __name__ == "__main__":
    unittest.main()
