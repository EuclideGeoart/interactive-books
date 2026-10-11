"""Self-test of the function-families oracle against LITERAL values — worked by hand, taken from tables, or produced by the C library
(never against values the oracle computed itself; plan §12.3) — and execution of the Python reference files shown on the chapter page."""
import math
import random
import runpy
import sys
import unittest
from decimal import Decimal as D, getcontext
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import families_oracle as oracle  # noqa: E402

try:
    import numpy as oracle_np  # type: ignore  # noqa: F401
except ImportError:  # pragma: no cover
    oracle_np = None

ROOT = Path(__file__).resolve().parent.parent
MINUS = "−"

# Several oracles set the process-wide Decimal context when they are imported (quantity 80 digits, functions and algebra 60), and
# `unittest discover` imports every test module before running any. The families oracle needs its own 90 digits and exponent range while
# its tests run, whatever was imported last, so the context is set for this module and restored afterwards.
_SAVED_CONTEXT = None


def setUpModule():
    global _SAVED_CONTEXT
    ctx = getcontext()
    _SAVED_CONTEXT = (ctx.prec, ctx.Emax, ctx.Emin)
    ctx.prec, ctx.Emax, ctx.Emin = 90, 10**7, -(10**7)


def tearDownModule():
    ctx = getcontext()
    ctx.prec, ctx.Emax, ctx.Emin = _SAVED_CONTEXT


class HighPrecisionPrimitives(unittest.TestCase):
    def test_pi_matches_the_known_digits(self):
        known = "3.14159265358979323846264338327950288419716939937510582097494459230781640628620899"
        self.assertEqual(str(oracle.PI)[:80], known[:80])

    def test_e_and_ln2_match_the_known_digits(self):
        self.assertEqual(str(oracle.dexp(D(1)))[:41], "2.718281828459045235360287471352662497757")
        self.assertEqual(str(oracle.dln(D(2)))[:41], "0.693147180559945309417232121458176568075")

    def test_sin_and_cos_of_1_to_the_digits_in_a_table(self):
        # sin 1 = 0.8414709848078965066525023216302989996, cos 1 = 0.5403023058681397174009366074429766037
        self.assertEqual(str(oracle.dsin(D(1)))[:38], "0.8414709848078965066525023216302989996"[:38])
        self.assertEqual(str(oracle.dcos(D(1)))[:38], "0.5403023058681397174009366074429766037"[:38])

    def test_sine_vanishes_at_multiples_of_pi_and_cosine_at_odd_multiples_of_half_pi(self):
        for n in range(-6, 7):
            self.assertLess(abs(oracle.dsin(n * oracle.PI)), D(10) ** -80)
            self.assertLess(abs(oracle.dcos((2 * n + 1) * oracle.PI / 2)), D(10) ** -80)

    def test_series_agree_with_the_c_library_over_a_sweep(self):
        rnd = random.Random(1)
        for _ in range(500):
            x = rnd.uniform(-700, 700)
            self.assertAlmostEqual(float(oracle.dsin(D(x))), math.sin(x), delta=1e-15)
            self.assertAlmostEqual(float(oracle.dcos(D(x))), math.cos(x), delta=1e-15)
            self.assertAlmostEqual(float(oracle.dexp(D(x / 100))) / math.exp(x / 100), 1.0, delta=3e-16)
            self.assertAlmostEqual(float(oracle.dln(D(abs(x) + 0.001))) - math.log(abs(x) + 0.001), 0.0, delta=3e-15)

    def test_pythagorean_identity_to_80_digits(self):
        for x in (D("0.1"), D(1), D("2.5"), D(100), D(-7)):
            self.assertLess(abs(oracle.dsin(x) ** 2 + oracle.dcos(x) ** 2 - 1), D(10) ** -80)


