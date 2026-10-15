"""Owner-only tests of actual canonical Python and independent optimization."""
import json
import math
import subprocess
import sys
import unittest
import numpy as np
from independent import canonical, ROOT, near, verify, gram, active_dual, exact_hard_feasibility


def request(X, y, mode="soft", C=1, kind="linear", gamma=1, coef0=1, degree=2):
    return dict(mode=mode, C=C, kernel=dict(kind=kind, gamma=gamma, coef0=coef0, degree=degree), points=[dict(id=str(i), x=list(x), y=label) for i, (x, label) in enumerate(zip(X, y))])


class SVMOracle(unittest.TestCase):
    def test_all_literal_scenarios(self):
        from check_fixtures import check
        self.assertEqual(check(), 10)

    def test_analytic_anchor_soft_regimes(self):
        for C in (.01, .1, .25, .5, 1, 20):
            r = verify(request([[-1, 0], [1, 0]], [-1, 1], C=C))
            w = min(2 * C, 1)
            near(r["w"], [w, 0])
            near(r["primal"], .5 * w * w + 2 * C * max(0, 1 - w))
            near(r["alpha"], [min(C, .5)] * 2)

    def test_hard_translation_rotation_and_redundancy(self):
        X = np.array([[-1, -1], [-1, 1], [1, 0.]])
        for angle in (0, .4, 1.2):
            rotation = np.array([[math.cos(angle), -math.sin(angle)], [math.sin(angle), math.cos(angle)]])
            for shift in ([0, 0], [.3, -.5]):
                r = verify(request(X @ rotation.T + shift, [-1, -1, 1], mode="hard"))
                near(r["w"], rotation @ [1, 0])
                near(r["b"], -np.asarray(r["w"]) @ shift)
                near(r["primal"], .5)
        r = verify(request([[-1, 0], [-1, 0], [1, 0]], [-1, -1, 1], mode="hard"))
        self.assertTrue(all(row["onMargin"] for row in r["rows"]))
        self.assertTrue(any(not row["support"] for row in r["rows"]))

    def test_hard_crossing_containment_touching_and_collinear(self):
        cases = [([[-2, 0], [2, 0], [0, -2], [0, 2]], [-1, -1, 1, 1]),
                 ([[-2, -2], [2, -2], [0, 2], [0, 0]], [-1, -1, -1, 1]),
                 ([[-1, 0], [0, 0], [0, 0], [1, 0]], [-1, -1, 1, 1])]
        for X, y in cases:
            r = verify(request(X, y, mode="hard"))
            self.assertEqual(r["status"], "infeasible")
        verify(request([[-3, 0], [-1, 0], [1, 0], [3, 0]], [-1, -1, 1, 1], mode="hard"))

    def test_exact_feasibility_distinguishes_cancelled_determinant_from_overlap(self):
        review = json.loads((ROOT / "fixtures/p07/review-regressions.json").read_text())
        s = review["orientation"]["input"]
        from fractions import Fraction
        e = Fraction(1, 2 ** 52)
        A, B, P = [[Fraction.from_float(float(v)) for v in p["x"]] for p in s["points"]]
        determinant = (B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0])
        self.assertEqual(determinant, e * e)
        self.assertEqual(canonical.orientation(*[p["x"] for p in s["points"]]), 1)
        self.assertTrue(exact_hard_feasibility(s)["feasible"])
        try:
            r = canonical.svm(s)
        except ValueError as error:
            self.assertRegex(str(error), "unresolved|representable|underflow|negative")
        else:
            self.assertEqual(r["status"], "failed")
        unavailable = verify(s)
        self.assertTrue(unavailable is None or unavailable["status"] == "failed")
        touching = request([[-1, 0], [0, 0], [0, 0], [1, 0]], [-1, -1, 1, 1], mode="hard")
        proof = exact_hard_feasibility(touching)
        self.assertFalse(proof["feasible"])
        self.assertGreater(proof["contradiction"], 0)
        self.assertTrue(all(v >= 0 for v in proof["multipliers"]))
        self.assertTrue(exact_hard_feasibility(request([[-2, 0], [-1, 0], [1, 0]], [-1, -1, 1], mode="hard"))["feasible"])
        self.assertEqual(canonical.orientation([0., 0.], [1., 1.], [2., 2.]), 0)
        smallest = float.fromhex("0x0.0000000000001p-1022")
        self.assertEqual(canonical.orientation([0., 0.], [smallest, 0.], [0., smallest]), 1)

    def test_unconditional_gain_stop_diagnostic_failure_rejects_predictions(self):
        case = json.loads((ROOT / "fixtures/p07/review-regressions.json").read_text())["diagnosticFailure"]
        s = case["input"]
        near(gram(s), case["gram"], atol=0, rtol=0)
        r = canonical.svm(s)
        self.assertEqual(r["status"], "failed")
        near(r["gram"], case["gram"], atol=0, rtol=0)
        self.assertGreater(r["kkt"], case["kktLowerBound"])
        self.assertLess(r["iterations"], canonical.MAX_STEPS)
        with self.assertRaises(ValueError):
            canonical.decision(s, r, [0, 0])

    def test_flat_curvature_endpoint_is_not_skipped(self):
        for C in (.01, .25, 1, 20):
            r = verify(request([[0, 0], [0, 0]], [-1, 1], C=C))
            near(r["alpha"], [C, C])
            near(r["primal"], 2 * C)
            self.assertIsNone(r["halfMargin"])
            near(r["b"], 0)

    def test_independent_active_set_outlier_and_overlap(self):
        X, y = [[-2, -1], [-1, 1], [1, -1], [2, 1], [-2, 2]], [-1, -1, 1, 1, 1]
        fits = [verify(request(X, y, C=C)) for C in (.05, .25, 1, 4)]
        self.assertGreater(np.linalg.norm(np.asarray(fits[0]["w"]) - fits[-1]["w"]), 1e-3)
        for a, b in zip(fits, fits[1:]):
            self.assertGreaterEqual(sum(row["hinge"] for row in a["rows"]) + 2e-5, sum(row["hinge"] for row in b["rows"]))
        verify(request([[-2, 0], [2, 0], [0, -2], [0, 2]], [-1, -1, 1, 1]))

    def test_supported_grams_psd_and_literal_entries(self):
        X, y = [[-1, .5], [.3, -2], [2, 1], [-.2, .1]], [-1, -1, 1, 1]
        for kind in ("linear", "polynomial", "rbf"):
            for gamma in (.05, 1, 2):
                for degree in (1, 2, 3, 4):
                    s = request(X, y, mode="kernel", kind=kind, gamma=gamma, degree=degree)
                    near(canonical.svm(s)["gram"], gram(s))
        a, b = [1, 0], [0, 1]
        near(canonical.kernel_value(a, b, dict(kind="rbf", gamma=1, degree=2, coef0=1)), math.exp(-2))

    def test_polynomial_feature_map_reconstruction_and_nonunique_alpha(self):
        X, y = [[-1, -1], [1, 1], [-1, 1], [1, -1]], [1, 1, -1, -1]
        s = request(X, y, mode="kernel", C=4, kind="polynomial", coef0=0)
        r = verify(s)
        phi = np.array([[x[0] ** 2, math.sqrt(2) * x[0] * x[1], x[1] ** 2] for x in X])
        feature_w = phi.T @ (np.asarray(r["alpha"]) * y)
        near(feature_w, [0, 1 / math.sqrt(2), 0])
        for x in ([.25, .5], [-.25, .5], [0, 1]):
            explicit = np.asarray([x[0] ** 2, math.sqrt(2) * x[0] * x[1], x[1] ** 2]) @ feature_w + r["b"]
            reconstructed = sum(a * label * canonical.kernel_value(p, x, s["kernel"]) for a, label, p in zip(r["alpha"], y, X)) + r["b"]
            near(reconstructed, explicit)
            near(canonical.decision(s, r, x), explicit)
            near(reconstructed, x[0] * x[1])
        self.assertTrue(all(row["signedDistance"] is None for row in r["rows"]))

    def test_rbf_analytic_xor_and_queries(self):
        X, y = [[-1, -1], [1, 1], [-1, 1], [1, -1]], [1, 1, -1, -1]
        s = request(X, y, mode="kernel", C=4, kind="rbf")
        r = verify(s)
        a = math.exp(-4)
        near(r["primal"], 2 / (1 - a) ** 2, atol=1e-5, rtol=1e-5)
        near(r["b"], 0, atol=2e-5)
        # Symmetric analytic coefficients give independent off-training scores.
        for x in ([.5, .5], [-.5, .5], [0, 0], [2, .2]):
            expected = sum(label * math.exp(-sum((p[j] - x[j]) ** 2 for j in range(2))) for p, label in zip(X, y)) / (1 - a) ** 2
            actual = sum(alpha * label * canonical.kernel_value(p, x, s["kernel"]) for p, label, alpha in zip(X, y, r["alpha"])) + r["b"]
            near(actual, expected, atol=2e-5, rtol=2e-5)
            near(canonical.decision(s, r, x), expected, atol=2e-5, rtol=2e-5)

    def test_hinge_kink_and_one_sided_derivatives(self):
        for m in (-2, .5, 1, 2):
            h = canonical.hinge(m)
            self.assertEqual(h["subgradient"], -1 if m < 1 else 0)
            self.assertEqual(h["loss"], max(0, 1 - m))
        step = 1e-6
        near((canonical.hinge(1)["loss"] - canonical.hinge(1 - step)["loss"]) / step, -1, atol=1e-9)
        near((canonical.hinge(1 + step)["loss"] - canonical.hinge(1)["loss"]) / step, 0)

    def test_reject_shapes_bool_complex_nonfinite_and_config(self):
        s = canonical.DEFAULT
        cases = [dict(s, points=[]), dict(s, points=[None, None]), dict(s, points=[dict(id="a", x=[1], y=-1), s["points"][1]]),
                 dict(s, points=[dict(id="a", x=[1, 2, 3], y=-1), s["points"][1]]),
                 dict(s, points=[dict(s["points"][0], id="b"), s["points"][1]]),
                 dict(s, points=[dict(s["points"][0], id=" "), s["points"][1]]),
                 dict(s, points=[dict(s["points"][0], y=1), s["points"][1]])]
        for value in (True, np.bool_(True), None, "1", complex(1, 0), float("inf"), float("nan"), 10 ** 1000):
            cases.extend([dict(s, C=value), dict(s, points=[dict(s["points"][0], x=[value, 0]), s["points"][1]]), dict(s, points=[dict(s["points"][0], y=value), s["points"][1]])])
        for change in (dict(kind="other"), dict(gamma=0), dict(gamma=3), dict(coef0=-1), dict(degree=1.5), dict(degree=True)):
            cases.append(dict(s, kernel=dict(s["kernel"], **change)))
        for bad in cases:
            with self.subTest(bad=bad), self.assertRaises((ValueError, TypeError)):
                canonical.svm(bad)

    def test_public_kernel_validates_both_query_vectors_and_complete_config(self):
        bad_vectors = (None, [], [0], [0, 0, 0], [True, 0], [np.bool_(False), 0],
                       [None, 0], ["0", 0], [complex(0, 0), 0],
                       [float("nan"), 0], [float("inf"), 0],
                       [-6.0001, 0], [6.0001, 0], [0, -6.0001], [0, 6.0001])
        for kind in ("linear", "polynomial", "rbf"):
            k = dict(kind=kind, gamma=1, coef0=1, degree=2)
            for vector in bad_vectors:
                for a, b in ((vector, [0, 0]), ([0, 0], vector)):
                    with self.subTest(kind=kind, a=a, b=b), self.assertRaises(ValueError):
                        canonical.kernel_value(a, b, k)
            changes = (dict(kind="unknown"), dict(kind=True), dict(gamma=True),
                       dict(gamma=np.bool_(True)), dict(gamma=None), dict(gamma="1"),
                       dict(gamma=0), dict(gamma=2.001), dict(gamma=float("nan")),
                       dict(coef0=True), dict(coef0=-.001), dict(coef0=2.001),
                       dict(degree=True), dict(degree=1.5), dict(degree=0),
                       dict(degree=5), dict(degree=float("inf")))
            bad_configs = [None, {}, *[dict(k, **change) for change in changes]]
            bad_configs.extend({key: value for key, value in k.items() if key != omitted}
                               for omitted in ("kind", "gamma", "coef0", "degree"))
            for config in bad_configs:
                with self.subTest(kind=kind, config=config), self.assertRaises(ValueError):
                    canonical.kernel_value([0, 0], [0, 0], config)
            expected = 0 if kind == "linear" else 1 if kind == "polynomial" else math.exp(-72)
            near(canonical.kernel_value([-6, 0], [0, 6], k), expected, atol=0, rtol=2e-10)
            near(canonical.kernel_value([6, 0], [0, -6], dict(k, degree=2.0)), expected, atol=0, rtol=2e-10)

    def test_public_prediction_rejects_failed_fits_and_bad_query_shapes(self):
        s = canonical.DEFAULT
        r = canonical.svm(s)
        for x in ([0], [0, 1, 2], [True, 0], [None, 0], [float("inf"), 0], [7, 0]):
            with self.assertRaises((ValueError, TypeError)):
                canonical.decision(s, r, x)
        failed = canonical.svm(request([[0, 0], [0, 0]], [-1, 1], mode="hard"))
        with self.assertRaises(ValueError):
            canonical.decision(s, failed, [0, 0])

    def test_binary64_interpretation_and_underflow(self):
        for C in (np.int64(1), np.float64(.25), np.longdouble(.25)):
            r = canonical.svm(dict(canonical.DEFAULT, mode="soft", C=C))
            near(r["primal"], .5 if C == 1 else .375)
        with self.assertRaises(ValueError):
            canonical.svm(request([[-1e-200, 0], [1e-200, 0]], [-1, 1], mode="hard"))
        with self.assertRaises(ValueError):
            canonical.svm(request([[-1e-200, 0], [1e-200, 0]], [-1, 1], mode="kernel", kind="rbf"))

    def test_real_cli_and_structured_errors(self):
        path = ROOT / "code/python/p07/svm.py"
        result = subprocess.run([sys.executable, "-B", str(path)], input=json.dumps(canonical.DEFAULT), text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        near(json.loads(result.stdout)["primal"], .5)
        for raw in ('{', '{"C":true}', json.dumps(dict(canonical.DEFAULT, C=True))):
            r = subprocess.run([sys.executable, "-B", str(path)], input=raw, text=True, capture_output=True)
            self.assertEqual(r.returncode, 2)
            self.assertEqual(r.stdout, "")
            self.assertIn("error", json.loads(r.stderr))


if __name__ == "__main__":
    unittest.main()
