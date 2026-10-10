"""Self-test of the I.4 oracle against LITERAL values worked by hand, never against values the oracle computed itself (plan §12.3).
Also runs the reference files shown on the algebra page: what the reader sees is what runs here."""
import contextlib
import io
import runpy
import sys
import unittest
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import algebra_oracle as oracle  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
F = Fraction


def spec(a1, b1, rel, a2, b2):
    return oracle.spec_of(a1, b1, rel, a2, b2)


def sets(a1, b1, rel, a2, b2):
    left, right = oracle.statement_functions(spec(a1, b1, rel, a2, b2))
    return oracle.set_checked(left, rel, right)


class SolutionSets(unittest.TestCase):
    def test_equation_with_one_solution(self):
        # 3x + 2 = x + 10  ->  2x = 8  ->  x = 4
        self.assertEqual(sets("3", "2", "=", "1", "10"), {"kind": "point", "x": "4"})
        # 4x + 1 = x + 3  ->  3x = 2  ->  x = 2/3
        self.assertEqual(sets("4", "1", "=", "1", "3"), {"kind": "point", "x": "2/3"})

    def test_no_solution_and_every_x(self):
        self.assertEqual(sets("2", "3", "=", "2", "7"), {"kind": "none"})  # 0 = 4
        self.assertEqual(sets("2", "3", "=", "2", "3"), {"kind": "all"})  # 0 = 0

    def test_inequalities_found_without_a_reversal_rule(self):
        # 5x - 1 >= 2x + 8  ->  3x >= 9  ->  x >= 3
        self.assertEqual(sets("5", "-1", "≥", "2", "8"), {"kind": "ray", "side": "above", "bound": "3", "closed": True})
        # 4 - 2x < x + 10  ->  -3x < 6  ->  x > -2   (the division by -3 reverses the order)
        self.assertEqual(sets("-2", "4", "<", "1", "10"), {"kind": "ray", "side": "above", "bound": "-2", "closed": False})
        # x/2 + 1 <= 3 - x/4  ->  3x/4 <= 2  ->  x <= 8/3
        self.assertEqual(sets("0.5", "1", "≤", "-0.25", "3"), {"kind": "ray", "side": "below", "bound": "8/3", "closed": True})

    def test_equal_slopes_are_all_or_nothing(self):
        self.assertEqual(sets("2", "1", "<", "2", "3"), {"kind": "all"})  # 0 < 2
        self.assertEqual(sets("2", "3", "≤", "2", "1"), {"kind": "none"})  # 0 <= -2 is false
        self.assertEqual(sets("2", "1", "≥", "2", "1"), {"kind": "all"})  # 0 >= 0
        self.assertEqual(sets("2", "1", ">", "2", "1"), {"kind": "none"})  # 0 > 0

    def test_kind_names(self):
        self.assertEqual(oracle.kind_of("=", {"kind": "all"}), "identity")
        self.assertEqual(oracle.kind_of("=", {"kind": "none"}), "contradiction")
        self.assertEqual(oracle.kind_of("<", {"kind": "all"}), "always-true")
        self.assertEqual(oracle.kind_of("≥", {"kind": "none"}), "never-true")


