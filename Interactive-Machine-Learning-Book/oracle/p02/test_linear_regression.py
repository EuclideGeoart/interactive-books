"""Focused independent literals, NumPy comparison, input boundaries and fixture checks."""
from contextlib import redirect_stderr, redirect_stdout
from copy import deepcopy
from fractions import Fraction as F
from io import StringIO
import json
import math
from pathlib import Path
import random
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import generate_fixtures as fixtures
import linear_regression as reference
import linear_regression_oracle as oracle


def single(x, y, weight=0, bias=0, rate=0.1):
    return dict(samples=[dict(id="only", x=x, y=y)], weight=weight, bias=bias, learningRate=rate)


class LinearRegressionTests(unittest.TestCase):
    def test_independent_rational_literals(self):
        oracle.literal_self_tests()
        state = dict(samples=[dict(id="a", x=-2, y=1), dict(id="b", x=1, y=4)],
                     weight=F(1, 2), bias=-1, learningRate=F(1, 5))
        result = oracle.derive(state)
        self.assertEqual(result["mse"], F(117, 8))
        self.assertEqual(result["gradients"], dict(weight=F(3, 2), bias=F(-15, 2)))
        self.assertEqual(result["next"], dict(weight=F(1, 5), bias=F(1, 2)))
        for parameter in ("weight", "bias"):
            h = F(1, 1000)
            plus = oracle.derive({**state, parameter: state[parameter] + h})["mse"]
            minus = oracle.derive({**state, parameter: state[parameter] - h})["mse"]
            self.assertEqual((plus - minus) / (2 * h), result["gradients"][parameter])

    def test_numpy_canonical_literals(self):
        result = reference.derive_regression(reference.CANONICAL_REGRESSION)
        self.assertEqual([row["prediction"] for row in result["rows"]], [-1, -0.5, 0, 0.5, 1])
        self.assertEqual([row["residual"] for row in result["rows"]], [2, 0.5, -1, -2.5, -3])
        self.assertEqual([row["squaredError"] for row in result["rows"]], [4, 0.25, 1, 6.25, 9])
        fixtures.assert_close(result["mse"], 4.1)
        fixtures.assert_close(result["gradients"], dict(weight=-5.2, bias=-1.6))
        fixtures.assert_close(result["next"], dict(weight=1.02, bias=0.16))
        fixtures.assert_close(reference.derive_regression(reference.regression_step(reference.CANONICAL_REGRESSION))["mse"], 1.7064)
        self.assertEqual(result["shapes"], dict(X=[5, 1], weights=[1, 1], targets=[5, 1]))

    def test_numpy_literal_gradient_finite_differences(self):
        for state, gradient in (
            (reference.CANONICAL_REGRESSION, dict(weight=-5.2, bias=-1.6)),
            (dict(samples=[dict(id="a", x=-2, y=1), dict(id="b", x=1, y=4)],
                  weight=0.5, bias=-1, learningRate=0.2), dict(weight=1.5, bias=-7.5)),
        ):
            fixtures.assert_close(reference.derive_regression(state)["gradients"], gradient)
            for parameter in ("weight", "bias"):
                h = 1e-5
                plus = reference.derive_regression({**state, parameter: state[parameter] + h})["mse"]
                minus = reference.derive_regression({**state, parameter: state[parameter] - h})["mse"]
                self.assertAlmostEqual((plus - minus) / (2 * h), gradient[parameter], delta=1e-8)

    def test_numpy_matches_independent_oracle_on_goldens_and_seeded_data(self):
        for identifier, state, steps in fixtures.cases():
            with self.subTest(case=identifier):
                fixtures.assert_close(reference.derive_regression(state), oracle.numbers(oracle.derive(state)))
                fixtures.assert_close(reference.regression_trace(state, steps), oracle.numbers(oracle.trace(state, steps)))
        rng = random.Random(20261013)
        for index in range(40):
            state = dict(samples=[dict(id=f"s{i}", x=rng.randint(-12, 12) / 4, y=rng.randint(-20, 20) / 4)
                                  for i in range(rng.randint(1, 8))],
                         weight=rng.randint(-8, 8) / 4, bias=rng.randint(-8, 8) / 4, learningRate=0.05)
            with self.subTest(seeded_case=index):
                fixtures.assert_close(reference.derive_regression(state), oracle.numbers(oracle.derive(state)))
                fixtures.assert_close(reference.regression_trace(state, 3), oracle.numbers(oracle.trace(state, 3)))

    def test_one_sample_constant_x_perfect_fit_and_divergence(self):
        one = single(2, 3)
        fixtures.assert_close(reference.derive_regression(one)["gradients"], dict(weight=-12, bias=-6))
        fixtures.assert_close(reference.derive_regression(reference.regression_step(one))["mse"], 0)
        self.assertEqual(reference.derive_regression(one)["shapes"]["X"], [1, 1])
        constant = {**single(2, 1), "samples": [dict(id="a", x=2, y=1), dict(id="b", x=2, y=3)]}
        updated = reference.regression_step(constant)
        alternate = {**constant, "weight": 0, "bias": 2}
        self.assertEqual(reference.derive_regression(updated)["rows"], reference.derive_regression(alternate)["rows"])
        self.assertEqual(reference.derive_regression(updated)["mse"], 1)
        perfect = single(7, 17, 2, 3)
        self.assertEqual(reference.regression_step(perfect), perfect)
        self.assertTrue(all(reference.derive_regression(frame["state"])["mse"] == 0
                            for frame in reference.regression_trace(perfect, 20)))
        divergent = single(2, 1, rate=1)
        self.assertEqual(reference.derive_regression(reference.regression_step(divergent))["mse"], 81)

    def test_sample_count_and_ids(self):
        maximum = {**single(0, 0), "samples": [dict(id=str(i), x=i, y=0) for i in range(64)]}
        self.assertEqual(reference.derive_regression(maximum)["shapes"]["X"], [64, 1])
        for samples in ([], maximum["samples"] + [dict(id="extra", x=0, y=0)], None, [None],
                        [dict(id="same", x=0, y=0), dict(id="same", x=1, y=1)]):
            with self.subTest(samples=samples), self.assertRaises(ValueError):
                reference.derive_regression({**single(0, 0), "samples": samples})
        for identifier in ("", " \t", None, 3):
            with self.subTest(identifier=identifier), self.assertRaisesRegex(ValueError, "IDs"):
                reference.derive_regression({**single(0, 0), "samples": [dict(id=identifier, x=0, y=0)]})
        with self.assertRaises(ValueError):
            reference.derive_regression(None)

    def test_nonfinite_and_nonnumeric_inputs(self):
        for value in (math.nan, math.inf, -math.inf, True, "1", None, 10 ** 400):
            for key in ("weight", "bias", "learningRate"):
                with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                    reference.derive_regression({**single(0, 0), key: value})
            for key in ("x", "y"):
                with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                    reference.derive_regression({**single(0, 0), "samples": [{"id": "a", "x": 0, "y": 0, key: value}]})

    def test_learning_rate_bounds(self):
        for rate in (0, -0.1, 1 + sys.float_info.epsilon, 2):
            with self.subTest(rate=rate), self.assertRaisesRegex(ValueError, "Learning rate"):
                reference.derive_regression(single(0, 0, rate=rate))
        for rate in (float.fromhex("0x0.0000000000001p-1022"), 1):
            self.assertEqual(reference.derive_regression(single(0, 1, rate=rate))["mse"], 1)

    def test_finite_input_arithmetic_overflow(self):
        largest = sys.float_info.max
        for state in (
            single(2, 0, largest), single(1, 0, largest, largest), single(0, -largest, 0, largest),
            single(0, 1e200), single(1e308, 0, bias=2), single(1e308, 0, bias=1),
            {**single(0, 0), "samples": [dict(id="a", x=0, y=1e154), dict(id="b", x=0, y=-1e154)]},
            {**single(0, 0), "samples": [dict(id="a", x=1e308, y=-1), dict(id="b", x=1e308, y=-1)]},
        ):
            with self.subTest(state=state), self.assertRaisesRegex(ValueError, "overflow|finite"):
                reference.derive_regression(state)

    def test_large_zero_residual_and_small_representable_loss(self):
        self.assertEqual(reference.derive_regression(single(sys.float_info.max, 0))["mse"], 0)
        result = reference.derive_regression(single(1, 1e-160))
        self.assertGreater(result["mse"], 0)
        self.assertAlmostEqual(result["mse"] / 1e-320, 1)
        self.assertAlmostEqual(result["gradients"]["weight"] / -2e-160, 1)

    def test_invalid_updated_state_and_later_overflow_leave_input_intact(self):
        state = single(1e308, 0, bias=0.5, rate=1)
        original = deepcopy(state)
        self.assertEqual(reference.derive_regression(state)["next"]["weight"], -1e308)
        with self.assertRaises(ValueError):
            reference.regression_step(state)
        with self.assertRaises(ValueError):
            reference.regression_trace(state, 1)
        self.assertEqual(state, original)
        later = single(1e100, 1e-100)
        self.assertEqual(len(reference.regression_trace(later, 1)), 2)
        with self.assertRaises(ValueError):
            reference.regression_trace(later, 2)

    def test_trace_bounds_and_detached_history(self):
        for steps in (-1, 21, 1.5, True, math.nan, math.inf):
            with self.subTest(steps=steps), self.assertRaisesRegex(ValueError, "integer from 0 to 20"):
                reference.regression_trace(reference.CANONICAL_REGRESSION, steps)
        self.assertEqual(len(reference.regression_trace(reference.CANONICAL_REGRESSION, 0)), 1)
        self.assertEqual(len(reference.regression_trace(reference.CANONICAL_REGRESSION, 20)), 21)
        with self.assertRaises(ValueError):
            reference.regression_trace(single(0, math.nan), 0)
        state = deepcopy(reference.CANONICAL_REGRESSION)
        original = deepcopy(state)
        reference.derive_regression(state)
        updated = reference.regression_step(state)
        history = reference.regression_trace(state, 3)
        self.assertEqual(state, original)
        self.assertEqual(updated["learningRate"], state["learningRate"])
        state["weight"] = state["samples"][0]["x"] = 99
        self.assertEqual(history[0]["state"], original)
        history[1]["state"]["samples"][0]["y"] = 99
        self.assertEqual(history[0]["state"], original)
        self.assertEqual(history[2]["state"]["samples"], original["samples"])

    def test_committed_fixture_is_deterministic_and_fresh(self):
        expected = fixtures.render(fixtures.build_fixture())
        self.assertEqual(fixtures.render(fixtures.build_fixture()), expected)
        self.assertEqual(fixtures.FIXTURE.read_bytes(), expected)
        self.assertEqual(len(json.loads(expected)["cases"]), 7)

    def test_check_fails_missing_or_stale_without_rewriting(self):
        with TemporaryDirectory() as directory, patch.object(fixtures, "FIXTURE", Path(directory) / "fixture.json"):
            with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
                self.assertEqual(fixtures.main(["--check"]), 1)
                self.assertFalse(fixtures.FIXTURE.exists())
                self.assertEqual(fixtures.main(["--write"]), 0)
                original = fixtures.FIXTURE.read_bytes()
                self.assertEqual(fixtures.main(["--check"]), 0)
                stale = json.loads(original)
                stale["cases"][0]["before"]["gradients"]["weight"] = 99
                fixtures.FIXTURE.write_bytes(fixtures.render(stale))
                stale_bytes = fixtures.FIXTURE.read_bytes()
                self.assertEqual(fixtures.main(["--check"]), 1)
                self.assertEqual(fixtures.FIXTURE.read_bytes(), stale_bytes)
                self.assertEqual(fixtures.main(["--write"]), 0)
                self.assertEqual(fixtures.FIXTURE.read_bytes(), original)

    def test_canonical_python_script_executes_with_before_after_and_trace(self):
        result = subprocess.run([sys.executable, "-B", str(fixtures.ROOT / "code/python/p02/linear_regression.py")],
                                cwd=fixtures.ROOT, capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        payload = json.loads(result.stdout)
        fixtures.assert_close(payload["before"]["mse"], 4.1)
        fixtures.assert_close(payload["after"]["mse"], 1.7064)
        self.assertEqual([frame["index"] for frame in payload["trace"]], [0, 1, 2, 3])


if __name__ == "__main__":
    unittest.main()
