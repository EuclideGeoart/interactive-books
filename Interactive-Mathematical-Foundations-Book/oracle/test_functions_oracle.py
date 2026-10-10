"""Self-test of the I.5 oracle against LITERAL values worked by hand, never against values the oracle computed itself (plan §12.3).
Also runs the reference files shown on the functions page: what the reader sees is what runs here."""
import contextlib
import io
import json
import math
import runpy
import sys
import unittest
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import functions_oracle as oracle  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
F = Fraction


def evaluate(rule, a, x):
    return oracle.encode(oracle.checked(oracle.rule_function(rule, a), F(x)))


def composed(f, g, x):
    return oracle.encode(oracle.checked(oracle.compose(f, g), F(x)))


def exact(u, v="0", b=1):
    return (u, v, b)


def triple(encoded):
    assert encoded["status"] == "exact", encoded
    return (encoded["u"], encoded["v"], encoded["b"])


class Evaluations(unittest.TestCase):
    def test_rules_worked_by_hand(self):
        self.assertEqual(triple(evaluate("shift", 3, "-1")), exact("16"))  # (-1 - 3)**2
        self.assertEqual(triple(evaluate("stretch", -2, "3")), exact("-18"))  # -2 * 9
        self.assertEqual(triple(evaluate("line", 4, "-1/2")), exact("-2"))
        self.assertEqual(triple(evaluate("abs", -3, "-5")), exact("2"))  # |-5 + 3|
        self.assertEqual(triple(evaluate("pole", 2, "4")), exact("1/2"))
        self.assertEqual(triple(evaluate("pole", 2, "1/2")), exact("-2/3"))  # 1 / (1/2 - 2) = 1 / (-3/2)
        self.assertEqual(triple(evaluate("root", 3, "1")), exact("2"))  # sqrt(4)
        self.assertEqual(triple(evaluate("root", 3, "-3")), exact("0"))  # the edge: sqrt(0)
        self.assertEqual(triple(evaluate("root", 0, "2")), exact("0", "1", 2))  # sqrt(2) is irrational

    def test_where_the_machine_refuses(self):
        self.assertEqual(evaluate("root", 3, "-4"), {"status": "undefined"})  # sqrt(-1)
        self.assertEqual(evaluate("pole", 2, "2"), {"status": "undefined"})  # 1 / 0
        self.assertEqual(evaluate("pole", 0, "0"), {"status": "undefined"})

    def test_irrational_values_agree_with_the_decimal_path(self):
        got = evaluate("root", 0, "2")
        self.assertAlmostEqual(got["approx"], math.sqrt(2), places=15)
        # a root of an irrational number is outside the exact range: the oracle reports a decimal, flagged as approx
        got = composed("rt", "rt", "2")
        self.assertEqual(got["status"], "approx")
        self.assertAlmostEqual(got["approx"], 2 ** 0.25, places=15)


class Compositions(unittest.TestCase):
    def test_the_order_matters(self):
        # f(x) = x**2, g(x) = 2x - 1 at x = 3: f(g(3)) = 5**2 = 25 and g(f(3)) = 2*9 - 1 = 17
        self.assertEqual(triple(composed("sq", "lin", "3")), exact("25"))
        self.assertEqual(triple(composed("lin", "sq", "3")), exact("17"))

    def test_a_composite_is_refused_where_the_inner_value_is_refused(self):
        self.assertEqual(composed("rt", "lin", "0"), {"status": "undefined"})  # sqrt(2*0 - 1) = sqrt(-1)
        self.assertEqual(triple(composed("rt", "lin", "1/2")), exact("0"))  # sqrt(0)
        self.assertEqual(triple(composed("rt", "lin", "5")), exact("3"))  # sqrt(9)
        self.assertEqual(composed("rec", "lin", "1/2"), {"status": "undefined"})  # 1 / (2*(1/2) - 1) = 1 / 0
        self.assertEqual(triple(composed("lin", "rt", "2")), exact("-1", "2", 2))  # 2*sqrt(2) - 1

    def test_sqrt_of_a_square_is_the_absolute_value(self):
        self.assertEqual(triple(composed("rt", "sq", "-3")), exact("3"))  # sqrt(9) = 3, not -3
        self.assertEqual(triple(composed("sq", "rt", "4")), exact("4"))

    def test_the_reciprocal_is_its_own_inverse(self):
        for x in ("2", "-1/3", "5/4"):
            self.assertEqual(triple(composed("rec", "rec", x)), exact(x))


