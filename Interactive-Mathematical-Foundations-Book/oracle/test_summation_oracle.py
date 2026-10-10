"""Self-test of the summation oracle against LITERAL values — worked by hand (never against values the oracle computed itself; plan §12.3) —
and execution of the Python reference files shown on the chapter page (summation_loops.py, summation_nested.py, summation_numpy_float.py)."""
import runpy
import sys
import unittest
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import summation_oracle as oracle  # noqa: E402

try:
    import numpy as oracle_np  # type: ignore  # noqa: F401
except ImportError:  # pragma: no cover
    oracle_np = None

ROOT = Path(__file__).resolve().parent.parent


def total(seq: str, m: int, n: int, **kw) -> str | None:
    return oracle.sum_case(seq, m, n, **kw)["expected"]["total"]


class HandWorkedSums(unittest.TestCase):
    def test_textbook_values(self):
        self.assertEqual(total("identity", 1, 5), "15/1")
        self.assertEqual(total("square", 1, 5), "55/1")
        self.assertEqual(total("odd", 1, 5), "25/1")
        self.assertEqual(total("reciprocal", 1, 4), "25/12")  # 1 + 1/2 + 1/3 + 1/4 = (12 + 6 + 4 + 3)/12
        self.assertEqual(total("alternating", 1, 5), "-1/1")
        self.assertEqual(total("alternating", 1, 4), "0/1")
        self.assertEqual(total("constant", 1, 5), "15/1")
        self.assertEqual(total("pronic", 1, 3), "20/1")  # 2 + 6 + 12
        self.assertEqual(total("identity", -2, 3), "3/1")  # -2 - 1 + 0 + 1 + 2 + 3
        self.assertEqual(total("identity", 1, 20), "210/1")
        self.assertEqual(total("geometric", 0, 4, r=Fraction(1, 2)), "31/16")
        self.assertEqual(total("geometric", 0, 4, r=Fraction(1)), "5/1")
        self.assertEqual(total("geometric", 0, 5, r=Fraction(2)), "63/1")
        self.assertEqual(total("list", 1, 4, a=[Fraction(3), Fraction(-1), Fraction(1, 2), Fraction(4)]), "13/2")

    def test_empty_and_single(self):
        e = oracle.sum_case("identity", 5, 2)["expected"]
        self.assertEqual((e["count"], e["empty"], e["total"], e["partials"]), (0, True, "0/1", ["0/1"]))
        self.assertEqual(oracle.sum_case("reciprocal", 1, 0)["expected"]["total"], "0/1")  # no term is asked for, so none can be undefined
        self.assertEqual(oracle.sum_case("identity", 4, 4)["expected"]["partials"], ["0/1", "4/1"])

    def test_partial_sums(self):
        self.assertEqual(oracle.sum_case("identity", 1, 5)["expected"]["partials"], ["0/1", "1/1", "3/1", "6/1", "10/1", "15/1"])

    def test_python_decides_what_is_undefined(self):
        e = oracle.sum_case("reciprocal", -2, 3)["expected"]
        self.assertEqual(e["failure"], {"i": 0, "python": "ZeroDivisionError"})
        self.assertIsNone(e["total"])
        self.assertEqual(e["partials"], ["0/1", "-1/2", "-3/2"])  # the loop stops at the failing term
        lst = [Fraction(1), Fraction(2)]
        e = oracle.sum_case("list", 1, 4, a=lst)["expected"]
        self.assertEqual(e["failure"], {"i": 3, "python": "IndexError"})
        # a[i - 1] with i = 0 is a[-1]: Python does NOT fail, it wraps to the last entry; the mathematical a_0 still does not exist
        e = oracle.sum_case("list", 0, 2, a=lst)["expected"]
        self.assertEqual(e["failure"], {"i": 0, "python": "wraps"})
        # far enough below 1 the negative index runs off the front and Python raises
        e = oracle.sum_case("list", -3, 0, a=lst)["expected"]
        self.assertEqual(e["failure"], {"i": -3, "python": "IndexError"})
        e = oracle.sum_case("geometric", -1, 2, r=Fraction(0))["expected"]
        self.assertEqual(e["failure"], {"i": -1, "python": "ZeroDivisionError"})


