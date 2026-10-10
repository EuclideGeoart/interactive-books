"""Self-test of the I.1 oracle against LITERAL values, worked by hand, never against values the oracle computed itself (plan §12.3).
Also runs the reference files shown on the quantities page: what the reader sees is what runs here."""
import cmath
import math
import runpy
import sys
import unittest
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import quantity_oracle as oracle  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
F = Fraction


def root(a, n):
    return oracle.real_root(F(a), n)


class FactorisationAndBisection(unittest.TestCase):
    def test_factorize_literals(self):
        self.assertEqual(oracle.factorize(360), {2: 3, 3: 2, 5: 1})
        self.assertEqual(oracle.factorize(1), {})
        self.assertEqual(oracle.factorize(97), {97: 1})
        self.assertEqual(oracle.factorize(2**10 * 3**5), {2: 10, 3: 5})
        # a product of two primes larger than the trial-division bound (1009 and 10007), found by Pollard rho
        self.assertEqual(oracle.factorize(1009 * 10007), {1009: 1, 10007: 1})

    def test_probable_prime_literals(self):
        for p in (2, 3, 97, 7919, 1000003):
            self.assertTrue(oracle.is_probable_prime(p), p)
        for c in (1, 4, 91, 561, 1105, 1000001):  # 561 and 1105 are Carmichael numbers
            self.assertFalse(oracle.is_probable_prime(c), c)

    def test_integer_root_by_bisection(self):
        self.assertEqual(oracle.iroot_bisect(10**30, 2), 10**15)
        self.assertEqual(oracle.iroot_bisect(10**30 - 1, 2), 10**15 - 1)
        self.assertEqual(oracle.iroot_bisect(1000, 3), 10)
        self.assertEqual(oracle.iroot_bisect(999, 3), 9)


class RootsInRadicalForm(unittest.TestCase):
    """a*(b)^(1/n)/c with b free of n-th powers; a carries the sign."""

    def test_square_roots_worked_by_hand(self):
        self.assertEqual((root(12, 2)["a"], root(12, 2)["b"], root(12, 2)["c"]), (2, 3, 1))  # 12 = 4*3
        self.assertEqual((root(F(8, 9), 2)["a"], root(F(8, 9), 2)["b"], root(F(8, 9), 2)["c"]), (2, 2, 3))  # 8/9: 2*sqrt(2)/3
        self.assertEqual((root(F(1, 2), 2)["a"], root(F(1, 2), 2)["b"], root(F(1, 2), 2)["c"]), (1, 2, 2))  # sqrt(1/2) = sqrt(2)/2
        self.assertEqual((root(F("2.25"), 2)["a"], root(F("2.25"), 2)["b"], root(F("2.25"), 2)["c"]), (3, 1, 2))  # 9/4: 3/2
        self.assertEqual((root(F("143.99"), 2)["a"], root(F("143.99"), 2)["b"], root(F("143.99"), 2)["c"]), (11, 119, 10))  # 14399 = 11^2 * 119

    def test_perfect_squares_are_rational(self):
        for n, want in [(0, 0), (1, 1), (4, 2), (49, 7), (10**8, 10**4)]:
            r = root(n, 2)
            self.assertEqual((r["a"], r["b"], r["c"]), (want, 1, 1), n)

    def test_cube_roots_keep_the_sign(self):
        r = root(-8, 3)
        self.assertEqual((r["a"], r["b"], r["c"]), (-2, 1, 1))
        r = root(54, 3)  # 54 = 27*2
        self.assertEqual((r["a"], r["b"], r["c"]), (3, 2, 1))
        r = root(-54, 3)
        self.assertEqual((r["a"], r["b"], r["c"]), (-3, 2, 1))
        r = root(F(1, 4), 3)  # cbrt(1/4) = cbrt(2)/2
        self.assertEqual((r["a"], r["b"], r["c"]), (1, 2, 2))

    def test_fourth_and_fifth_roots(self):
        r = root(48, 4)  # 48 = 16*3
        self.assertEqual((r["a"], r["b"], r["c"]), (2, 3, 1))
        r = root(F(32), 5)
        self.assertEqual((r["a"], r["b"], r["c"]), (2, 1, 1))
        r = root(-32, 5)
        self.assertEqual((r["a"], r["b"], r["c"]), (-2, 1, 1))

    def test_even_root_of_negative_has_no_real_value(self):
        self.assertEqual(oracle.root_case_expected(F(-4), 2)["kind"], "undefined")
        self.assertEqual(oracle.root_case_expected(F(-16), 4)["kind"], "undefined")
        self.assertEqual(oracle.root_case_expected(F(-8), 3)["kind"], "exact")

    def test_guard_policy(self):
        # a prime far beyond 100000^3 is not attempted for n = 2: numeric only
        big_prime = 1000000007 * 10**10 + 19  # not required to be prime: its radical form is outside the guard anyway
        self.assertEqual(oracle.root_case_expected(F(big_prime), 2)["kind"], "numeric")
        # a perfect square beyond the guard is still exact
        self.assertEqual(oracle.root_case_expected(F(10**40), 2)["kind"], "exact")

    def test_approximations_are_the_nearest_double(self):
        self.assertEqual(oracle.root_case_expected(F(2), 2)["approx"], 1.4142135623730951)
        self.assertEqual(oracle.root_case_expected(F(13), 2)["approx"], 3.605551275463989)
        self.assertEqual(oracle.root_case_expected(F(2), 3)["approx"], 1.2599210498948732)
        self.assertEqual(oracle.root_case_expected(F(-2), 3)["approx"], -1.2599210498948732)


