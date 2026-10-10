"""Self-test of the sets oracle against LITERAL values — worked by hand (never against values the oracle computed itself; plan §12.3) —
and execution of the Python reference files shown on the chapter page."""
import runpy
import sys
import unittest
from fractions import Fraction
from itertools import product
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sets_oracle as oracle  # noqa: E402

try:
    import numpy as oracle_np  # type: ignore  # noqa: F401
except ImportError:  # pragma: no cover
    oracle_np = None

ROOT = Path(__file__).resolve().parent.parent
S = oracle.spec


def text(op: str, a: dict, b: dict) -> str:
    return oracle.interval_case("t", a, b)["expected"][op]["text"]


class FractionsAndText(unittest.TestCase):
    def test_decimal_text_is_read_exactly(self):
        self.assertEqual(oracle.fstr(oracle.frac("0.1")), "1/10")
        self.assertEqual(oracle.fstr(oracle.frac("-2.75")), "-11/4")
        self.assertEqual(oracle.fstr(oracle.frac("1/3")), "1/3")
        self.assertNotEqual(Fraction(0.1), Fraction("0.1"))  # the double 0.1 is not one tenth

    def test_display_rule(self):
        cases = {"0": "0", "5": "5", "-3": "−3", "0.1": "0.1", "-2.75": "−2.75", "1/3": "1/3", "2/3": "2/3", "0.5": "0.5", "1/7": "1/7", "1/64": "0.015625", "1/128": "1/128"}
        for given, shown in cases.items():
            self.assertEqual(oracle.display(oracle.frac(given)), shown, given)


class IntervalTable(unittest.TestCase):
    """The adjacency table, worked by hand."""

    def test_unions(self):
        self.assertEqual(text("union", S(0, 1, False, False), S(1, 2, False, False)), "(0, 1) ∪ (1, 2)")
        self.assertEqual(text("union", S(0, 1, True, False), S(1, 2, False, True)), "[0, 1) ∪ (1, 2]")
        self.assertEqual(text("union", S(0, 1, True, True), S(1, 2, False, False)), "[0, 2)")
        self.assertEqual(text("union", S(0, 1, True, False), S(1, 2, True, True)), "[0, 2]")
        self.assertEqual(text("union", S(0, 1, True, True), S(1, 2, True, True)), "[0, 2]")

    def test_intersections(self):
        self.assertEqual(text("intersection", S(0, 1, True, True), S(1, 2, True, True)), "{1}")
        self.assertEqual(text("intersection", S(0, 1, True, False), S(1, 2, True, True)), "∅")
        self.assertEqual(text("intersection", S(0, 3, True, True), S(1, 2, False, False)), "(1, 2)")

    def test_complements(self):
        self.assertEqual(text("complement-a", S(1, 1, True, True), S(0, 0, True, True)), "(−∞, 1) ∪ (1, ∞)")
        self.assertEqual(text("complement-a", S(None, None, False, False), S(0, 0, True, True)), "∅")
        self.assertEqual(text("complement-a", S(1, 0, True, True), S(0, 0, True, True)), "ℝ")  # the empty set's complement
        self.assertEqual(text("complement-a", S(0, 1, True, False), S(0, 0, True, True)), "(−∞, 0) ∪ [1, ∞)")

    def test_reversed_and_excluded_point_are_empty(self):
        case = oracle.interval_case("t", S(3, 1, True, True), S(1, 1, False, True))
        self.assertTrue(case["expected"]["emptyA"])
        self.assertTrue(case["expected"]["emptyB"])
        self.assertEqual(case["expected"]["union"]["text"], "∅")

    def test_decimals(self):
        self.assertEqual(text("union", S("0.1", "0.3", True, True), S("0.2", "0.5", False, True)), "[0.1, 0.5]")
        self.assertEqual(text("intersection", S("0.1", "0.3", True, True), S("0.2", "0.5", False, True)), "(0.2, 0.3]")
        self.assertEqual(text("a-minus-b", S(0, 10, True, True), S(2, 3, False, False)), "[0, 2] ∪ [3, 10]")