class ClosedFormsByAnotherRoute(unittest.TestCase):
    def test_bernoulli_numbers(self):
        self.assertEqual(oracle.bernoulli_plus(4), [Fraction(1), Fraction(1, 2), Fraction(1, 6), Fraction(0), Fraction(-1, 30)])

    def test_faulhaber_hand_values(self):
        self.assertEqual(oracle.power_prefix(1, 10), 55)
        self.assertEqual(oracle.power_prefix(2, 10), 385)
        self.assertEqual(oracle.power_prefix(0, 7), 7)
        self.assertEqual(oracle.power_prefix(3, 4), 100)  # (1 + 2 + 3 + 4) squared
        self.assertEqual(oracle.power_prefix(1, -1), 0)  # S(-1) = 0 = S(0): the term a_0 is 0
        self.assertEqual(oracle.power_prefix(2, -3), -5)  # (-3)(-3 + 1)(2 * (-3) + 1)/6 = (-3)(-2)(-5)/6 = -30/6

    def test_prefix_difference_is_the_term_for_every_integer(self):
        for seq in ["identity", "square", "odd", "alternating", "constant", "pronic"]:
            for k in range(-30, 31):
                term, error = oracle.evaluate(seq, k)
                self.assertIsNone(error)
                self.assertEqual(oracle.prefix(seq, k) - oracle.prefix(seq, k - 1), term, f"{seq} k={k}")

    def test_closed_form_equals_the_loop_everywhere(self):
        for case in oracle.sum_cases():
            e = case["expected"]
            if e["closedMatches"] is not None:
                self.assertTrue(e["closedMatches"], f"{case['seq']} {case['m']}..{case['n']} r={case['r']}")

    def test_geometric_special_case_and_no_closed_form_when_undefined(self):
        self.assertEqual(oracle.closed_value("geometric", Fraction(1), 0, 4), 5)
        self.assertEqual(oracle.closed_value("geometric", Fraction(2), 0, 5), 63)
        self.assertEqual(oracle.closed_value("geometric", Fraction(1, 2), 0, 4), Fraction(31, 16))
        self.assertIsNone(oracle.closed_value("geometric", Fraction(0), -2, 3))
        self.assertIsNone(oracle.closed_value("identity", Fraction(1), 5, 2))  # reversed bounds: not claimed
        self.assertIsNone(oracle.closed_value("reciprocal", Fraction(1), 1, 5))
        self.assertEqual(oracle.closed_value("identity", Fraction(1), 5, 4), 0)  # n = m - 1: empty, and the formula agrees


class GaussAndIdentities(unittest.TestCase):
    def test_gauss_by_hand(self):
        e = oracle.gauss_case("identity", 1, 10)["expected"]
        self.assertEqual(e["pairs"], [[1, 10, "11/1"], [2, 9, "11/1"], [3, 8, "11/1"], [4, 7, "11/1"], [5, 6, "11/1"]])
        self.assertEqual((e["pairSum"], e["middle"], e["total"]), ("11/1", None, "55/1"))
        e = oracle.gauss_case("odd", 1, 5)["expected"]
        self.assertEqual(e["pairs"], [[1, 5, "10/1"], [2, 4, "10/1"]])
        self.assertEqual((e["middle"], e["total"]), ([3, "5/1"], "25/1"))

    def test_gauss_pairs_always_have_one_sum_and_give_the_total(self):
        for case in oracle.gauss_cases():
            e = case["expected"]
            self.assertTrue(e["allEqual"])
            self.assertEqual(e["totalByGauss"], e["total"])

    def test_linearity_and_shift_by_hand(self):
        e = oracle.identity_case(1, 4, 2, 0)["expected"]
        self.assertEqual((e["lhs"], e["rhs"], e["sumA"], e["sumB"]), ("50/1", "50/1", "10/1", "30/1"))
        e = oracle.identity_case(1, 3, 1, 2)["expected"]
        self.assertEqual((e["original"], e["shifted"], e["wrong"], e["wrongDifference"]), ("14/1", "14/1", "50/1", "36/1"))
        self.assertTrue(e["shiftHolds"] and not e["wrongHolds"])
        self.assertTrue(oracle.identity_case(-3, -1, 1, 4)["expected"]["wrongHolds"])  # a coincidence, not a proof

    def test_every_identity_case_holds(self):
        for case in oracle.identity_cases():
            self.assertTrue(case["expected"]["linearHolds"] and case["expected"]["shiftHolds"])