class ExactSpecialAngles(unittest.TestCase):
    def test_sin_30_degrees_is_one_half(self):
        e = oracle.circle_exact(2)
        self.assertEqual(e["sin"]["text"], "1/2")
        self.assertEqual(e["cos"]["text"], "√3/2")
        self.assertEqual(e["sin"]["numeric"], 0.5)
        self.assertEqual(e["piMultiple"], "π/6")
        self.assertEqual(e["degrees"], 30)

    def test_cos_15_degrees_is_the_table_value(self):
        e = oracle.circle_exact(1)
        self.assertEqual(e["cos"]["text"], "(√6+√2)/4")
        self.assertEqual(e["sin"]["text"], "(√6−√2)/4")
        self.assertAlmostEqual(e["cos"]["numeric"], 0.9659258262890683, places=16)  # cos 15° from a table
        self.assertAlmostEqual(e["sin"]["numeric"], 0.2588190451025207623, places=15)
        self.assertEqual(e["sin2"]["text"], "(2−√3)/4")  # sin² 15° = (1 − cos 30°)/2 = (2 − √3)/4, worked by hand

    def test_5pi_over_6_is_quadrant_two_with_reference_angle_pi_over_6(self):
        e = oracle.circle_exact(10)
        self.assertEqual((e["location"], e["referenceIndex"]), ("II", 2))
        self.assertEqual((e["sin"]["text"], e["cos"]["text"]), ("1/2", MINUS + "√3/2"))
        self.assertEqual(e["arcsinRepresentative"], 2)  # arcsin(1/2) = π/6, not 5π/6
        self.assertEqual(e["atan2Representative"], 10)  # atan2 does return 5π/6
        self.assertFalse(e["returnsThetaArcsin"])
        self.assertTrue(e["returnsThetaAtan2"])

    def test_axes_have_exact_zero_components(self):
        for k, loc, sin, cos in [(0, "+x", "0", "1"), (6, "+y", "1", "0"), (12, "+x".replace("+", MINUS), "0", MINUS + "1"), (18, MINUS + "y", MINUS + "1", "0")]:
            e = oracle.circle_exact(k)
            self.assertEqual((e["location"], e["sin"]["text"], e["cos"]["text"]), (loc, sin, cos), k)
            self.assertIn(0.0, (e["sin"]["numeric"], e["cos"]["numeric"]))  # exactly 0.0, not 6e-17

    def test_pi_is_plus_pi_for_atan2_and_negative_pi_is_the_same_direction(self):
        self.assertEqual(oracle.circle_exact(12)["atan2Representative"], 12)
        self.assertEqual(oracle.circle_exact(-12)["atan2Representative"], 12)
        self.assertEqual(oracle.circle_exact(13)["atan2Representative"], -11)

    def test_two_pi_periodicity_and_pi_multiples_in_lowest_terms(self):
        for k in range(-24, 1):
            a, b = oracle.circle_exact(k), oracle.circle_exact(k + 24)
            self.assertEqual((a["sin"]["text"], a["cos"]["text"]), (b["sin"]["text"], b["cos"]["text"]))
        self.assertEqual([oracle.pi_multiple_text(k) for k in (0, 1, 3, 4, 8, 12, 18, 24, -3)], ["0", "π/12", "π/4", "π/3", "2π/3", "π", "3π/2", "2π", MINUS + "π/4"])

    def test_every_table_label_matches_exactly_one_value(self):
        for table in (oracle.SIGNED, oracle.SQUARES):
            for i, (_, v) in enumerate(table):
                for j, (_, w) in enumerate(table):
                    if i != j:
                        self.assertGreater(abs(v - w), D("0.01"))