class Domains(unittest.TestCase):
    def test_found_by_looking(self):
        d = oracle.describe_domain
        self.assertEqual(d(oracle.rule_function("root", 3)), {"kind": "ray", "side": "above", "bound": {"at": "-3", "closed": True}})
        self.assertEqual(d(oracle.rule_function("pole", 2)), {"kind": "except", "point": "2"})
        self.assertEqual(d(oracle.rule_function("shift", 2)), {"kind": "all"})
        self.assertEqual(d(oracle.compose("rt", "lin")), {"kind": "ray", "side": "above", "bound": {"at": "1/2", "closed": True}})
        self.assertEqual(d(oracle.compose("rec", "lin")), {"kind": "except", "point": "1/2"})
        self.assertEqual(d(oracle.compose("rt", "sq")), {"kind": "all"})
        self.assertEqual(d(oracle.compose("sq", "rt")), {"kind": "ray", "side": "above", "bound": {"at": "0", "closed": True}})
        # 1/sqrt(x) needs x > 0: the edge itself is refused
        self.assertEqual(d(oracle.compose("rec", "rt")), {"kind": "ray", "side": "above", "bound": {"at": "0", "closed": False}})


class Preimages(unittest.TestCase):
    def scan(self, rule, a, h):
        f = oracle.rule_function(rule, a)
        return oracle.preimage_scan(f, oracle.scan_values(f), F(h))

    def test_how_many_inputs_give_this_output(self):
        # (x - 2)**2 = 9  ->  x - 2 = +-3  ->  x = -1 or x = 5
        self.assertEqual(self.scan("shift", 2, "9"), {"count": 2, "points": [-1.0, 5.0]})
        self.assertEqual(self.scan("shift", 2, "0"), {"count": 1, "points": [2.0]})
        self.assertEqual(self.scan("shift", 2, "-1"), {"count": 0, "points": []})
        # -2x**2 = -8  ->  x = +-2
        self.assertEqual(self.scan("stretch", -2, "-8"), {"count": 2, "points": [-2.0, 2.0]})
        self.assertEqual(self.scan("stretch", -2, "1"), {"count": 0, "points": []})
        # sqrt(x + 3) = 2  ->  x = 1
        self.assertEqual(self.scan("root", 3, "2"), {"count": 1, "points": [1.0]})
        # 1 / (x - 2) = 0 has no solution: the pole is never mistaken for a root
        self.assertEqual(self.scan("pole", 2, "0"), {"count": 0, "points": []})
        self.assertEqual(self.scan("pole", 2, "1/2"), {"count": 1, "points": [4.0]})
        # |x - 0| = 3  ->  x = +-3
        self.assertEqual(self.scan("abs", 0, "3"), {"count": 2, "points": [-3.0, 3.0]})
        # 0 * x = 0 holds for every x
        self.assertEqual(self.scan("line", 0, "0"), {"count": "all", "points": []})