class SolutionPath(unittest.TestCase):
    def test_three_steps_for_3x_plus_2_equals_x_plus_10(self):
        e = oracle.statement_expected(spec("3", "2", "=", "1", "10"))
        self.assertEqual(e["pathSteps"], 3)  # subtract x, subtract 2, divide by 2
        self.assertEqual(e["pathFinal"], spec("1", "0", "=", "0", "4"))

    def test_the_negative_divisor_reverses_the_final_relation(self):
        e = oracle.statement_expected(spec("-2", "4", "<", "1", "10"))  # -3x < 6 -> x > -2
        self.assertEqual(e["pathFinal"], spec("1", "0", ">", "0", "-2"))
        self.assertEqual(e["pathSteps"], 3)

    def test_no_x_left_ends_at_0_rel_c(self):
        self.assertEqual(oracle.statement_expected(spec("2", "3", "=", "2", "7"))["pathFinal"], spec("0", "0", "=", "0", "4"))
        self.assertEqual(oracle.statement_expected(spec("2", "3", "=", "2", "3"))["pathFinal"], spec("0", "0", "=", "0", "0"))

    def test_steps_count_skips_what_is_already_zero_or_one(self):
        self.assertEqual(oracle.statement_expected(spec("1", "0", "=", "0", "5"))["pathSteps"], 0)  # x = 5 is already solved
        self.assertEqual(oracle.statement_expected(spec("2", "0", "=", "0", "6"))["pathSteps"], 1)  # only the division by 2


class Operations(unittest.TestCase):
    def test_subtract_x_from_both_sides(self):
        e = oracle.operation_expected(spec("3", "2", "=", "1", "10"), "add-x", F(-1))
        self.assertEqual(e["next"], spec("2", "2", "=", "0", "10"))
        self.assertFalse(e["reversed"])

    def test_dividing_by_a_negative_reverses_an_inequality(self):
        # -3x < 6 divided by -3: x > -2
        e = oracle.operation_expected(spec("-3", "0", "<", "0", "6"), "divide", F(-3))
        self.assertEqual(e["next"], spec("1", "0", ">", "0", "-2"))
        self.assertTrue(e["reversed"] and e["forced"])

    def test_multiplying_by_a_positive_keeps_the_relation(self):
        e = oracle.operation_expected(spec("1", "0", "≤", "0", "3"), "scale", F(2))
        self.assertEqual(e["next"], spec("2", "0", "≤", "0", "6"))
        self.assertFalse(e["reversed"])

    def test_the_reversal_is_discovered_from_the_truth_table_not_assumed(self):
        # x <= 3, multiplied by -1: -x <= -3 is TRUE for x >= 3, so the truth table changes unless the relation becomes >=
        left, right = oracle.side(F(1), F(0)), oracle.side(F(0), F(3))
        rel, forced = oracle.relation_after("≤", left, right, oracle.side(F(-1), F(0)), oracle.side(F(0), F(-3)))
        self.assertEqual((rel, forced), ("≥", True))

    def test_a_degenerate_statement_cannot_tell_the_two_apart(self):
        # 0 <= 0 multiplied by -1 is 0 <= 0 and also 0 >= 0: both keep the truth table
        zero = oracle.side(F(0), F(0))
        rel, forced = oracle.relation_after("≤", zero, zero, zero, zero)
        self.assertFalse(forced)

    def test_times_zero_is_rejected_and_changes_the_solution_set(self):
        e = oracle.operation_expected(spec("3", "2", "=", "1", "10"), "scale", F(0))
        self.assertEqual(e, {"accepted": False, "reason": "zero-multiply", "changesSolutionSet": True})  # {4} would become every x
        e0 = oracle.operation_expected(spec("2", "3", "=", "2", "3"), "scale", F(0))
        self.assertFalse(e0["changesSolutionSet"])  # an identity stays an identity: 0 = 0, but the step is still not reversible
        self.assertEqual(oracle.operation_expected(spec("3", "2", "=", "1", "10"), "divide", F(0))["reason"], "zero-divide")


class Beam(unittest.TestCase):
    def test_level_at_the_solution_and_tilted_either_side_of_it(self):
        s = spec("3", "2", "=", "1", "10")
        self.assertEqual(oracle.beam_expected(s, F(4)), {"left": "14", "right": "14", "diff": "0", "lower": "level", "holds": True})
        self.assertEqual(oracle.beam_expected(s, F(5)), {"left": "17", "right": "15", "diff": "2", "lower": "left", "holds": False})
        self.assertEqual(oracle.beam_expected(s, F(3)), {"left": "11", "right": "13", "diff": "-2", "lower": "right", "holds": False})

    def test_an_inequality_can_hold_while_the_beam_is_tilted(self):
        e = oracle.beam_expected(spec("3", "2", "<", "1", "10"), F(3))  # 11 < 13
        self.assertEqual((e["lower"], e["holds"]), ("right", True))