class FreeAngles(unittest.TestCase):
    def test_one_radian(self):
        e = oracle.circle_free(1.0)
        self.assertAlmostEqual(e["cos"]["value"], 0.5403023058681398, places=16)
        self.assertAlmostEqual(e["sin"]["value"], 0.8414709848078965, places=16)
        self.assertEqual(e["location"], "I")
        self.assertAlmostEqual(e["degrees"], 57.29577951308232, places=13)  # 180/π, a well-known constant
        self.assertTrue(e["returnsThetaArcsin"] and e["returnsThetaAtan2"])

    def test_two_radians_arcsin_gives_pi_minus_two(self):
        e = oracle.circle_free(2.0)
        self.assertAlmostEqual(e["arcsinOfSin"], math.pi - 2, places=14)
        self.assertFalse(e["returnsThetaArcsin"])
        self.assertAlmostEqual(e["atan2OfComponents"], 2.0, places=14)

    def test_four_radians_atan2_gives_four_minus_two_pi(self):
        e = oracle.circle_free(4.0)
        self.assertAlmostEqual(e["atan2OfComponents"], 4 - 2 * math.pi, places=14)  # −2.2831853071795862
        self.assertFalse(e["returnsThetaAtan2"])
        self.assertEqual(e["location"], "III")
        self.assertAlmostEqual(e["reduced"], 4.0, places=15)

    def test_boundaries_just_inside_and_outside_the_principal_ranges(self):
        self.assertTrue(oracle.circle_free(1.57)["returnsThetaArcsin"])  # 1.57 < π/2 = 1.5707963...
        self.assertFalse(oracle.circle_free(1.571)["returnsThetaArcsin"])  # 1.571 > π/2
        self.assertTrue(oracle.circle_free(3.141)["returnsThetaAtan2"])  # < π
        self.assertFalse(oracle.circle_free(3.142)["returnsThetaAtan2"])  # > π

    def test_zero_is_the_positive_x_axis(self):
        e = oracle.circle_free(0.0)
        self.assertEqual((e["location"], e["cos"]["value"], e["sin"]["value"]), ("+x", 1.0, 0.0))

    def test_periodicity_in_the_reduced_angle(self):
        for r in (-6.283, -3.0, 0.5, 2.0, 6.283):
            self.assertAlmostEqual(oracle.circle_free(r)["reduced"] % (2 * math.pi), r % (2 * math.pi), places=12)

    def test_input_precision_is_enforced(self):
        with self.assertRaises(AssertionError):
            oracle.circle_free(1.2345)


class ComparisonValues(unittest.TestCase):
    def test_shift_is_exact_decimal_arithmetic(self):
        self.assertNotEqual(0.3 - 0.1, 0.2)  # binary floating point: 0.19999999999999998
        e = oracle.evaluate_compare({"input": {"a": 1, "h": 0.1, "x": 0.3}})
        self.assertEqual(e["u"], "1/5")
        self.assertEqual(e["values"]["linear"], {"kind": "exact", "value": "1/5"})
        self.assertEqual(e["values"]["square"], {"kind": "exact", "value": "1/25"})

    def test_exact_values(self):
        v = oracle.evaluate_compare({"input": {"a": 2, "h": 0, "x": 0}})["values"]
        self.assertEqual(v["exp"], {"kind": "exact", "value": "2"})  # 2·e⁰
        self.assertEqual(v["cos"], {"kind": "exact", "value": "2"})
        self.assertEqual(v["sin"], {"kind": "exact", "value": "0"})
        self.assertEqual(v["ln"], {"kind": "undefined"})
        w = oracle.evaluate_compare({"input": {"a": 3, "h": 0, "x": 1}})["values"]
        self.assertEqual(w["ln"], {"kind": "exact", "value": "0"})  # ln 1

    def test_ln_is_undefined_at_and_below_the_shift(self):
        self.assertEqual(oracle.evaluate_compare({"input": {"a": 1, "h": 1, "x": 1}})["values"]["ln"], {"kind": "undefined"})
        self.assertEqual(oracle.evaluate_compare({"input": {"a": 1, "h": 1, "x": 1.01}})["values"]["ln"]["kind"], "numeric")

    def test_overflow_is_decided_in_exact_arithmetic(self):
        self.assertEqual(oracle.evaluate_compare({"input": {"a": 1, "h": 0, "x": 709.79}})["values"]["exp"], {"kind": "overflow"})
        self.assertEqual(oracle.evaluate_compare({"input": {"a": 1, "h": 0, "x": 709.78}})["values"]["exp"]["kind"], "numeric")
        self.assertEqual(oracle.evaluate_compare({"input": {"a": 0.01, "h": 0, "x": 713}})["values"]["exp"]["kind"], "numeric")  # 0.01·e^713 fits
        self.assertEqual(oracle.evaluate_compare({"input": {"a": 3, "h": 0, "x": 711}})["values"]["exp"], {"kind": "overflow"})

    def test_values_against_the_c_library(self):
        v = oracle.evaluate_compare({"input": {"a": 1.5, "h": 0, "x": 2}})["values"]
        self.assertAlmostEqual(v["exp"]["value"], 1.5 * math.exp(2), delta=1e-14)
        self.assertAlmostEqual(v["sin"]["value"], 1.5 * math.sin(2), delta=1e-15)
        self.assertAlmostEqual(v["cos"]["value"], 1.5 * math.cos(2), delta=1e-15)
        self.assertAlmostEqual(v["ln"]["value"], 1.5 * math.log(2), delta=1e-15)
        self.assertEqual(v["square"], {"kind": "exact", "value": "6"})

    def test_fixture_decimals_have_at_most_two_places(self):
        for c in oracle.compare_cases():
            for key, value in c["input"].items():
                self.assertEqual(round(value, 2), value, f"{c['id']}.{key}")