class CellDecompositionAgreesWithInequalities(unittest.TestCase):
    def test_every_case_is_consistent_with_raw_membership_at_endpoints_and_midpoints(self):
        probes = [Fraction(n, 4) for n in range(-12, 13)]
        for case in oracle.interval_cases():
            a = {k: (None if case["a"][k] is None else Fraction(case["a"][k])) if k in ("lo", "hi") else case["a"][k] for k in case["a"]}
            b = {k: (None if case["b"][k] is None else Fraction(case["b"][k])) if k in ("lo", "hi") else case["b"][k] for k in case["b"]}
            for x in probes:
                for op, formula in (("union", lambda p, q: p or q), ("intersection", lambda p, q: p and q), ("a-minus-b", lambda p, q: p and not q)):
                    pieces = [
                        {"lo": None if q["lo"] is None else Fraction(q["lo"]), "hi": None if q["hi"] is None else Fraction(q["hi"]), "loClosed": q["loClosed"], "hiClosed": q["hiClosed"]}
                        for q in case["expected"][op]["pieces"]
                    ]
                    got = any(oracle.raw_member(p, x) for p in pieces)
                    self.assertEqual(got, formula(oracle.raw_member(a, x), oracle.raw_member(b, x)), f"{case['id']} {op} at {x}")

    def test_pieces_are_maximal(self):
        for case in oracle.interval_cases():
            for op in ("union", "intersection", "a-minus-b", "complement-a"):
                ps = case["expected"][op]["pieces"]
                for left, right in zip(ps, ps[1:]):
                    self.assertTrue(Fraction(left["hi"]) <= Fraction(right["lo"]))
                    if left["hi"] == right["lo"]:
                        self.assertFalse(left["hiClosed"] or right["loClosed"], f"{case['id']}: {op} could have been merged")


class FiniteProductsRelations(unittest.TestCase):
    def test_canonical_finite_state(self):
        c = oracle.finite_case(frozenset(range(1, 6)), frozenset(range(4, 8)))["expected"]
        self.assertEqual(c["union"], [1, 2, 3, 4, 5, 6, 7])
        self.assertEqual(c["intersection"], [4, 5])
        self.assertEqual(c["symmetric"], [1, 2, 3, 6, 7])
        self.assertEqual(c["complementA"], [6, 7, 8, 9, 10, 11, 12])
        self.assertEqual(c["witnessAB"], 1)
        self.assertEqual(c["witnessBA"], 6)
        self.assertTrue(c["inclusionExclusion"] and c["deMorganFirst"] and c["deMorganSecond"])

    def test_every_finite_case_satisfies_the_identities(self):
        for case in oracle.finite_cases():
            e = case["expected"]
            self.assertTrue(e["inclusionExclusion"] and e["deMorganFirst"] and e["deMorganSecond"])
            self.assertEqual(len(e["onlyA"]) + len(e["both"]) + len(e["onlyB"]) + len(e["neither"]), 12)

    def test_product_by_hand(self):
        c = oracle.product_case(frozenset({1, 2, 3}), frozenset({3, 4}))["expected"]
        self.assertEqual(c["count"], 6)
        self.assertEqual(c["pairs"], [[1, 3], [1, 4], [2, 3], [2, 4], [3, 3], [3, 4]])
        self.assertFalse(c["commutes"])
        self.assertFalse(c["theorem"])
        self.assertTrue(oracle.product_case(frozenset(), frozenset({1}))["expected"]["commutes"])

    def test_commutes_exactly_when_the_theorem_says(self):
        for case in oracle.product_cases():
            self.assertEqual(case["expected"]["commutes"], case["expected"]["theorem"])
            self.assertEqual(case["expected"]["count"], len(case["a"]) * len(case["b"]))

    def test_relation_by_hand(self):
        lt = {(a, b) for a, b in product(range(1, 5), range(1, 5)) if a < b}
        e = oracle.relation_case("t", 4, 4, lt)["expected"]
        self.assertEqual((e["reflexive"], e["symmetric"], e["antisymmetric"], e["transitive"], e["equivalence"]), (False, False, True, True, False))
        parity = {(a, b) for a, b in product(range(1, 6), range(1, 6)) if (a - b) % 2 == 0}
        e = oracle.relation_case("t", 5, 5, parity)["expected"]
        self.assertEqual((e["reflexive"], e["symmetric"], e["antisymmetric"], e["transitive"], e["equivalence"]), (True, True, False, True, True))
        self.assertEqual(e["classes"], [[1, 3, 5], [2, 4]])
        func = oracle.relation_case("t", 3, 2, {(1, 1), (2, 2), (3, 1)})["expected"]
        self.assertTrue(func["isFunction"])
        none = oracle.relation_case("t", 2, 2, {(1, 1), (1, 2)})["expected"]
        self.assertEqual(none["functionFailure"], {"a": 1, "kind": "many", "images": [1, 2]})
        self.assertIsNone(oracle.relation_case("t", 3, 2, set())["expected"]["reflexive"])
        self.assertEqual(oracle.relation_case("t", 1, 1, set())["expected"]["presets"], ["less", "empty"])  # coincide on a single element
        self.assertEqual(oracle.relation_case("t", 3, 3, {(1, 2)})["expected"]["presets"], [])

    def test_divides_is_a_partial_order_on_positive_integers(self):
        for n in range(1, 7):
            pairs = {(a, b) for a in range(1, n + 1) for b in range(1, n + 1) if b % a == 0}
            e = oracle.relation_case("t", n, n, pairs)["expected"]
            self.assertTrue(e["reflexive"] and e["antisymmetric"] and e["transitive"])
            self.assertEqual(e["symmetric"], n == 1)


