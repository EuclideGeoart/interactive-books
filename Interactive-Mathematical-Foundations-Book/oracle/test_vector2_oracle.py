"""Self-test of the oracle against LITERAL values — copied from the master plan or worked by hand —
never against values the oracle computed itself (plan §12.3: no comparing code with a copy of itself)."""
import json
import math
import runpy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vector2_oracle as oracle  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


class KnownValues(unittest.TestCase):
    def test_canonical_vector_matches_the_plan_literals(self):
        # master plan §9.4 JSON example and §15.3 table
        e = oracle.evaluate(3, 2)
        self.assertEqual(e["magnitude"], 3.605551275463989)
        self.assertEqual(e["directionRadians"], 0.5880026035475675)
        self.assertAlmostEqual(e["directionDegrees"], 33.690067525979785, places=12)
        self.assertEqual(e["exact"], {"coefficient": "1", "radicand": "13", "text": "√13", "tex": "\\sqrt{13}"})
        self.assertEqual(e["magnitudeSquaredExact"], "13")

    def test_pythagorean_triple(self):
        e = oracle.evaluate(3, 4)
        self.assertEqual(e["magnitude"], 5.0)
        self.assertEqual(e["exact"]["text"], "5")
        self.assertEqual(e["directionRadians"], 0.9272952180016122)  # atan(4/3), worked value

    def test_diagonal(self):
        e = oracle.evaluate(1, 1)
        self.assertEqual(e["directionRadians"], 0.7853981633974483)  # pi/4
        self.assertEqual(e["exact"]["text"], "√2")
        self.assertEqual(e["magnitude"], 1.4142135623730951)

    def test_zero_vector_has_no_direction(self):
        for x, y in [(0, 0), (-0.0, -0.0), (-0.0, 0), (0, -0.0)]:
            e = oracle.evaluate(x, y)
            self.assertTrue(e["isZero"])
            self.assertIsNone(e["directionRadians"])
            self.assertIsNone(e["directionDegrees"])
            self.assertEqual(e["magnitude"], 0.0)

    def test_negative_x_axis_is_plus_pi_whichever_zero_sign(self):
        self.assertEqual(oracle.evaluate(-1, -0.0)["directionRadians"], math.pi)
        self.assertEqual(oracle.evaluate(-1, 0.0)["directionRadians"], math.pi)

    def test_axes_and_quadrants(self):
        self.assertEqual(oracle.evaluate(5, 0)["directionRadians"], 0.0)
        self.assertAlmostEqual(oracle.evaluate(0, 5)["directionRadians"], math.pi / 2, places=15)
        self.assertAlmostEqual(oracle.evaluate(0, -5)["directionRadians"], -math.pi / 2, places=15)
        a = math.atan(2 / 3)
        self.assertAlmostEqual(oracle.evaluate(-3, 2)["directionRadians"], math.pi - a, places=14)
        self.assertAlmostEqual(oracle.evaluate(-3, -2)["directionRadians"], -(math.pi - a), places=14)
        self.assertAlmostEqual(oracle.evaluate(3, -2)["directionRadians"], -a, places=14)

    def test_square_free_decomposition_hand_values(self):
        # n = x²+y²  ->  (a, b) with n = a²·b, b square-free
        for (x, y), expected in {(2, 2): (2, 2), (4, 4): (4, 2), (1, 2): (1, 5), (3, 6): (3, 5), (7, 1): (5, 2), (12, 16): (20, 1), (6, 0): (6, 1), (0, 0): (0, 1), (3, 4): (5, 1)}.items():
            self.assertEqual(oracle.exact_magnitude(x, y), expected, (x, y))
        self.assertEqual(oracle.factorise(72), {2: 3, 3: 2})
        self.assertEqual(oracle.factorise(13), {13: 1})

    def test_exactness_is_not_claimed_for_non_integers_or_beyond_the_limit(self):
        self.assertIsNone(oracle.exact_magnitude(0.5, 0.5))
        self.assertIsNone(oracle.exact_magnitude(1_000_000, 1_000_000))

    def test_extremes_are_reported_honestly(self):
        tiny = oracle.evaluate(1e-200, 1e-200)
        self.assertGreater(tiny["magnitude"], 0)  # the sum of squares underflows, the magnitude must not
        self.assertEqual(tiny["magnitudeSquared"], 0.0)
        huge = oracle.evaluate(1.7976931348623157e308, 1.7976931348623157e308)
        self.assertEqual(huge["magnitudeStatus"], "overflow")
        self.assertIsNone(huge["magnitude"])

    def test_every_exact_form_squares_back_to_the_integer(self):
        for x in range(-20, 21):
            for y in range(-20, 21):
                a, b = oracle.exact_magnitude(x, y)
                self.assertEqual(a * a * b, x * x + y * y)
                self.assertTrue(all(e == 1 for e in oracle.factorise(b).values()) or b == 1, (x, y, b))


class NumpyCaveat(unittest.TestCase):
    """A finding worth teaching (plan §11.x numerical considerations): the library one-liner is not range-safe."""

    @unittest.skipIf(oracle.np is None, "NumPy not installed (run `npm run oracle:setup`)")
    def test_numpy_norm_squares_first_and_underflows_but_hypot_does_not(self):
        v = oracle.np.array([1e-200, 1e-200])
        self.assertEqual(float(oracle.np.linalg.norm(v)), 0.0)  # WRONG for a non-zero vector
        self.assertGreater(float(oracle.np.hypot(1e-200, 1e-200)), 0.0)  # right
        self.assertFalse(oracle.textbook_safe(1e-200, 1e-200))
        self.assertTrue(oracle.textbook_safe(3, 2))


class Fixture(unittest.TestCase):
    def test_committed_fixture_is_fresh(self):
        self.assertEqual(oracle.main(["--check"]), 0)

    def test_fixture_contains_the_plan_example(self):
        data = json.loads(oracle.FIXTURE_PATH.read_text(encoding="utf-8"))
        case = next(c for c in data["cases"] if c["id"] == "canonical_3_2")
        self.assertEqual(case["expected"]["magnitude"], 3.605551275463989)
        self.assertEqual(case["expected"]["directionRadians"], 0.5880026035475675)
        self.assertGreater(len(data["cases"]), 250)
        self.assertEqual(data["exactRadicandLimit"], "1000000000000")

    def test_generation_is_deterministic(self):
        self.assertEqual(oracle.render(oracle.build_fixture()), oracle.render(oracle.build_fixture()))


class ReferenceCode(unittest.TestCase):
    """The code shown on the page is the code that runs here (plan §13 D: reference code executes)."""

    def test_pedagogical_example_executes_and_gives_the_documented_values(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "vector_magnitude.py"))
        self.assertEqual(ns["magnitude"], 3.605551275463989)
        self.assertEqual(ns["angle"], 0.5880026035475675)

    @unittest.skipIf(oracle.np is None, "NumPy not installed (run `npm run oracle:setup`)")
    def test_numpy_example_executes_and_agrees_with_the_pedagogical_one(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "vector_magnitude_numpy.py"))
        self.assertAlmostEqual(float(ns["magnitude"]), 3.605551275463989, places=14)
        self.assertAlmostEqual(float(ns["angle"]), 0.5880026035475675, places=15)


if __name__ == "__main__":
    unittest.main()