class PowersAndRules(unittest.TestCase):
    def test_power_literals(self):
        self.assertEqual(oracle.power_expected(F(2), -3), {"kind": "value", "num": "1", "den": "8"})
        self.assertEqual(oracle.power_expected(F(-2), 3), {"kind": "value", "num": "-8", "den": "1"})
        self.assertEqual(oracle.power_expected(F(-2), -3), {"kind": "value", "num": "-1", "den": "8"})
        self.assertEqual(oracle.power_expected(F("0.5"), -2), {"kind": "value", "num": "4", "den": "1"})
        self.assertEqual(oracle.power_expected(F(7), 0), {"kind": "value", "num": "1", "den": "1"})
        self.assertEqual(oracle.power_expected(F(0), 3), {"kind": "value", "num": "0", "den": "1"})

    def test_zero_cases_are_undefined(self):
        self.assertEqual(oracle.power_expected(F(0), 0)["kind"], "undefined")
        self.assertEqual(oracle.power_expected(F(0), -2)["kind"], "undefined")

    def test_rules_hold_whenever_both_sides_exist(self):
        by_id = {r["id"]: r for r in oracle.rules_expected(F(2), 3, 4)}
        self.assertTrue(by_id["product"]["applies"] and by_id["product"]["equal"])  # 2^3 * 2^4 = 2^7
        self.assertTrue(by_id["power-of-power"]["applies"] and by_id["power-of-power"]["equal"])  # (2^3)^4 = 2^12
        self.assertTrue(by_id["zero"]["applies"] and by_id["zero"]["equal"])

    def test_zero_base_loses_rules_not_truth(self):
        # 0^(-1) is undefined, so the product rule 0^(-1) * 0^1 = 0^0 simply does not apply: no rule is ever false
        by_id = {r["id"]: r for r in oracle.rules_expected(F(0), -1, 1)}
        self.assertFalse(by_id["product"]["applies"])
        self.assertFalse(by_id["negative"]["applies"])
        for case in oracle.rule_cases():
            i = case["input"]
            for r in oracle.rules_expected(F(i["base"]), i["m"], i["n"]):
                if r["applies"]:
                    self.assertTrue(r["equal"], case["id"])

    def test_the_power_of_power_counterexample(self):
        # (0^(-1))^(-1) is undefined (inner side), but 0^((-1)(-1)) = 0^1 = 0: the two sides do not even both exist
        by_id = {r["id"]: r for r in oracle.rules_expected(F(0), -1, -1)}
        self.assertFalse(by_id["power-of-power"]["applies"])


