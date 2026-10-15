"""Owner-only executable tests; authors must not run this file."""
import json
import subprocess
import sys
import unittest
import numpy as np
from independent import canonical, ROOT, near, verify


def request(X, k=1, normalization="sample"):
    return dict(points=[dict(id=str(i), x=list(x)) for i, x in enumerate(X)], k=k, normalization=normalization)


class PCAOracle(unittest.TestCase):
    def test_literal_fixtures(self):
        from check_fixtures import check
        self.assertEqual(check(), 10)

    def test_svd_eigh_fraction_on_asymmetric_clouds(self):
        rng = np.random.default_rng(103)  # oracle-only reproducibility, not browser data provenance
        for n in (2, 3, 7, 16):
            X = rng.normal(size=(n, 2)) @ np.array([[2, .4], [-.3, .8]]) + [2, -1]
            for normalization in ("sample", "population"):
                for k in (0, 1, 2):
                    verify(request(X, k, normalization))

    def test_translation_scale_and_row_permutation(self):
        X = np.array([[-2., -1.], [-1., -2.], [1., 2.], [2., 1.]])
        base = verify(request(X))
        moved = verify(request(X + [3, -4]))
        near(moved["covariance"], base["covariance"])
        near(moved["sse"], base["sse"])
        near(np.array([r["reconstructed"] for r in moved["rows"]]) - [3, -4], [r["reconstructed"] for r in base["rows"]])
        scaled = verify(request(3 * X))
        near(scaled["eigenvalues"], 9 * np.asarray(base["eigenvalues"]))
        near(scaled["sse"], 9 * base["sse"])
        near(verify(request(X[::-1]))["covariance"], base["covariance"])

    def test_ambiguity_is_subspace_not_orientation(self):
        X = np.array([[-1, 0], [1, 0], [0, -1], [0, 1]])
        result = verify(request(X, normalization="population"))
        self.assertTrue(result["repeated"])
        for angle in (0, .3, 1.2):
            v = np.array([np.cos(angle), np.sin(angle)])
            reconstructed = X @ np.outer(v, v)
            near(np.sum((X - reconstructed) ** 2), result["sse"])
        v = np.asarray(verify(canonical.DEFAULT)["axes"][0])
        near(np.outer(v, v), np.outer(-v, -v))

    def test_shapes_zero_one_and_exact_full_identity(self):
        for k in (0, 1, 2):
            r = verify(request([[.1, .2], [.1, .2]], k))
            self.assertIsNone(r["ratios"])
            self.assertEqual(r["sse"], 0)
            self.assertEqual(len(r["rows"][0]["scores"]), k)
        self.assertEqual(verify(request([[1, 2]]))["status"], "undefined")
        self.assertEqual(verify(request([[1, 2]], normalization="population"))["sse"], 0)
        X = [[.123456789, .7], [-.8, -.3], [.9, -.1]]
        full = verify(request(X, 2))
        self.assertEqual([r["reconstructed"] for r in full["rows"]], X)
        self.assertEqual(full["sse"], 0)

    def test_integral_numeric_configuration(self):
        for value in (1, 1.0, np.int64(1), np.float64(1)):
            self.assertEqual(canonical.pca(dict(canonical.DEFAULT, k=value))["sse"], canonical.pca(canonical.DEFAULT)["sse"])
        for value in (True, np.bool_(True), 1.5, float("nan"), float("inf"), "1", None):
            with self.assertRaises(ValueError):
                canonical.pca(dict(canonical.DEFAULT, k=value))

    def test_nonreal_coordinates_and_configuration(self):
        for value in (complex(1, 0), complex(1, 2), np.complex64(1), np.complex128(1 + 2j), np.clongdouble(1)):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    canonical.pca(dict(canonical.DEFAULT, k=value))
                for normalization in ("sample", "population"):
                    for k in (0, 2):
                        with self.assertRaises(ValueError):
                            canonical.pca(request([[value, 0]], k, normalization))

    def test_binary64_normalization_precedes_configuration_checks(self):
        # On extended-precision platforms these straddle integral bounds yet round to them in binary64.
        values = (np.nextafter(np.longdouble(1), np.longdouble(0)),
                  np.nextafter(np.longdouble(2), np.longdouble(3)),
                  np.nextafter(np.longdouble(0), np.longdouble(-1)),
                  np.longdouble("1.5"), np.int64(2))
        for value in values:
            normalized = float(value)
            with self.subTest(value=value):
                if normalized.is_integer() and 0 <= normalized <= 2:
                    actual = canonical.pca(dict(canonical.DEFAULT, k=value))
                    expected = canonical.pca(dict(canonical.DEFAULT, k=int(normalized)))
                    self.assertEqual(actual, expected)
                    self.assertEqual(len(actual["rows"][0]["scores"]), int(normalized))
                else:
                    with self.assertRaises(ValueError):
                        canonical.pca(dict(canonical.DEFAULT, k=value))
        coordinate = np.nextafter(np.longdouble(1), np.longdouble(0))
        self.assertEqual(canonical.pca(request([[coordinate, 0]], 2, "population")),
                         canonical.pca(request([[float(coordinate), 0]], 2, "population")))
        with self.assertRaises(ValueError):
            canonical.pca(dict(canonical.DEFAULT, k=10 ** 1000))
        with self.assertRaises(ValueError):
            canonical.pca(request([[10 ** 1000, 0]], 0, "population"))

    def test_oracle_verifies_normalized_extended_precision_and_typed_coordinates(self):
        values = (np.nextafter(np.longdouble(1), np.longdouble(0)),
                  np.nextafter(np.longdouble(2), np.longdouble(3)),
                  np.nextafter(np.longdouble(0), np.longdouble(-1)))
        high = np.longdouble(2 ** 53)
        typed = [[high + np.longdouble(1), np.float32(0)],
                 [high + np.longdouble(5), np.int64(0)]]
        binary64 = [[float(v) for v in x] for x in typed]
        for value in values:
            normalized = float(value)
            with self.subTest(value=value):
                if normalized.is_integer() and 0 <= normalized <= 2:
                    self.assertEqual(verify(dict(canonical.DEFAULT, k=value)),
                                     verify(dict(canonical.DEFAULT, k=int(normalized))))
                    self.assertEqual(verify(request(typed, value, "population")),
                                     verify(request(binary64, int(normalized), "population")))
                else:
                    with self.assertRaises(ValueError):
                        verify(dict(canonical.DEFAULT, k=value))

    def test_invalid_boundaries_before_degenerate_returns(self):
        invalid = [dict(canonical.DEFAULT, points=[]), dict(canonical.DEFAULT, k=3), dict(canonical.DEFAULT, normalization="invalid"),
                   request([[1]]), request([[1, 2, 3]]), request([[None, 2]]), request([[float("inf"), 0]]),
                   request([[True, 0]]), request([[1, 2]] * 129), dict(canonical.DEFAULT, points=[None]),
                   dict(canonical.DEFAULT, points=[dict(id="a", x=[1, 2]), dict(id="a", x=[1, 2])]),
                   dict(canonical.DEFAULT, points=[dict(id="", x=[1, 2])])]
        for r in invalid:
            with self.assertRaises((ValueError, TypeError)):
                canonical.pca(r)

    def test_overflow_and_unrepresentable_square(self):
        for X in ([[1e308, 0], [-1e308, 0]], [[1e200, 0], [0, 0]], [[1e-200, 0], [-1e-200, 0]]):
            with self.assertRaises(ValueError):
                canonical.pca(request(X))

    def test_energy_normalization_underflow(self):
        X = [[-2e-162, 0], [2e-162, 0]] + [[0, 0]] * 126
        with self.assertRaises(ValueError):
            canonical.pca(request(X, 0, "population"))

    def test_unresolved_scaled_eigenvector(self):
        X = [[0, 0], [1e100, 0], [-1e100, 0], [0, 1e100], [0, -1e100], [1e-100, 1e-100], [-1e-100, -1e-100]]
        with self.assertRaises(ValueError):
            canonical.pca(request(X, 1, "population"))

    def test_tiny_positive_minor_relative(self):
        r = verify(request([[-1, 0], [1, 0], [0, -1e-8], [0, 1e-8]], normalization="population"))
        near(r["eigenvalues"][1], 5e-17, atol=0, rtol=2e-12)
        self.assertGreater(r["eigenvalues"][1], 0)

    def test_actual_cli_integral_value_and_invalid_json(self):
        path = ROOT / "code/python/p06/pca.py"
        for k in (1, 1.0):
            run = subprocess.run([sys.executable, "-B", str(path)], input=json.dumps(dict(canonical.DEFAULT, k=k)), capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            near(json.loads(run.stdout)["sse"], 2)
        for raw in ('{"k":true}', '{', json.dumps(request([[None, 1]]))):
            run = subprocess.run([sys.executable, "-B", str(path)], input=raw, capture_output=True, text=True)
            self.assertEqual(run.returncode, 2)
            self.assertEqual(run.stdout, "")
            self.assertIn("error", json.loads(run.stderr))


if __name__ == "__main__":
    unittest.main()