class RoundTrips(unittest.TestCase):
    def ev(self, family, order, x):
        return oracle.evaluate_roundtrip({"input": {"family": family, "order": order, "x": x}})

    def test_the_float_limits(self):
        self.assertAlmostEqual(oracle.EXP_LIMITS["overflowAbove"], 709.782712893384, places=12)  # ln(1.7976931348623157e308)
        self.assertAlmostEqual(oracle.EXP_LIMITS["underflowBelow"], -745.1332191019412, places=12)  # ln(2⁻¹⁰⁷⁵)
        self.assertEqual(math.exp(709.78) < math.inf, True)
        self.assertEqual(math.exp(-745.14), 0.0)

    def test_overflow_and_underflow_are_not_mathematical_failures(self):
        e = self.ev("exp", "forward-first", 800)
        self.assertEqual((e["regime"], e["mathReturns"], e["returned"]), ("overflow", True, False))
        e = self.ev("exp", "forward-first", -745.14)
        self.assertEqual((e["regime"], e["mathReturns"], e["returned"]), ("underflow", True, False))
        self.assertEqual(self.ev("exp", "forward-first", -745.13)["regime"], "subnormal")

    def test_subnormal_loses_precision(self):
        e = self.ev("exp", "forward-first", -740)
        self.assertEqual(e["regime"], "subnormal")
        self.assertFalse(e["returned"])
        self.assertGreater(e["exactError"], 1e-3)  # e^-740 keeps 2 significant bits: ln of it is off by about 1%·... of 1

    def test_ordinary_values_come_back_to_within_rounding(self):
        e = self.ev("exp", "forward-first", 1.5)
        self.assertTrue(e["returned"])
        self.assertLess(e["exactError"], 1e-15)
        self.assertAlmostEqual(e["steps"][0], math.exp(1.5), delta=1e-15)

    def test_squaring_loses_the_sign(self):
        e = self.ev("square", "forward-first", -3)
        self.assertEqual((e["steps"], e["mathReturns"], e["cause"]), (["9", "3"], False, "sign-lost"))

    def test_domain_failures(self):
        for family, order, x in [("exp", "inverse-first", 0), ("exp", "inverse-first", -2), ("square", "inverse-first", -1)]:
            e = self.ev(family, order, x)
            self.assertEqual((e["cause"], e["returned"], e["mathReturns"]), ("domain", None, False))

    def test_exact_cases(self):
        self.assertEqual(self.ev("square", "inverse-first", 2.25)["steps"], ["3/2", "9/4"])
        self.assertEqual(self.ev("exp", "forward-first", 0)["steps"], ["1", "0"])
        self.assertEqual(self.ev("exp", "inverse-first", 1)["steps"], ["0", "1"])

    def test_sqrt_two_squared_is_not_two_in_doubles(self):
        e = self.ev("square", "inverse-first", 2)
        self.assertEqual(e["steps"][1], 2.0000000000000004)  # known: sqrt(2)**2 in binary64
        self.assertGreater(e["exactError"], 0)