class Units(unittest.TestCase):
    L, T, M = (1, 0, 0), (0, 1, 0), (0, 0, 1)

    def test_unit_strings(self):
        self.assertEqual(oracle.unit_string((1, 0, 0)), "m")
        self.assertEqual(oracle.unit_string((2, 0, 0)), "m²")
        self.assertEqual(oracle.unit_string((1, -1, 0)), "m/s")
        self.assertEqual(oracle.unit_string((1, -2, 1)), "kg·m/s²")
        self.assertEqual(oracle.unit_string((0, -1, 0)), "1/s")
        self.assertEqual(oracle.unit_string((0, -1, -1)), "1/(kg·s)")
        self.assertEqual(oracle.unit_string((0, 0, 0)), "")

    def test_operations(self):
        three_m = (F(3), self.L)
        out = oracle.unit_expected("multiply", three_m, three_m)
        self.assertEqual((out["ok"], out["num"], out["den"], out["dim"], out["unit"]), (True, "9", "1", [2, 0, 0], "m²"))
        out = oracle.unit_expected("divide", (F(12), self.L), (F(4), self.T))
        self.assertEqual((out["num"], out["dim"], out["unit"]), ("3", [1, -1, 0], "m/s"))
        out = oracle.unit_expected("divide", three_m, three_m)
        self.assertEqual((out["num"], out["dim"], out["unit"]), ("1", [0, 0, 0], ""))
        out = oracle.unit_expected("square", three_m, three_m)
        self.assertEqual((out["num"], out["dim"]), ("9", [2, 0, 0]))
        out = oracle.unit_expected("root", (F(9), (2, 0, 0)), three_m)
        self.assertEqual((out["ok"], out["kind"], out["num"], out["den"], out["dim"], out["unit"]), (True, "rational", "3", "1", [1, 0, 0], "m"))
        out = oracle.unit_expected("root", (F(2), (2, 0, 0)), three_m)  # sqrt(2 m^2) = sqrt(2) m
        self.assertEqual((out["kind"], out["a"], out["b"], out["c"], out["unit"]), ("root", "1", "2", "1", "m"))

    def test_refusals(self):
        three_m = (F(3), self.L)
        self.assertFalse(oracle.unit_expected("add", three_m, (F(2), self.T))["ok"])  # m + s
        self.assertFalse(oracle.unit_expected("add", three_m, (F(2), (2, 0, 0)))["ok"])  # m + m²
        self.assertFalse(oracle.unit_expected("root", (F(3), self.L), three_m)["ok"])  # sqrt(m): odd exponent
        self.assertFalse(oracle.unit_expected("root", (F(-9), (2, 0, 0)), three_m)["ok"])  # negative value
        self.assertFalse(oracle.unit_expected("divide", three_m, (F(0), self.T))["ok"])  # division by zero


class Squares(unittest.TestCase):
    def test_side_mode_loses_the_sign(self):
        out = oracle.square_expected("side", F(-3))
        self.assertEqual(out["square"], ["9", "1"])
        self.assertEqual(out["rootOfSquare"], ["3", "1"])  # |-3|, not -3
        self.assertTrue(out["signLost"])
        self.assertFalse(oracle.square_expected("side", F(3))["signLost"])

    def test_area_mode_solution_counts(self):
        self.assertEqual(oracle.square_expected("area", F(0))["solutions"], 1)
        self.assertEqual(oracle.square_expected("area", F(9))["solutions"], 2)
        self.assertEqual(oracle.square_expected("area", F(-1))["solutions"], 0)
        out = oracle.square_expected("area", F(2))  # irrational: sqrt(2)
        self.assertEqual((out["kind"], out["a"], out["b"], out["c"], out["roundTrip"]), ("exact", "1", "2", "1", True))