class Reversal(unittest.TestCase):
    def test_positive_factor_keeps_negative_reverses_zero_collapses(self):
        keep = oracle.reversal_expected(F(-2), F(3), F(2))  # -4 < 6
        self.assertEqual((keep["kp"], keep["kq"], keep["after"], keep["rule"]), ("-4", "6", "less", "keeps"))
        rev = oracle.reversal_expected(F(-2), F(3), F(-2))  # 4 > -6
        self.assertEqual((rev["kp"], rev["kq"], rev["after"], rev["rule"]), ("4", "-6", "greater", "reverses"))
        self.assertFalse(rev["sameRelationHolds"])
        self.assertTrue(rev["reversedRelationHolds"])
        zero = oracle.reversal_expected(F(-2), F(3), F(0))
        self.assertEqual((zero["after"], zero["rule"]), ("equal", "rejected"))


class Extraneous(unittest.TestCase):
    def test_p2_q0_roots_minus_1_and_2(self):
        # sqrt(x + 2) = x -> x + 2 = x^2 -> x^2 - x - 2 = 0 -> x = -1 or 2; sqrt(1) = 1 != -1, sqrt(4) = 2
        e = oracle.extraneous_expected(2, 0)
        self.assertEqual(e["discriminant"], 9)
        self.assertEqual(e["squared"], {"linear": "-1", "constant": "-2"})
        self.assertEqual([(r["u"], r["status"], r["solves"]) for r in e["roots"]], [("-1", "extraneous", "minus"), ("2", "valid", "plus")])
        self.assertEqual((e["validCount"], e["extraneousCount"]), (1, 1))

    def test_p_equals_q_gives_the_double_valid_case(self):
        # sqrt(x + p) = x + p: t = x + p is 0 or 1, both valid, and t = 0 satisfies both signs
        e = oracle.extraneous_expected(3, 3)
        self.assertEqual(e["discriminant"], 1)
        self.assertEqual([(r["u"], r["status"], r["solves"]) for r in e["roots"]], [("-3", "valid", "both"), ("-2", "valid", "plus")])

    def test_irrational_roots(self):
        # sqrt(x + 1) = x -> x^2 - x - 1 = 0 -> (1 +- sqrt(5))/2
        e = oracle.extraneous_expected(1, 0)
        self.assertEqual(e["discriminant"], 5)
        self.assertEqual([(r["u"], r["v"], r["b"], r["status"]) for r in e["roots"]], [("1/2", "-1/2", 5, "extraneous"), ("1/2", "1/2", 5, "valid")])
        self.assertAlmostEqual(e["roots"][1]["approx"], 1.618033988749895, places=14)
        self.assertAlmostEqual(e["roots"][0]["approx"], -0.6180339887498949, places=14)

    def test_a_square_factor_is_pulled_out_of_the_discriminant(self):
        # D = 4p - 4q + 1 = 45 = 9 * 5 for p = 5, q = -6 ... 20 + 24 + 1 = 45: sqrt(45) = 3 sqrt(5), so v = 3/2
        e = oracle.extraneous_expected(5, -6)
        self.assertEqual(e["discriminant"], 45)
        self.assertEqual([(r["u"], r["v"], r["b"]) for r in e["roots"]], [("13/2", "-3/2", 5), ("13/2", "3/2", 5)])

    def test_no_real_root_when_the_discriminant_is_negative(self):
        e = oracle.extraneous_expected(0, 1)  # D = -3
        self.assertEqual((e["discriminant"], e["roots"]), (-3, []))

    def test_the_two_t_values_always_sum_to_one(self):
        # t = x + q, and the roots of t^2 - t - (p - q) = 0 add up to 1; so one root is valid whenever there are two
        for p in range(-6, 7):
            for q in range(-6, 7):
                e = oracle.extraneous_expected(p, q)
                if e["roots"]:
                    self.assertGreaterEqual(e["validCount"], 1)
                    self.assertEqual(e["extraneousCount"], 0 if e["discriminant"] == 1 else 1)