class Fixture(unittest.TestCase):
    fixture = json.loads((ROOT / "fixtures" / "functions.fixtures.json").read_text(encoding="utf-8"))

    def case(self, family, case_id):
        hits = [c for c in self.fixture[family] if c["id"] == case_id]
        self.assertEqual(len(hits), 1, case_id)
        return hits[0]["expected"]

    def test_committed_fixture_is_fresh(self):
        text = oracle.render(oracle.build_fixture())
        self.assertEqual(oracle.FIXTURE_PATH.read_text(encoding="utf-8"), text)

    def test_injective_and_onto_worked_by_hand(self):
        # a line with a nonzero slope is one-to-one and reaches every height; a square folds the line over itself; sqrt and 1/x miss heights
        self.assertEqual(self.case("properties", "line.2"), {"injective": True, "onto": True})
        self.assertEqual(self.case("properties", "line.0"), {"injective": False, "onto": False})
        self.assertEqual(self.case("properties", "shift.2"), {"injective": False, "onto": False})
        self.assertEqual(self.case("properties", "root.3"), {"injective": True, "onto": False})
        self.assertEqual(self.case("properties", "pole.2"), {"injective": True, "onto": False})  # 1/(x-2) never gives 0
        self.assertEqual(self.case("properties", "abs.0"), {"injective": False, "onto": False})

    def test_inverse_table_worked_by_hand(self):
        # 2x - 1 at 3 is 5 and (5 + 1)/2 is back at 3
        self.assertEqual(self.case("inverses", "lin.u.3"), {"inDomain": True, "hasInverse": True, "roundTrip": True, "twin": None})
        # x**2 on all of R: 3 and -3 both give 9, so there is no inverse and the twin is -3
        self.assertEqual(self.case("inverses", "sq.u.3"), {"inDomain": True, "hasInverse": False, "roundTrip": False, "twin": "-3"})
        # restricted to x >= 0 the square root undoes it; -3 is outside the restricted domain
        self.assertEqual(self.case("inverses", "sq.r.3"), {"inDomain": True, "hasInverse": True, "roundTrip": True, "twin": None})
        self.assertEqual(self.case("inverses", "sq.r.-3"), {"inDomain": False, "hasInverse": True, "roundTrip": False, "twin": None})
        # sqrt(4) = 2 and 2**2 = 4; sqrt of a negative number is refused; 1/x is its own inverse except at 0
        self.assertEqual(self.case("inverses", "rt.r.4"), {"inDomain": True, "hasInverse": True, "roundTrip": True, "twin": None})
        self.assertEqual(self.case("inverses", "rt.r.-1"), {"inDomain": False, "hasInverse": True, "roundTrip": False, "twin": None})
        self.assertEqual(self.case("inverses", "rec.r.2"), {"inDomain": True, "hasInverse": True, "roundTrip": True, "twin": None})
        self.assertEqual(self.case("inverses", "rec.r.0"), {"inDomain": False, "hasInverse": True, "roundTrip": False, "twin": None})

    def test_family_sizes(self):
        self.assertEqual(len(self.fixture["properties"]), 66)  # 6 rules x 11 values of a
        self.assertEqual(len(self.fixture["compositions"]), 336)  # 16 pairs x 21 inputs
        self.assertEqual({c["expected"]["same"] for c in self.fixture["compositions"]}, {True, False})


def run_file(name):
    """Execute a reference file; return its namespace and what it printed."""
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        ns = runpy.run_path(str(ROOT / "code" / "python" / name))
    return ns, out.getvalue().splitlines()


