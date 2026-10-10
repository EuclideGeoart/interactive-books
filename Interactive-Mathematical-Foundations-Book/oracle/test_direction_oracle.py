"""Self-test of the direction/placement oracle against LITERAL values — worked by hand or copied from the master
plan — never against values the oracle computed itself (plan §12.3)."""
import math
import runpy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import direction_oracle as oracle  # noqa: E402

try:
    import numpy as oracle_np  # type: ignore
except ImportError:  # pragma: no cover
    oracle_np = None

ROOT = Path(__file__).resolve().parent.parent
A = math.atan(2 / 3)  # the reference angle for (±3, ±2), worked by hand: 0.5880026035475675


class KnownValues(unittest.TestCase):
    def test_first_quadrant_the_two_formulas_agree(self):
        e = oracle.evaluate_direction(3, 2)
        self.assertEqual(e["location"], "I")
        self.assertEqual(e["atan2Radians"], 0.5880026035475675)
        self.assertEqual(e["naiveRadians"], 0.5880026035475675)
        self.assertEqual(e["halfTurns"], 0)

    def test_second_quadrant_naive_atan_is_off_by_pi(self):
        e = oracle.evaluate_direction(-3, 2)
        self.assertEqual(e["location"], "II")
        self.assertAlmostEqual(e["ratio"], -2 / 3, places=15)
        self.assertAlmostEqual(e["naiveRadians"], -A, places=15)
        self.assertAlmostEqual(e["atan2Radians"], math.pi - A, places=14)  # 2.5535900500422257, worked by hand
        self.assertEqual(e["halfTurns"], 1)

    def test_third_quadrant_naive_atan_is_off_by_minus_pi(self):
        e = oracle.evaluate_direction(-3, -2)
        self.assertEqual(e["location"], "III")
        self.assertAlmostEqual(e["naiveRadians"], A, places=15)  # the same as for (3, 2): the sign information is gone
        self.assertAlmostEqual(e["atan2Radians"], A - math.pi, places=14)
        self.assertEqual(e["halfTurns"], -1)

    def test_fourth_quadrant(self):
        e = oracle.evaluate_direction(3, -2)
        self.assertEqual(e["location"], "IV")
        self.assertAlmostEqual(e["atan2Radians"], -A, places=15)
        self.assertEqual(e["halfTurns"], 0)

    def test_a_vector_and_its_mirror_have_the_same_ratio_and_the_same_naive_angle(self):
        a, b = oracle.evaluate_direction(3, 2), oracle.evaluate_direction(-3, -2)
        self.assertEqual(a["ratio"], b["ratio"])
        self.assertEqual(a["naiveRadians"], b["naiveRadians"])
        self.assertNotEqual(a["atan2Radians"], b["atan2Radians"])
        self.assertAlmostEqual(a["atan2Radians"] - b["atan2Radians"], math.pi, places=14)

    def test_vertical_vectors_have_no_ratio_but_a_direction(self):
        for y, angle in [(5, math.pi / 2), (-5, -math.pi / 2)]:
            e = oracle.evaluate_direction(0, y)
            self.assertIsNone(e["ratio"])
            self.assertIsNone(e["naiveRadians"])
            self.assertIsNone(e["halfTurns"])
            self.assertAlmostEqual(e["atan2Radians"], angle, places=15)

    def test_negative_x_axis_is_plus_pi_and_negative_zero_never_matters(self):
        for y in (0.0, -0.0):
            e = oracle.evaluate_direction(-5, y)
            self.assertEqual(e["atan2Radians"], math.pi)
            self.assertEqual(e["halfTurns"], 1)
            self.assertEqual(e["naiveRadians"], 0.0)
            self.assertEqual(math.copysign(1, e["naiveRadians"]), 1.0)  # +0, not -0

    def test_zero_vector_has_nothing(self):
        e = oracle.evaluate_direction(-0.0, 0.0)
        self.assertEqual(e["location"], "origin")
        self.assertIsNone(e["atan2Radians"])
        self.assertIsNone(e["ratio"])

    def test_overflowing_ratio_is_written_as_a_string(self):
        self.assertEqual(oracle.evaluate_direction(1e-300, 1e300)["ratio"], "Infinity")

    def test_placement_is_exact_decimal_arithmetic(self):
        self.assertNotEqual(0.1 + 0.2, 0.3)  # binary floating point gives 0.30000000000000004 ...
        self.assertEqual(oracle.evaluate_placement(0.1, 0, 0.2, 0)["tip"]["x"], 0.3)  # ... decimal arithmetic does not
        self.assertEqual(oracle.evaluate_placement(1, -1, 3, 2)["tip"], {"x": 4.0, "y": 1.0})  # worked by hand
        self.assertEqual(oracle.evaluate_placement(1, -1, 3, 2)["measured"], {"x": 3.0, "y": 2.0})
        self.assertEqual(oracle.evaluate_placement(0.1, 0.2, 0.2, 0.1)["tip"], {"x": 0.3, "y": 0.3})

    def test_sweep_every_grid_vector_satisfies_the_reconstruction_identity(self):
        for x in range(-6, 7):
            for y in range(-6, 7):
                e = oracle.evaluate_direction(x, y)
                if e["atan2Radians"] is None or e["halfTurns"] is None:
                    continue
                self.assertAlmostEqual(math.tan(e["atan2Radians"]), y / x, places=9) if x and abs(y / x) < 1e3 else None
                self.assertAlmostEqual(e["naiveRadians"] + e["halfTurns"] * math.pi, e["atan2Radians"], places=13)