class Fixture(unittest.TestCase):
    def test_committed_fixture_is_fresh(self):
        self.assertEqual(oracle.main(["--check"]), 0)

    def test_generation_is_deterministic(self):
        self.assertEqual(oracle.render(oracle.build_fixture()), oracle.render(oracle.build_fixture()))

    def test_fixture_size(self):
        data = oracle.build_fixture()
        self.assertGreater(len(data["roots"]), 700)
        self.assertGreater(len(data["rules"]), 400)


class ReferenceCode(unittest.TestCase):
    """The code shown on the page is the code that runs here (plan §13 D)."""

    def test_exact_roots_example(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "quantity_exact_roots.py"))
        self.assertEqual(ns["side_of_area_9"], (3, 1, 1))
        self.assertEqual(ns["side_of_area_12"], (2, 3, 1))  # 2*sqrt(3)
        self.assertEqual(ns["side_of_area_8_9"], (2, 2, 3))  # 2*sqrt(2)/3, reduced
        self.assertEqual(ns["side_of_area_2_25"], (3, 1, 2))  # 3/2
        self.assertIsNone(ns["side_of_area_negative"])
        self.assertEqual(ns["round_trip"], F(8, 9))
        self.assertEqual(ns["exact_floor"], 10**15)
        self.assertEqual(ns["simplify_sqrt"](72), (6, 2))  # 72 = 36*2, worked by hand
        self.assertEqual(ns["simplify_sqrt"](0), (1, 0))
        # and it agrees with the oracle's factorisation-based algorithm on a sweep
        for n in range(0, 400):
            a, b = ns["simplify_sqrt"](n)
            r = oracle.real_root(F(n), 2)
            self.assertEqual((a, b), (r["a"], r["b"]) if n else (1, 0), n)

    def test_units_example(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "quantity_units.py"))
        self.assertEqual(ns["area"], (9.0, (2, 0, 0)))
        self.assertEqual(ns["speed"], (3.0, (1, -1, 0)))
        self.assertEqual(ns["back_to_side"], (3.0, (1, 0, 0)))
        self.assertEqual(ns["ratio"], (1.0, (0, 0, 0)))
        self.assertIn("cannot add units", ns["refused_sum"])
        self.assertIn("fractional exponent", ns["refused_root"])

    def test_float_pitfalls_example(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "quantity_float_pitfalls.py"))
        self.assertEqual(ns["square_of_point_one"], 0.010000000000000002)
        self.assertNotEqual(ns["square_of_point_one"], 0.01)
        self.assertFalse(ns["exactly_equal"])
        self.assertEqual(ns["squared_root_of_two"], 2.0000000000000004)
        self.assertTrue(ns["close_enough"])
        self.assertEqual(ns["real_sqrt_of_negative"], "math domain error")
        self.assertEqual(ns["complex_sqrt"], 1j)
        self.assertEqual(ns["complex_sqrt"], cmath.sqrt(-1))
        self.assertIsInstance(ns["cube_root_attempt"], complex)
        self.assertAlmostEqual(ns["cube_root_attempt"].real, 1.0, places=12)  # half of 2*(1/2) ... worked: 2*cos(pi/3) = 1
        self.assertAlmostEqual(ns["cube_root_attempt"].imag, math.sqrt(3), places=12)  # 2*sin(pi/3)
        self.assertEqual(ns["real_cube_root"], -2.0)
        self.assertEqual(ns["big_power"], 515377520732011331036461129765621272702107522001)
        self.assertEqual(ns["zero_negative_power"], "ZeroDivisionError")


if __name__ == "__main__":
    unittest.main()