class OffByOneLoopsRunInPython(unittest.TestCase):
    def test_identity_one_to_five(self):
        v = oracle.variant_case("identity", 1, 5)["expected"]["variants"]
        self.assertEqual(v["correct"]["total"], "15/1")
        self.assertEqual((v["stop-excluded"]["total"], v["stop-excluded"]["difference"]), ("10/1", "-5/1"))
        self.assertEqual(v["start-shifted"]["total"], "10/1")  # a_0 = 0, so the slide is invisible
        self.assertEqual((v["list-unshifted"]["total"], v["list-unshifted"]["error"]), (None, "IndexError"))
        self.assertEqual(v["list-shifted"]["total"], "15/1")

    def test_odd_numbers_make_the_slide_visible(self):
        v = oracle.variant_case("odd", 1, 4)["expected"]["variants"]
        self.assertEqual(v["correct"]["total"], "16/1")
        self.assertEqual(v["start-shifted"]["total"], "8/1")  # -1 + 1 + 3 + 5
        self.assertEqual(v["start-shifted"]["difference"], "-8/1")

    def test_reciprocal_slide_hits_zero(self):
        v = oracle.variant_case("reciprocal", 1, 3)["expected"]["variants"]
        self.assertEqual(v["start-shifted"]["error"], "ZeroDivisionError")
        self.assertEqual(v["correct"]["total"], "11/6")

    def test_stop_excluded_always_loses_exactly_the_last_term(self):
        for case in oracle.variant_cases():
            e = case["expected"]["variants"]
            if case["n"] >= case["m"]:
                last, error = oracle.evaluate(case["seq"], case["n"])
                self.assertIsNone(error)
                self.assertEqual(Fraction(e["stop-excluded"]["difference"]), -last)
            self.assertEqual(e["list-shifted"]["difference"], "0/1")


class NestedSums(unittest.TestCase):
    def test_rectangular_product(self):
        e = oracle.nested_case("rectangular", "product", "rows-first", 3, 4)["expected"]
        self.assertEqual((e["total"], e["cellCount"], e["closed"]), (60, 12, 60))
        self.assertEqual(e["rowSums"], [10, 20, 30])
        self.assertEqual(e["colSums"], [6, 12, 18, 24])
        self.assertEqual(e["cells"][:5], [[1, 1], [1, 2], [1, 3], [1, 4], [2, 1]])

    def test_triangular_orders(self):
        rows = oracle.nested_case("triangular", "product", "rows-first", 3, 3)["expected"]
        cols = oracle.nested_case("triangular", "product", "columns-first", 3, 3)["expected"]
        self.assertEqual(rows["cells"], [[1, 1], [2, 1], [2, 2], [3, 1], [3, 2], [3, 3]])
        self.assertEqual(cols["cells"], [[1, 1], [2, 1], [3, 1], [2, 2], [3, 2], [3, 3]])
        self.assertEqual(rows["total"], cols["total"])
        self.assertEqual(rows["total"], 1 + 2 + 4 + 3 + 6 + 9)

    def test_swapping_the_loops_but_keeping_the_bounds_visits_the_other_triangle(self):
        e = oracle.nested_case("triangular", "table", "columns-first", 3, 3)["expected"]
        self.assertEqual(e["total"], 13)  # 2 + (1 + 4) + (0 + 5 + 1), the cells with j <= i
        self.assertEqual(e["swapMistake"], {"cells": 6, "total": 4, "differs": True})  # 2 + (-1 + 4) + (0 - 2 + 1), the cells with i <= j
        self.assertFalse(oracle.nested_case("triangular", "product", "rows-first", 4, 4)["expected"]["swapMistake"]["differs"])  # symmetric entries hide it
        self.assertIsNone(oracle.nested_case("rectangular", "table", "rows-first", 3, 3)["expected"]["swapMistake"])

    def test_data_table(self):
        e = oracle.nested_case("rectangular", "table", "columns-first", 5, 5)["expected"]
        self.assertEqual((e["total"], e["rowSums"], e["colSums"]), (25, [5, 4, 5, 7, 4], [4, 10, 5, 3, 3]))
        self.assertEqual(oracle.nested_case("triangular", "table", "rows-first", 3, 3)["expected"]["total"], 13)

    def test_both_orders_agree_in_every_case(self):
        by_key = {}
        for case in oracle.nested_cases():
            by_key.setdefault((case["kind"], case["rule"], case["n"], case["k"]), set()).add(case["expected"]["total"])
        self.assertTrue(all(len(v) == 1 for v in by_key.values()))


