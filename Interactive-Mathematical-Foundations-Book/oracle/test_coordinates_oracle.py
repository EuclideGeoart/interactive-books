"""Self-test of the I.2 oracle against LITERAL values worked by hand, never against values the oracle computed itself (plan §12.3).
Also runs the reference files shown on the coordinates page: what the reader sees is what runs here."""
import math
import runpy
import sys
import unittest
from fractions import Fraction
from pathlib import Path

try:
    import numpy as np
except ImportError:  # the NumPy-dependent tests are skipped; `npm run oracle:setup` installs it
    np = None

sys.path.insert(0, str(Path(__file__).resolve().parent))
import coordinates_oracle as oracle  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
F = Fraction


class Quadrants(unittest.TestCase):
    def test_four_quadrants_by_hand(self):
        self.assertEqual(oracle.position(F(3), F(2)), "Q1")
        self.assertEqual(oracle.position(F(-3), F(2)), "Q2")
        self.assertEqual(oracle.position(F(-3), F(-2)), "Q3")
        self.assertEqual(oracle.position(F(3), F(-2)), "Q4")

    def test_axes_and_origin_belong_to_no_quadrant(self):
        self.assertEqual(oracle.position(F(0), F(-4)), "axis-y")
        self.assertEqual(oracle.position(F(5), F(0)), "axis-x")
        self.assertEqual(oracle.position(F(0), F(0)), "origin")
        self.assertEqual(oracle.position(F("-0.01"), F("0.01")), "Q2")

    def test_every_nonzero_sign_pair_is_covered_exactly_once(self):
        self.assertEqual(sorted(oracle.QUADRANT_BY_SIGNS.values()), ["Q1", "Q2", "Q3", "Q4"])
        self.assertEqual(len(oracle.QUADRANT_BY_SIGNS), 4)


class Distances(unittest.TestCase):
    def test_3_4_5(self):
        e = oracle.point_expected(F(3), F(-4))
        self.assertEqual(e["distSq"], "25")
        self.assertEqual((e["distance"]["a"], e["distance"]["b"], e["distance"]["c"]), ("5", "1", "1"))
        self.assertEqual((e["distToXAxis"], e["distToYAxis"]), ("4", "3"))  # the distance to the x-axis is |y|, to the y-axis |x|

    def test_two_sqrt_13(self):
        # (-2, 1) -> (4, -3): dx = 6, dy = -4, 36 + 16 = 52 = 4 * 13
        e = oracle.segment_expected(F(-2), F(1), F(4), F(-3))
        self.assertEqual((e["dx"], e["dy"]), ("6", "-4"))
        self.assertEqual((e["rdx"], e["rdy"]), ("-6", "4"))
        self.assertEqual(e["distSq"], "52")
        self.assertEqual((e["distance"]["a"], e["distance"]["b"], e["distance"]["c"]), ("2", "13", "1"))
        self.assertAlmostEqual(e["distance"]["approx"], 7.211102550927978, places=12)  # 2 * 3.605551275463989
        self.assertEqual(e["taxicab"], "10")
        self.assertEqual(e["crossTerm"], "48")  # 10**2 = 52 + 48
        self.assertEqual(e["midpoint"], ["1", "-1"])

    def test_sqrt_74_over_2(self):
        # (0.5, -1.5) -> (-2, 2): dx = -5/2, dy = 7/2, 25/4 + 49/4 = 74/4 = 37/2; sqrt(37/2) = sqrt(74)/2
        e = oracle.segment_expected(F("0.5"), F("-1.5"), F(-2), F(2))
        self.assertEqual(e["distSq"], "37/2")
        self.assertEqual((e["distance"]["a"], e["distance"]["b"], e["distance"]["c"]), ("1", "74", "2"))
        self.assertEqual(e["midpoint"], ["-3/4", "1/4"])

    def test_degenerate_and_axis_aligned(self):
        e = oracle.segment_expected(F(2), F(3), F(2), F(3))
        self.assertEqual((e["kind"], e["distSq"], e["taxicab"]), ("coincident", "0", "0"))
        self.assertTrue(e["taxicabEqualsDistance"])
        h = oracle.segment_expected(F(-4), F(2), F(3), F(2))
        self.assertEqual((h["kind"], h["distance"]["a"], h["distance"]["b"], h["taxicab"]), ("horizontal", "7", "1", "7"))
        o = oracle.segment_expected(F(0), F(0), F(1), F(1))
        self.assertFalse(o["taxicabEqualsDistance"])

    def test_equal_distances_decided_exactly(self):
        a = oracle.point_expected(F("0.1"), F("0.7"))
        b = oracle.point_expected(F("0.5"), F("0.5"))
        self.assertEqual((a["distSq"], b["distSq"]), ("1/2", "1/2"))
        self.assertNotEqual(0.1**2 + 0.7**2, 0.5**2 + 0.5**2)  # binary doubles disagree with the exact answer

    def test_midpoint_with_three_decimals(self):
        e = oracle.segment_expected(F("0.01"), F(0), F("0.02"), F(0))
        self.assertEqual(e["midpoint"], ["3/200", "0"])  # 0.015


class NumberLine(unittest.TestCase):
    def test_minus_3_to_5(self):
        e = oracle.line_expected(F(-3), F(5))
        self.assertEqual((e["forward"], e["backward"], e["distance"], e["midpoint"]), ("8", "-8", "8", "1"))
        self.assertTrue(e["viaZeroEqualsDistance"])
        self.assertFalse(e["sameSide"])

    def test_same_side_detour(self):
        e = oracle.line_expected(F(2), F(7))
        self.assertEqual((e["distance"], e["viaZero"]), ("5", "9"))
        self.assertFalse(e["viaZeroEqualsDistance"])
        self.assertTrue(e["sameSide"])