class BasesAndIdentities(unittest.TestCase):
    def g(self, preset, x, custom=3):
        return oracle.evaluate_growth({"input": {"preset": preset, "custom": custom, "x": x}})

    def test_whole_number_logarithms_are_exact(self):
        self.assertEqual(self.g("two", 8)["logAtX"], {"kind": "exact", "value": "3"})
        self.assertEqual(self.g("ten", 100)["logAtX"], {"kind": "exact", "value": "2"})
        self.assertEqual(self.g("ten", 0.01)["logAtX"], {"kind": "exact", "value": "-2"})
        self.assertEqual(self.g("half", 4)["logAtX"], {"kind": "exact", "value": "-2"})
        self.assertEqual(self.g("two", 3)["logAtX"]["kind"], "numeric")
        self.assertAlmostEqual(self.g("two", 3)["logAtX"]["value"], 1.584962500721156, places=15)  # log₂ 3, a known constant

    def test_powers_exact_to_20_then_doubles(self):
        self.assertEqual(self.g("half", 3)["power"], {"kind": "exact", "value": "1/8"})
        self.assertEqual(self.g("ten", -2)["power"], {"kind": "exact", "value": "1/100"})
        self.assertEqual(self.g("two", 20)["power"], {"kind": "exact", "value": "1048576"})
        self.assertEqual(self.g("two", 21)["power"]["kind"], "numeric")
        self.assertEqual(self.g("ten", 400)["power"], {"kind": "overflow"})

    def test_doubling_and_halving_times(self):
        self.assertEqual(self.g("two", 1)["period"], {"kind": "doubling", "value": {"kind": "exact", "value": "1"}})
        self.assertEqual(self.g("half", 1)["period"], {"kind": "halving", "value": {"kind": "exact", "value": "1"}})
        t = self.g("e", 1)["period"]["value"]["value"]
        self.assertAlmostEqual(t, math.log(2), places=15)  # ln 2 ≈ 0.6931471805599453
        self.assertAlmostEqual(self.g("ten", 1)["period"]["value"]["value"], 0.3010299956639812, places=15)  # log₁₀ 2, a known constant
        self.assertEqual(self.g("custom", 1, custom=4)["period"]["value"], {"kind": "exact", "value": "1/2"})  # 4^(1/2) = 2

    def test_base_one_has_no_logarithm_and_no_period(self):
        e = self.g("custom", 5, custom=1)
        self.assertEqual((e["kind"], e["logAtX"]["kind"], e["period"]["kind"]), ("constant", "undefined", "none"))

    def test_identities_hold_to_70_digits(self):
        e = oracle.evaluate_identities({"input": {"a": 6, "b": 4, "k": 3}})  # asserts internally
        self.assertAlmostEqual(e["product"]["value"], math.log(24), places=15)  # ln 24 = 3.1780538303479458
        self.assertAlmostEqual(e["power"]["value"], 3 * math.log(6), places=14)
        self.assertEqual(e["change-of-base"]["value"], 6.0)
        self.assertAlmostEqual(e["bits-nats"]["value"], math.log2(6), places=15)

    def test_identity_domain_rules(self):
        e = oracle.evaluate_identities({"input": {"a": -1, "b": 4, "k": 3}})
        self.assertEqual({k: v["status"] for k, v in e.items()}, {"product": "undefined", "power": "undefined", "change-of-base": "undefined", "bits-nats": "undefined"})
        e = oracle.evaluate_identities({"input": {"a": 6, "b": 1, "k": 3}})
        self.assertEqual(e["change-of-base"]["status"], "undefined")
        self.assertEqual(e["product"]["status"], "checked")
        e = oracle.evaluate_identities({"input": {"a": 0.01, "b": 4, "k": 160}})
        self.assertEqual(e["power"]["status"], "undefined")  # 0.01¹⁶⁰ = 1e-320 is subnormal