class ReferenceCode(unittest.TestCase):
    """The code shown on the page is the code that runs here (plan §13 D)."""

    def test_loops_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "summation_loops.py"))
        self.assertEqual((ns["total"], ns["squares"], ns["empty"], ns["single"]), (15, 55, 0, 4))
        self.assertTrue(ns["gauss_ok"] and ns["squares_ok"] and ns["odd_ok"] and ns["geometric_ok"])
        self.assertEqual((ns["geometric"], ns["all_ones"]), (Fraction(31, 16), 5))
        self.assertEqual((ns["correct"], ns["stops_early"], ns["slid_window"]), (25, 16, 15))
        self.assertTrue(ns["index_error"] and ns["silent_wrap"])
        # the same values as the oracle's independent computation
        self.assertEqual(oracle.fstr(ns["total"]), total("identity", 1, 5))
        self.assertEqual(oracle.fstr(ns["geometric"]), total("geometric", 0, 4, r=Fraction(1, 2)))
        self.assertEqual(oracle.fstr(ns["correct"]), total("odd", 1, 5))
        v = oracle.variant_case("odd", 1, 5)["expected"]["variants"]
        self.assertEqual(oracle.fstr(ns["stops_early"]), v["stop-excluded"]["total"])
        self.assertEqual(oracle.fstr(ns["slid_window"]), v["start-shifted"]["total"])
        self.assertEqual(v["list-unshifted"]["error"], "IndexError")

    def test_nested_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "summation_nested.py"))
        self.assertEqual((ns["rows_first"], ns["columns_first"], ns["cells"]), (60, 60, 12))
        self.assertTrue(ns["same_total"] and ns["triangle_ok"] and ns["wrong_same_here"] and ns["wrong_differs"])
        self.assertEqual((ns["by_rows"], ns["by_columns"], ns["lower"], ns["upper_wrong"]), (65, 65, 13, 4))
        self.assertEqual(oracle.nested_case("rectangular", "product", "rows-first", 3, 4)["expected"]["total"], ns["rows_first"])
        self.assertEqual(oracle.nested_case("triangular", "product", "columns-first", 4, 4)["expected"]["total"], ns["by_columns"])
        self.assertEqual(oracle.nested_case("triangular", "table", "rows-first", 3, 3)["expected"]["total"], ns["lower"])

    @unittest.skipIf(oracle_np is None, "NumPy not installed (run `npm run oracle:setup`)")
    def test_numpy_float_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "summation_numpy_float.py"))
        self.assertEqual((ns["total_int"], ns["squares"]), (55, 385))
        self.assertEqual((ns["dot"], ns["mean"]), (7.0, 8.0))
        self.assertEqual((ns["lost"], ns["kept"]), (0.0, 1.0))
        self.assertEqual(ns["naive_sum"], 0.9999999999999999)
        self.assertTrue(ns["careful_is_one"] and not ns["naive_is_one"])
        self.assertTrue(ns["pairwise_wins"])
        self.assertEqual(ns["total_int"], int(total("identity", 1, 10).split("/")[0]))
        self.assertEqual(ns["squares"], int(total("square", 1, 10).split("/")[0]))


if __name__ == "__main__":
    unittest.main()