class Pixels(unittest.TestCase):
    def test_h4_by_hand(self):
        # H = 4, W = 5: the picture's bottom row (y = 0) is row 3; the top row (y = 3) is row 0.
        e = oracle.pixel_expected(5, 4, 2, 0)
        self.assertEqual((e["row"], e["col"], e["index"]), (3, 2, 17))
        e = oracle.pixel_expected(5, 4, 2, 3)
        self.assertEqual((e["row"], e["col"], e["index"]), (0, 2, 2))
        e = oracle.pixel_expected(5, 4, 4, 1)
        self.assertEqual((e["row"], e["col"], e["index"]), (2, 4, 14))

    def test_slips(self):
        self.assertFalse(oracle.pixel_expected(4, 4, 1, 0)["naiveRowInRange"])
        self.assertTrue(oracle.pixel_expected(4, 4, 1, 1)["naiveRowInRange"])
        self.assertFalse(oracle.pixel_expected(6, 3, 4, 1)["swappedInRange"])

    @unittest.skipIf(np is None, "NumPy not installed (run `npm run oracle:setup`)")
    def test_numpy_agrees_with_the_labelled_array(self):
        """np.flipud + np.argwhere: a third, library implementation of the same lookup."""
        for w, h in [(2, 2), (3, 4), (5, 4), (7, 3)]:
            labelled = np.arange(w * h).reshape(h, w)  # labelled[y, x] with y counted from the BOTTOM
            image = np.flipud(labelled)
            for y in range(h):
                for x in range(w):
                    (row, col), = np.argwhere(image == labelled[y, x])
                    e = oracle.pixel_expected(w, h, x, y)
                    self.assertEqual((row, col), (e["row"], e["col"]))
                    self.assertEqual(int(np.ravel(image).tolist().index(labelled[y, x])), e["index"])


class Fixture(unittest.TestCase):
    def test_committed_fixture_is_fresh_and_covers_every_family(self):
        text = oracle.render(oracle.build_fixture())
        self.assertEqual(oracle.FIXTURE_PATH.read_text(encoding="utf-8"), text)
        fixture = oracle.build_fixture()
        self.assertEqual({c["expected"]["position"] for c in fixture["points"]}, {"Q1", "Q2", "Q3", "Q4", "axis-x", "axis-y", "origin"})
        self.assertGreater(len(fixture["segments"]), 250)


class ReferenceCode(unittest.TestCase):
    """The code shown on the page is the code that runs here (plan §13 D)."""

    def test_distance_example(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "coordinates_distance.py"))
        self.assertEqual(ns["step"], (3, 4))
        self.assertEqual(ns["step_back"], (-3, -4))
        self.assertEqual(ns["distance"], 5.0)
        self.assertEqual(ns["distance_from_points"], 5.0)
        self.assertTrue(ns["same_both_ways"])
        self.assertEqual(ns["taxicab"], 7)
        self.assertEqual(ns["midpoint"], (2.5, 4.0))
        self.assertTrue(ns["closer"])
        self.assertTrue(ns["exact_equal"])
        self.assertFalse(ns["float_equal"])
        self.assertEqual(ns["squared_distance"]((0, 0), (3, 4)), 25)
        # and the oracle agrees with the file on a sweep of integer pairs
        for ax in range(-3, 4):
            for ay in range(-3, 4):
                for bx in range(-3, 4):
                    e = oracle.segment_expected(F(ax), F(ay), F(bx), F(2))
                    self.assertEqual(F(e["distSq"]), ns["squared_distance"]((ax, ay), (bx, 2)))

    def test_quadrant_example(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "coordinates_quadrant.py"))
        self.assertEqual((ns["second"], ns["fourth"]), (2, 4))
        self.assertIsNone(ns["on_y_axis"])
        self.assertIsNone(ns["at_origin"])
        self.assertEqual((ns["wrong_on_axis"], ns["wrong_at_origin"]), (4, 4))
        self.assertIsNone(ns["negative_zero"])
        self.assertEqual(ns["sign_bit_of_negative_zero"], -1.0)
        # the function agrees with the oracle's table lookup everywhere on a grid that includes the axes
        names = {"Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4}
        for x in range(-3, 4):
            for y in range(-3, 4):
                expected = names.get(oracle.position(F(x), F(y)))
                self.assertEqual(ns["quadrant"](x, y), expected, (x, y))

    @unittest.skipIf(np is None, "NumPy not installed (run `npm run oracle:setup`)")
    def test_image_index_example(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "coordinates_image_index.py"))
        self.assertEqual((ns["row"], ns["col"]), (3, 2))
        self.assertEqual(int(ns["pixel"]), 17)
        self.assertEqual(ns["flat_index"], 17)
        self.assertTrue(ns["same_flat"])
        self.assertEqual(ns["back_to_y"], 0)
        self.assertTrue(ns["same_pixel"])
        self.assertTrue(ns["off_by_one_fails"])
        self.assertEqual(int(ns["swapped"]), 10)
        for y in range(4):
            for x in range(5):
                e = oracle.pixel_expected(5, 4, x, y)
                self.assertEqual(ns["to_row_col"](x, y), (e["row"], e["col"]))
        self.assertAlmostEqual(math.hypot(3, 4), 5.0)


if __name__ == "__main__":
    unittest.main()