class ReferenceCode(unittest.TestCase):
    """The code shown on the page is the code that runs here (plan §13 D)."""

    def test_basic_example(self):
        ns, lines = run_file("functions_basic.py")
        self.assertEqual(lines, [
            "9 9", "25 17", "[(-3, 25), (-2, 16), (-1, 9), (0, 4), (1, 1), (2, 0), (3, 1)]", "6 7", "3.0",
        ])
        # the file's machines agree with the oracle's on integer inputs: (x - 2)**2, x**2 and 2x - 1
        for x in range(-6, 7):
            self.assertEqual(ns["shifted_square"](x), oracle.rule_function("shift", 2)(F(x)))
            self.assertEqual(ns["compose"](ns["square"], ns["line"])(x), oracle.compose("sq", "lin")(F(x)))
            self.assertEqual(ns["compose"](ns["line"], ns["square"])(x), oracle.compose("lin", "sq")(F(x)))
            self.assertEqual(ns["undo_line"](ns["line"](x)), x)

    def test_domain_example(self):
        ns, lines = run_file("functions_domain.py")
        self.assertEqual(lines, [
            "[True, True, False, True]", "[False, True, True]", "math domain error", "[False, True, True]",
            "[nan, 0.0, 1.7320508075688772, 2.8284271247461903]", "[False, True, True, True]",
        ])
        self.assertAlmostEqual(math.sqrt(3), 1.7320508075688772, places=15)
        self.assertAlmostEqual(math.sqrt(8), 2.8284271247461903, places=15)
        # the file's "defined" test agrees with the oracle's domain on a sweep of eighths
        for k in range(-48, 49):
            x = F(k, 8)
            self.assertEqual(ns["defined"](ns["reciprocal_shift"], float(x)), oracle.defined_at(oracle.rule_function("pole", 2), x), x)
            self.assertEqual(ns["defined"](ns["root_shift"], float(x)), oracle.defined_at(oracle.rule_function("root", 3), x), x)

    def test_params_example(self):
        ns, lines = run_file("functions_params.py")
        self.assertEqual(lines, ["0.0", "3.5", "1.0", "0.0 5.0", "0.0 0.0"])
        # worked by hand: data (0,1) (1,3) (2,5) (3,7). (w, b) = (1, 1) predicts 1, 2, 3, 4: errors 0, -1, -2, -3 -> (0 + 1 + 4 + 9) / 4
        self.assertEqual(ns["loss"](1, 1), (0 + 1 + 4 + 9) / 4)
        # (w, b) = (2, 0) predicts 0, 2, 4, 6: every error is -1 -> (1 + 1 + 1 + 1) / 4
        self.assertEqual(ns["loss"](2, 0), (1 + 1 + 1 + 1) / 4)
        self.assertEqual(ns["loss"](2, 1), 0.0)
        self.assertEqual([ns["relu"](z) for z in (-2.0, 0.0, 3.0)], [0.0, 0.0, 3.0])


class NumericsTable(unittest.TestCase):
    """The doubles printed in the 'Numerical considerations' table, recomputed in Python (the page computes them in JavaScript's binary64)."""

    def test_root_then_square(self):
        # sqrt(x) is rounded, and squaring does not undo the rounding
        self.assertEqual([math.sqrt(x) ** 2 for x in (2, 3, 5, 10)], [2.0000000000000004, 2.9999999999999996, 5.000000000000001, 10.000000000000002])
        for x in (2, 3, 5, 10):
            self.assertNotEqual(math.sqrt(x) ** 2, x)
            # in exact arithmetic the square of the root IS x: the oracle's Surd class keeps sqrt(x) as a surd and squares it back
            root = oracle.msqrt(oracle.Surd(F(x)))
            self.assertEqual(root ** 2, oracle.Surd(F(x)))

    def test_reciprocal_twice(self):
        self.assertEqual([1 / (1 / x) for x in (49, 98)], [49.00000000000001, 98.00000000000001])
        self.assertEqual(Fraction(1) / (Fraction(1) / Fraction(49)), Fraction(49))  # exactly 49 in rational arithmetic

    def test_the_pole(self):
        values = {}
        for step in (1e-1, 1e-5, 1e-10, 1e-15):
            values[step] = 1 / ((2 + step) - 2)
        self.assertEqual(values[1e-1], 9.999999999999991)
        self.assertEqual(values[1e-5], 99999.99999934487)
        self.assertEqual(values[1e-10], 9999999172.59636)
        self.assertEqual(values[1e-15], 1125899906842624.0)
        # 2 + 1e-16 rounds to 2.0, the subtraction gives exactly 0, and Python raises
        self.assertEqual((2 + 1e-16) - 2, 0.0)
        with self.assertRaises(ZeroDivisionError):
            1 / ((2 + 1e-16) - 2)
        # in exact arithmetic the same expression is 10**k at every step
        for k in (1, 5, 10, 15, 16):
            self.assertEqual(1 / ((2 + Fraction(1, 10 ** k)) - 2), 10 ** k)


if __name__ == "__main__":
    unittest.main()