class Fixture(unittest.TestCase):
    def test_committed_fixture_is_fresh(self):
        self.assertEqual(oracle.main(["--check"]), 0)

    def test_generation_is_deterministic(self):
        self.assertEqual(oracle.render(oracle.build_fixture()), oracle.render(oracle.build_fixture()))

    def test_fixture_size(self):
        data = oracle.build_fixture()
        self.assertGreater(len(data["direction"]), 150)
        self.assertGreater(len(data["placement"]), 100)


class ReferenceCode(unittest.TestCase):
    """The code shown on the page is the code that runs here (plan §13 D)."""

    def test_direction_example_runs_and_documents_the_counterexample(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "vector_direction.py"))
        self.assertEqual(ns["theta_naive"], -0.5880026035475675)
        self.assertEqual(ns["theta"], 2.5535900500422257)
        self.assertEqual(ns["theta_naive_of_minus_v"], ns["theta_naive"])  # the information that is lost
        self.assertEqual(ns["theta_of_minus_v"], -0.5880026035475675)
        self.assertEqual(ns["silent_zero"], 0.0)  # the library picks 0; the mathematics has no direction
        self.assertEqual(ns["zero_direction"], None)
        self.assertEqual(ns["vertical_naive"], "ZeroDivisionError")
        self.assertEqual(ns["vertical_atan2"], 1.5707963267948966)

    def test_displacement_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "vector_displacement.py"))
        self.assertEqual(ns["v"], (3.0, 2.0))
        self.assertEqual(ns["v_from_other_tail"], (3.0, 2.0))
        self.assertEqual(ns["magnitude"], 3.605551275463989)
        self.assertEqual(ns["tip_from_other_tail"], (4.0, 1.0))

    @unittest.skipIf(oracle_np is None, "NumPy not installed (run `npm run oracle:setup`)")
    def test_numpy_batch_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "vector_batch_numpy.py"))
        for length in ns["lengths"]:
            self.assertAlmostEqual(float(length), 3.605551275463989, places=14)
        expected = [0.5880026035475675, 2.5535900500422257, -2.5535900500422257, -0.5880026035475675]
        for got, want in zip(ns["angles"], expected):
            self.assertAlmostEqual(float(got), want, places=14)


if __name__ == "__main__":
    unittest.main()