class Fallacy(unittest.TestCase):
    def test_x_times_x_minus_2_equals_3_times_x_minus_2(self):
        e = oracle.fallacy_expected(2, 3)
        self.assertEqual(e["solutions"], ["2", "3"])
        self.assertEqual((e["afterDividing"], e["lost"], e["atC"]), ("3", "2", ["0", "0"]))

    def test_a_double_root_loses_nothing(self):
        e = oracle.fallacy_expected(2, 2)  # (x - 2)^2 = 0
        self.assertEqual((e["solutions"], e["lost"]), (["2"], None))

    def test_negative_values_sort_ascending(self):
        self.assertEqual(oracle.fallacy_expected(3, -4)["solutions"], ["-4", "3"])


class Distribute(unittest.TestCase):
    def test_correct_form_is_an_identity(self):
        # a = 2, b = 3, c = 4, x = 5: 2(15 + 4) = 38 = 30 + 8
        e = oracle.distribute_expected(F(2), F(3), F(4), F(5), "correct")
        self.assertEqual((e["inner"], e["product"], e["firstTerm"], e["secondTerm"], e["expanded"], e["gap"]), ("19", "38", "30", "8", "38", "0"))
        self.assertEqual((e["agreesHere"], e["kind"]), (True, "identity"))

    def test_the_slip_is_off_by_c_times_a_minus_1(self):
        e = oracle.distribute_expected(F(2), F(3), F(4), F(5), "slip")
        self.assertEqual((e["secondTerm"], e["expanded"], e["gap"]), ("4", "34", "4"))  # 4 * (2 - 1)
        self.assertEqual(e["kind"], "contradiction")

    def test_the_slip_hides_when_a_is_1_or_c_is_0(self):
        self.assertEqual(oracle.distribute_expected(F(1), F(3), F(4), F(5), "slip")["kind"], "identity")
        self.assertEqual(oracle.distribute_expected(F(2), F(3), F(0), F(5), "slip")["kind"], "identity")


class Fixture(unittest.TestCase):
    def test_committed_fixture_is_fresh_and_covers_every_family(self):
        text = oracle.render(oracle.build_fixture())
        self.assertEqual(oracle.FIXTURE_PATH.read_text(encoding="utf-8"), text)
        fixture = oracle.build_fixture()
        self.assertEqual({c["expected"]["set"]["kind"] for c in fixture["statements"]}, {"none", "all", "point", "ray"})
        self.assertEqual(len(fixture["extraneous"]), 169)
        self.assertGreater(len(fixture["operations"]), 500)


def run_file(name):
    """Execute a reference file; return its namespace and what it printed."""
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        ns = runpy.run_path(str(ROOT / "code" / "python" / name))
    return ns, out.getvalue().splitlines()


