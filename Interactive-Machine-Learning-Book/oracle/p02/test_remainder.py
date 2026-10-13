"""Part-local oracle self-tests for the integrator's serialized numerical validation."""
import json
import subprocess
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "code/python/p02"))
import fit_reference as fit
import classification_reference as classification
from remainder_math import difference, robust_fit, ranking_auc, literal_counts


class RemainderOracleTests(unittest.TestCase):
    def test_numpy_lstsq_independent_rank_scale_and_wide_challenges(self):
        # Seed applies only to these generated self-test cases, never to the hand-authored lesson data.
        rng = np.random.default_rng(20261013)
        for n, d in [(1, 7), (2, 7), (7, 7), (16, 4), (64, 7)]:
            for scale in (1e-80, 1., 1e80):
                A = rng.normal(size=(n, d)) * scale
                y = rng.normal(size=n) * scale
                expected = robust_fit(A.tolist(), y.tolist())
                actual = fit.least_norm(A.tolist(), y.tolist())
                np.testing.assert_allclose(actual["weights"], expected["weights"], atol=2e-9, rtol=2e-9)
                self.assertEqual(actual["rank"], expected["rank"])
        for epsilon in (0, 1e-12, 1e-6):
            A = [[1., 1.], [1., 1. + epsilon], [1., 1. - epsilon]]
            expected, actual = robust_fit(A, [2., 2., 2.]), fit.least_norm(A, [2., 2., 2.])
            np.testing.assert_allclose(actual["weights"], expected["weights"], atol=2e-9, rtol=2e-9)
            self.assertEqual(actual["rank"], expected["rank"])

    def test_centered_difference_regression_gradient(self):
        X = np.array([[1., -.7, 1.2], [1., .4, -.2], [1., 1.1, .3]])
        y, w = np.array([.2, -1., .7]), np.array([.3, -.4, .2])
        actual = fit.linear(X.tolist(), y.tolist(), w.tolist())
        expected = difference(lambda v: np.mean((X @ v - y) ** 2), w)
        np.testing.assert_allclose(actual["gradient"], expected, atol=2e-7, rtol=2e-7)

    def test_centered_difference_logistic_gradient(self):
        X = np.array([[1., -.7], [1., .4], [1., 1.1]])
        y, w = np.array([1., 0., 1.]), np.array([.3, -.4])
        # Library logaddexp is a distinct scalar-loss expression, independent of canonical bce().
        expected = difference(lambda v: np.mean(np.logaddexp(0, X @ v) - y * (X @ v)), w)
        actual = classification.logistic(X.tolist(), y.tolist(), w.tolist(), .2)
        np.testing.assert_allclose(actual["gradient"], expected, atol=2e-7, rtol=2e-7)

    def test_centered_difference_softmax_gradient_and_shift(self):
        X = np.array([[1., -.7], [1., .4], [1., 1.1]])
        y = [2, 0, 1]
        W = np.array([[.3, -.4, .2], [.2, .1, -.3]])
        def cost(weights):
            z = X @ weights
            return np.mean(np.logaddexp.reduce(z, axis=1) - z[np.arange(3), y])
        expected = difference(cost, W)
        actual = classification.multiclass(X.tolist(), y, W.tolist(), .2)
        np.testing.assert_allclose(actual["gradient"], expected, atol=2e-7, rtol=2e-7)
        shifted = classification.multiclass(X.tolist(), y, W.tolist(), .2, 1000)
        np.testing.assert_allclose(shifted["probabilities"], actual["probabilities"], atol=2e-13, rtol=2e-13)
        self.assertAlmostEqual(shifted["loss"], actual["loss"], places=12)

    def test_extreme_logits_are_finite_and_wrong_predictions_cost_1000_or_2000(self):
        for z, y, expected in [(1000, 0, 1000), (-1000, 1, 1000), (1000, 1, 0), (-1000, 0, 0)]:
            self.assertEqual(classification.bce(z, y), expected)
            self.assertEqual(classification.bce(z, y), float(np.logaddexp(0, z) - z * y))
        result = classification.multiclass([[1]], [2], [[1000, 0, -1000]], .2)
        self.assertEqual(result["loss"], 2000)
        self.assertEqual(sum(result["probabilities"][0]), 1)

    def test_literal_counts_denominators_and_pairwise_auc(self):
        scores, y = [.9, .8, .8, .4, .1], [1, 0, 1, 0, 1]
        result = classification.confusion(scores, y, .8)
        self.assertEqual([result[k] for k in ("tp", "fp", "tn", "fn")], [2, 1, 1, 1])
        self.assertEqual(ranking_auc(scores, y), 7 / 12)
        self.assertAlmostEqual(classification.roc(scores, y)["auc"]["value"], 7 / 12)
        self.assertEqual(len(classification.roc(scores, y)["points"]), 5)
        for labels in ([0, 0], [1, 1]):
            sweep = classification.roc([.2, .7], labels)
            self.assertIsNone(sweep["auc"]["value"])
        empty_positive = classification.confusion([1, 0], [0, 0], None)
        for key in ("precision", "recall", "f1"):
            self.assertIsNone(empty_positive[key]["value"])
            self.assertTrue(empty_positive[key]["reason"])

    def test_ridge_64_observations_and_lasso_kkt(self):
        X = [[1, -1 if i % 2 == 0 else 1] for i in range(64)]
        y = [5 + 2 * row[1] for row in X]
        ridge = fit.regularized(X, y, 2, "l2", False)
        np.testing.assert_allclose(ridge["weights"], [5, 2 / 3], atol=1e-12, rtol=1e-12)
        for kind in ("l1", "l2"):
            result = fit.regularized([[1, -1], [1, 1]], [3, 7], 2, kind, False)
            self.assertLessEqual(result["kkt"], 1e-8)
        self.assertEqual(fit.regularized([[1, -1], [1, 1]], [3, 7], 4, "l1", False)["weights"], [5, 0])

    def test_public_validation_shapes_and_failures(self):
        for X, y in [([], []), ([[1], [1, 2]], [0, 0]), ([[True]], [0]), ([[float("inf")]], [0]), ([[1]] * 65, [0] * 65)]:
            with self.assertRaises(ValueError): fit.least_norm(X, y)
        for labels in [[.5], [2], [-1], [True]]:
            with self.assertRaises(ValueError): classification.logistic([[1]], labels, [0], .1)
        for logits in [[], [1], [float("nan"), 0]]:
            with self.assertRaises(ValueError): classification.softmax(logits)
        with self.assertRaises(ValueError): classification.multiclass([[1, 2]], [0], [[1, 2, 3]], .1)

    def test_execute_real_canonical_sources(self):
        # Execute the imported learner files, not a paraphrased test copy.
        for filename, key in [("fit_reference.py", "closedForm"), ("classification_reference.py", "logisticTrace")]:
            result = subprocess.run([sys.executable, "-B", str(ROOT / "code/python/p02" / filename)], capture_output=True, text=True, check=True)
            payload = json.loads(result.stdout)
            self.assertIn(key, payload)
        payload = json.loads(subprocess.check_output([sys.executable, "-B", str(ROOT / "code/python/p02/fit_reference.py")], text=True))
        self.assertEqual(payload["closedForm"]["weight"], 1.8)


if __name__ == "__main__":
    unittest.main()