class ReferenceCode(unittest.TestCase):
    """The code shown on the page is the code that runs here (plan §13 D)."""

    def test_finite_and_relations_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "sets_finite.py"))
        self.assertEqual(ns["union"], {1, 2, 3, 4, 5, 6, 7})
        self.assertEqual(ns["intersection"], {4, 5})
        self.assertEqual(ns["a_minus_b"], {1, 2, 3})
        self.assertEqual(ns["symmetric"], {1, 2, 3, 6, 7})
        self.assertEqual(ns["complement_a"], {6, 7, 8, 9, 10, 11, 12})
        self.assertTrue(ns["inclusion_exclusion"] and ns["de_morgan_union"] and ns["de_morgan_intersection"])
        self.assertFalse(ns["a_in_b"])
        self.assertTrue(ns["small_in_a"] and ns["empty_is_subset"] and ns["product_size_ok"])
        self.assertFalse(ns["commutes"])
        self.assertFalse(ns["reflexive"])
        self.assertTrue(ns["transitive"] and ns["symmetric_parity"])
        self.assertEqual(ns["classes"], {frozenset({1, 3}), frozenset({2, 4})})
        # the oracle's own answer for the same sets
        c = oracle.finite_case(frozenset(range(1, 6)), frozenset(range(4, 8)))["expected"]
        self.assertEqual(sorted(ns["union"]), c["union"])
        self.assertEqual(sorted(ns["complement_a"]), c["complementA"])

    def test_intervals_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "sets_intervals.py"))
        self.assertEqual(ns["double_sum"], 0.30000000000000004)
        self.assertFalse(ns["float_test"])
        self.assertTrue(ns["exact_test"])
        self.assertFalse(ns["joined_ab"])
        self.assertTrue(ns["joined_ac"])
        self.assertFalse(ns["one_in_union"])
        self.assertTrue(ns["reversed_is_empty"] and ns["open_point_is_empty"])
        self.assertFalse(ns["point_is_not_empty"])
        # agrees with the oracle's cell-decomposition answers for the same unions
        self.assertEqual(text("union", S(0, 1, True, False), S(1, 2, False, True)), "[0, 1) ∪ (1, 2]")
        self.assertEqual(text("union", S(0, 1, True, False), S(1, 2, True, True)), "[0, 2]")
        pitfall = oracle.float_pitfall()
        self.assertEqual(pitfall["doubleSum"], ns["double_sum"])
        self.assertEqual(pitfall["closedIntervalContainsDoubleSum"], ns["float_test"])
        self.assertEqual(pitfall["closedIntervalContainsExactSum"], ns["exact_test"])

    @unittest.skipIf(oracle_np is None, "NumPy not installed (run `npm run oracle:setup`)")
    def test_numpy_masks_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "sets_numpy_masks.py"))
        self.assertTrue(ns["disjoint"] and ns["covers"] and ns["count_matches"] and ns["complement_ok"] and ns["inside"] and ns["grid_size_ok"])
        self.assertEqual([float(v) for v in ns["clipped"]], [0.0, 0.0, 0.5, 1.0, 1.0])
        every = [int(v) for v in (*ns["train"], *ns["val"], *ns["test"])]
        self.assertEqual(sorted(every), list(range(10)))  # each row in exactly one split


if __name__ == "__main__":
    unittest.main()