class ReferenceCode(unittest.TestCase):
    """The code shown on the page is the code that runs here (plan §13 D)."""

    def test_solve_example(self):
        ns, lines = run_file("algebra_solve.py")
        self.assertEqual(lines, [
            "('point', Fraction(4, 1))", "('none',)", "('all',)", "True", "('all',) False", "('x', '>', Fraction(-2, 1))", "False",
            "0.9999999999999998 1 False True",
            "5.551115123125783e-17 True 1.8014398509481984e+16", "0 ('none',)",
        ])
        self.assertTrue(ns["history_agrees"])
        # (0.1 + 0.2) - 0.3 is exactly 2**-54 in binary64, so 1 / that is exactly 2**54 = 18014398509481984
        self.assertEqual(ns["m_float"], 2.0**-54)
        self.assertEqual((2 - 1) / ns["m_float"], float(2**54))
        self.assertEqual(2**54, 18014398509481984)
        self.assertEqual(ns["m_exact"], 0)
        # the file's solver agrees with the oracle's probing solver on a sweep of integer statements
        for a1 in range(-3, 4):
            for a2 in range(-3, 4):
                for b1 in (-2, 0, 5):
                    for b2 in (-4, 0, 3):
                        left, right = oracle.side(F(a1), F(b1)), oracle.side(F(a2), F(b2))
                        found = oracle.set_checked(left, "=", right)
                        got = ns["solve_linear"](a1, b1, a2, b2)
                        if found["kind"] == "point":
                            self.assertEqual(got, ("point", F(found["x"])))
                        else:
                            self.assertEqual(got, (found["kind"],))
                        for rel, py in (("<", "<"), ("≤", "<="), (">", ">"), ("≥", ">=")):
                            expected = oracle.set_checked(left, rel, right)
                            ineq = ns["solve_inequality"](a1, b1, py, a2, b2)
                            if expected["kind"] == "ray":
                                side = "<" if expected["side"] == "below" else ">"
                                self.assertEqual(ineq, ("x", side + ("=" if expected["closed"] else ""), F(expected["bound"])))
                            else:
                                self.assertEqual(ineq, (expected["kind"],))

    def test_extraneous_example(self):
        ns, lines = run_file("algebra_extraneous.py")
        self.assertEqual(lines[0], "[-1.0, 2.0] ['extraneous', 'valid']")
        self.assertEqual(lines[1], "1.0 != -1")
        self.assertEqual(lines[2], "[False, True]")
        self.assertEqual(lines[3], "valid extraneous")
        self.assertEqual(lines[4], "1.618033988749895 -0.6180339887498949")
        self.assertEqual(lines[6], "None")
        self.assertEqual(lines[7:], ["[2, 3]", "(0, 0)"])
        # the file's classification agrees with the oracle's 60-digit one on every (p, q) with rational or irrational roots
        for p in range(-6, 7):
            for q in range(-6, 7):
                expected = oracle.extraneous_expected(p, q)
                roots = ns["squared_roots"](p, q)
                if not expected["roots"]:
                    self.assertIsNone(roots)
                    continue
                self.assertEqual([ns["classify"](p, q, x) for x in roots], [r["status"] for r in expected["roots"]], (p, q))
                for x, r in zip(roots, expected["roots"]):
                    self.assertAlmostEqual(x, r["approx"], places=12)

    def test_affine_example(self):
        ns, lines = run_file("algebra_affine.py")
        self.assertEqual(lines[0], "['-1', '0', '2', '3/8']")
        self.assertEqual(lines[1], "True")
        self.assertEqual(lines[2], "sigma = 0: ZeroDivisionError")
        self.assertEqual(lines[3:], ["1/4 3/8 True", "1/2 0 True", "3/4 3/8 True", "-1/10 648/125 False", "11/10 648/125 False"])
        # |1 - 2*eta| < 1 exactly when 0 < eta < 1: the factor, worked by hand: 1 - 1/2 = 1/2, 1 - 1 = 0, 1 - 3/2 = -1/2, 1 + 1/5 = 6/5, 1 - 11/5 = -6/5
        for eta, factor in ((F(1, 4), F(1, 2)), (F(1, 2), F(0)), (F(3, 4), F(-1, 2)), (F(-1, 10), F(6, 5)), (F(11, 10), F(-6, 5))):
            self.assertEqual(1 - 2 * eta, factor)
            self.assertEqual(ns["contracts"](eta), abs(factor) < 1)
        # and the factor is what one step multiplies the distance to the minimiser by
        self.assertEqual(ns["step"](F(0), F(3), F(1, 4)) - 3, F(1, 2) * (0 - 3))


if __name__ == "__main__":
    unittest.main()