class Fixture(unittest.TestCase):
    def test_committed_fixture_is_fresh(self):
        self.assertEqual(oracle.main(["--check"]), 0)

    def test_generation_is_deterministic(self):
        self.assertEqual(oracle.render(oracle.build_fixture()), oracle.render(oracle.build_fixture()))

    def test_fixture_size(self):
        data = oracle.build_fixture()
        self.assertGreater(len(data["compare"]), 300)
        self.assertEqual(len(data["circleExact"]), 97)
        self.assertGreater(len(data["roundtrip"]), 100)
        self.assertGreater(len(data["identities"]), 100)


class ReferenceCode(unittest.TestCase):
    """The code shown on the page is the code that runs here (plan §13 D)."""

    def test_exp_log_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "families_exp_log.py"))
        self.assertEqual(ns["back"], 1.5)
        self.assertEqual(ns["overflow"], "OverflowError")
        self.assertEqual(ns["no_log_of_zero"], "ValueError")
        self.assertEqual(ns["exp_of_ln"], 10.000000000000002)
        self.assertTrue(ns["exp_of_ln_close"])
        self.assertEqual(ns["sqrt_of_square"], 3.0)
        self.assertEqual(ns["log2_of_8"], 3.0)
        self.assertEqual(ns["log_1000_base_10"], 2.9999999999999996)  # the quotient of two rounded logarithms
        self.assertEqual(ns["log10_of_1000"], 3.0)
        self.assertEqual(ns["bits"], 10.0)
        self.assertAlmostEqual(ns["nats"], 6.931471805599453, places=15)
        self.assertAlmostEqual(ns["doubling_time"], 0.6309297535714574, places=15)  # log₃ 2, a known constant
        # independent of the file's own arithmetic: the oracle's 90-digit values
        self.assertAlmostEqual(ns["nats"], float(oracle.dln(D(1024))), places=14)
        self.assertAlmostEqual(ns["doubling_time"], float(oracle.dln(D(2)) / oracle.dln(D(3))), places=15)

    def test_trig_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "families_trig.py"))
        self.assertEqual(ns["cos_t"], 0.8660254037844387)
        self.assertEqual(ns["sin_t"], 0.49999999999999994)
        self.assertTrue(ns["pythagorean_ok"])
        self.assertEqual(ns["sin_pi"], 1.2246467991473532e-16)  # not 0
        self.assertEqual(ns["cos_half_pi"], 6.123233995736766e-17)  # not 0
        self.assertTrue(ns["sin_pi_is_zero"])
        self.assertTrue(ns["periodic"])
        self.assertAlmostEqual(ns["arcsin_of_sin_2"], math.pi - 2, places=14)
        self.assertAlmostEqual(ns["atan2_of_4"], 4 - 2 * math.pi, places=14)
        self.assertEqual(ns["thirty_degrees"], 0.5235987755982988)
        self.assertEqual(ns["back_to_degrees"], 29.999999999999996)
        # the oracle's 90-digit value of the same quantities
        self.assertAlmostEqual(ns["cos_t"], float(oracle.dcos(oracle.PI / 6)), places=15)
        self.assertAlmostEqual(ns["atan2_of_4"], oracle.circle_free(4.0)["atan2OfComponents"], places=14)

    @unittest.skipIf(oracle_np is None, "NumPy not installed (run `npm run oracle:setup`)")
    def test_numpy_stable_softmax_example_runs(self):
        ns = runpy.run_path(str(ROOT / "code" / "python" / "families_stable_exp_numpy.py"))
        self.assertTrue(all(math.isnan(float(v)) for v in ns["naive"]))
        # the true softmax of (1000, 1001, 1002): e^-2, e^-1, 1 over their sum, in 90 digits
        weights = [oracle.dexp(D(-2)), oracle.dexp(D(-1)), D(1)]
        total = sum(weights)
        for got, w in zip(ns["stable"], weights):
            self.assertAlmostEqual(float(got), float(w / total), places=15)
        self.assertAlmostEqual(float(sum(ns["stable"])), 1.0, places=15)
        self.assertAlmostEqual(float(ns["log_sum_exp"]), float(1002 + oracle.dln(total)), places=12)


if __name__ == "__main__":
    unittest.main()
