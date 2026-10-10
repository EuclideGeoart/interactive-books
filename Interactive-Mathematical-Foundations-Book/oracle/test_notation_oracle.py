"""Self-test of the notation oracle against LITERAL values — worked by hand (never against values the oracle computed itself; plan §12.3) —
cross-checks against NumPy where it is installed, and execution of the three Python reference files shown on the chapter page
(notation_shapes.py, notation_norms_argmin.py, notation_expectation_gradient.py), whose printed lines are asserted verbatim."""
import contextlib
import io
import itertools
import json
import runpy
import sys
import unittest
from fractions import Fraction
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import notation_oracle as oracle  # noqa: E402

try:
    import numpy as np  # type: ignore
except ImportError:  # pragma: no cover
    np = None

ROOT = Path(__file__).resolve().parent.parent
needs_numpy = unittest.skipIf(np is None, "NumPy not installed (run `npm run oracle:setup`)")


def run_file(name: str):
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        ns = runpy.run_path(str(ROOT / "code" / "python" / name))
    return ns, out.getvalue().splitlines()


class HandWorkedShapes(unittest.TestCase):
    def case(self, kind, n=1, d=1, B=1, T=1, i=1, j=1, k=1):
        return oracle.shape_case(kind, n, d, B, T, i, j, k)["expected"]

    def test_matrix_entry(self):
        # X = arange(12).reshape(4, 3): X_{2,3} is X[1, 2] = 3 * 1 + 2 = 5
        e = self.case("matrix", n=4, d=3, i=2, j=3)
        self.assertEqual((e["shape"], e["count"], e["valid"], e["offset"], e["idx0"], e["strides"]), ("(4, 3)", 12, True, 5, [1, 2], [3, 1]))
        self.assertEqual(e["slices"], [["row", "(3,)"], ["column", "(4,)"]])

    def test_corners_of_a_matrix(self):
        self.assertEqual(self.case("matrix", n=4, d=3, i=1, j=1)["offset"], 0)
        self.assertEqual(self.case("matrix", n=4, d=3, i=4, j=3)["offset"], 11)
        self.assertEqual(self.case("matrix", n=4, d=3, i=1, j=3)["offset"], 2)
        self.assertEqual(self.case("matrix", n=4, d=3, i=4, j=1)["offset"], 9)

    def test_tensor_entry(self):
        # 2 x 3 x 4: the last entry is 1 * 12 + 2 * 4 + 3 = 23
        e = self.case("tensor", B=2, T=3, d=4, i=2, j=3, k=4)
        self.assertEqual((e["shape"], e["count"], e["offset"], e["strides"]), ("(2, 3, 4)", 24, 23, [12, 4, 1]))
        self.assertEqual(e["slices"], [["example", "(3, 4)"], ["position", "(4,)"]])
        self.assertEqual(self.case("tensor", B=2, T=3, d=4, i=1, j=1, k=1)["offset"], 0)
        self.assertEqual(self.case("tensor", B=2, T=3, d=4, i=2, j=1, k=1)["offset"], 12)

    def test_vector_and_scalar(self):
        e = self.case("vector", d=5, j=2)
        self.assertEqual((e["shape"], e["offset"], e["strides"]), ("(5,)", 1, [1]))
        s = self.case("scalar")
        self.assertEqual((s["shape"], s["count"], s["offset"]), ("()", 1, None))

    def test_index_zero_wraps_and_index_past_the_end_raises(self):
        zero = self.case("matrix", n=4, d=3, i=0, j=1)
        self.assertEqual((zero["valid"], zero["outcome"], zero["offset"]), (False, "wraps", None))
        past = self.case("matrix", n=4, d=3, i=5, j=1)
        self.assertEqual((past["valid"], past["outcome"]), (False, "IndexError"))
        both = self.case("matrix", n=4, d=3, i=0, j=4)  # one axis wraps, the other raises: Python raises
        self.assertEqual(both["outcome"], "IndexError")
        self.assertEqual(self.case("vector", d=3, j=3)["outcome"], "value")
        self.assertEqual(self.case("vector", d=3, j=4)["outcome"], "IndexError")

    def test_the_nested_list_counts_in_reading_order(self):
        self.assertEqual(oracle.build_nested((2, 3)), [[0, 1, 2], [3, 4, 5]])
        self.assertEqual(oracle.build_nested((2, 1, 2)), [[[0, 1]], [[2, 3]]])
        self.assertEqual(oracle.position_of((4, 3), (1, 2)), 5)
        self.assertEqual(oracle.measured_strides((2, 3, 4)), [12, 4, 1])


class HandWorkedProducts(unittest.TestCase):
    def test_shapes_of_the_four_products(self):
        a = oracle.algebra_case
        self.assertEqual(a("matvec", 4, 3, 3, 1)["expected"]["resultTuple"], "(4,)")
        self.assertEqual(a("matmul", 4, 3, 3, 2)["expected"]["resultTuple"], "(4, 2)")
        self.assertEqual(a("transpose", 4, 3, 1, 1)["expected"]["resultTuple"], "(3, 4)")
        self.assertEqual(a("gram", 4, 3, 1, 1)["expected"]["resultTuple"], "(3, 3)")

    def test_a_product_of_ones_holds_the_inner_dimension_in_every_entry(self):
        self.assertEqual(oracle.multiply(oracle.ones(2, 3), oracle.ones(3, 2)), [[3, 3], [3, 3]])
        self.assertEqual(oracle.multiply(oracle.transpose(oracle.ones(4, 3)), oracle.ones(4, 3)), [[4, 4, 4], [4, 4, 4], [4, 4, 4]])

    def test_mismatch_is_an_error_with_both_numbers(self):
        e = oracle.algebra_case("matvec", 4, 3, 4, 1)["expected"]
        self.assertEqual((e["valid"], e["result"], e["resultTuple"]), (False, None, None))
        self.assertIn("3 and 4", e["reason"])
        e2 = oracle.algebra_case("matmul", 4, 3, 2, 2)["expected"]
        self.assertFalse(e2["valid"])
        self.assertIn("3 and 2", e2["reason"])

    def test_gram_is_always_square_in_the_features(self):
        for n, d in itertools.product(range(1, 6), repeat=2):
            self.assertEqual(oracle.algebra_case("gram", n, d, 1, 1)["expected"]["result"], [d, d])


class HandWorkedNorms(unittest.TestCase):
    def norms(self, *xs):
        return oracle.norms_case([Fraction(x) for x in xs])["expected"]

    def test_three_four_five(self):
        e = self.norms(3, 4)
        self.assertEqual((e["l1"], e["linf"], e["l2squared"], e["l2coef"], e["l2radicand"]), ("7/1", "4/1", "25/1", "5/1", 1))
        self.assertEqual(e["equalities"], [])
        self.assertEqual(e["chain"], {"infLeL2": True, "l2LeL1": True, "l1LeDInf": True})

    def test_irrational_norms_as_radicals(self):
        e = self.norms(1, 1)
        self.assertEqual((e["l2squared"], e["l2coef"], e["l2radicand"]), ("2/1", "1/1", 2))
        e = self.norms(2, 2)  # sqrt(8) = 2 sqrt(2)
        self.assertEqual((e["l2coef"], e["l2radicand"]), ("2/1", 2))
        e = self.norms(Fraction(1, 2), Fraction(1, 2))  # sqrt(1/2) = sqrt(2) / 2
        self.assertEqual((e["l2squared"], e["l2coef"], e["l2radicand"]), ("1/2", "1/2", 2))
        e = self.norms(-3, 2)
        self.assertEqual((e["l1"], e["linf"], e["l2squared"], e["l2radicand"]), ("5/1", "3/1", "13/1", 13))
        e = self.norms(6, 6, 6)  # sqrt(108) = 6 sqrt(3)
        self.assertEqual((e["l2coef"], e["l2radicand"]), ("6/1", 3))

    def test_a_vector_on_an_axis_and_the_zero_vector(self):
        self.assertEqual(self.norms(3, 0)["equalities"], ["2=1", "inf=1", "inf=2"])
        self.assertEqual(self.norms(-5, 0)["equalities"], ["2=1", "inf=1", "inf=2"])
        z = self.norms(0, 0)
        self.assertEqual((z["zero"], z["l1"], z["l2coef"], z["l2radicand"]), (True, "0/1", "0/1", 1))

    def test_the_double_is_the_nearest_to_the_radical(self):
        self.assertEqual(self.norms(1, 1)["l2double"], 1.4142135623730951)
        self.assertEqual(self.norms(3, 4)["l2double"], 5.0)


class HandWorkedArgmin(unittest.TestCase):
    def test_two_wells(self):
        e = oracle.argmin_case("two-wells", 0, 0)["expected"]
        self.assertEqual(e["losses"], [225, 64, 9, 0, 1, 0, 9, 64, 225])  # ((t**2) - 1)**2 at t = -4 … 4
        self.assertEqual((e["min"], e["argmin"], e["npIndex"], e["npTheta"]), (0, [-1, 1], 3, -1))

    def test_a_bowl_and_its_offset(self):
        e = oracle.argmin_case("bowl", 2, 1)["expected"]
        self.assertEqual(e["losses"], [37, 26, 17, 10, 5, 2, 1, 2, 5])
        self.assertEqual((e["min"], e["argmin"], e["npIndex"]), (1, [2], 6))
        raised = oracle.argmin_case("bowl", 2, 5)["expected"]
        self.assertEqual((raised["min"], raised["argmin"]), (5, [2]))  # the offset moves the value and not the place

    def test_a_flat_bottom(self):
        e = oracle.argmin_case("flat-bottom", 0, 0)["expected"]
        self.assertEqual(e["losses"], [9, 4, 1, 0, 0, 0, 1, 4, 9])
        self.assertEqual((e["argmin"], e["npIndex"]), ([-1, 0, 1], 3))

    def test_shifting_moves_the_argmin(self):
        self.assertEqual(oracle.argmin_case("two-wells", 1, 0)["expected"]["argmin"], [0, 2])
        self.assertEqual(oracle.argmin_case("bowl", -3, 0)["expected"]["argmin"], [-3])


class HandWorkedExpectation(unittest.TestCase):
    def test_die_with_counts_one_to_six(self):
        # p = 1/21 … 6/21; E = (1 + 4 + 9 + 16 + 25 + 36) / 21 = 91/21 = 13/3
        e = oracle.expect_case("die", [1, 2, 3, 4, 5, 6])["expected"]
        self.assertEqual((e["total"], e["sumP"], e["expectation"], e["modes"], e["isOutcome"]), (21, "1/1", "13/3", [6], False))
        self.assertEqual(e["p"], ["1/21", "2/21", "1/7", "4/21", "5/21", "2/7"])

    def test_fair_die_never_shows_its_expectation(self):
        e = oracle.expect_case("die", [1] * 6)["expected"]
        self.assertEqual((e["expectation"], e["isOutcome"], e["modes"]), ("7/2", False, [1, 2, 3, 4, 5, 6]))

    def test_payoffs_and_ratings(self):
        self.assertEqual(oracle.expect_case("payoff", [3, 1, 1])["expected"]["expectation"], "-1/5")  # (-3 + 0 + 2) / 5
        self.assertEqual(oracle.expect_case("rating", [2, 3, 5, 8, 2])["expected"]["expectation"], "9/4")  # (0 + 3 + 10 + 24 + 8) / 20
        e = oracle.expect_case("die", [0, 0, 0, 0, 0, 12])["expected"]
        self.assertEqual((e["expectation"], e["isOutcome"]), ("6/1", True))

    def test_no_data_is_undefined(self):
        e = oracle.expect_case("die", [0] * 6)["expected"]
        self.assertEqual((e["defined"], e["error"], e["expectation"]), (False, "ZeroDivisionError", None))


class HandWorkedGradient(unittest.TestCase):
    def test_exact_gradient_and_a_close_estimate(self):
        e = oracle.gradient_case(1.0, 2.0, 3)["expected"]
        self.assertEqual((e["f"], e["grad"], e["shape"], e["stationary"]), ("13/1", ["2/1", "12/1"], "(2,)", False))
        self.assertAlmostEqual(e["estimate"][0], 2.001, places=9)  # 2 theta1 + h
        self.assertAlmostEqual(e["estimate"][1], 12.003, places=6)  # 6 theta2 + 3 h
        self.assertAlmostEqual(e["error"][0], 0.001, places=9)

    def test_large_step_error_is_about_h_and_3h(self):
        e = oracle.gradient_case(1.0, 2.0, 1)["expected"]
        self.assertAlmostEqual(e["error"][0], 0.1, places=9)
        self.assertAlmostEqual(e["error"][1], 0.3, places=9)

    def test_the_origin_is_stationary(self):
        e = oracle.gradient_case(0.0, 0.0, 6)["expected"]
        self.assertEqual((e["grad"], e["stationary"]), (["0/1", "0/1"], True))

    def test_negative_coordinates(self):
        e = oracle.gradient_case(-1.5, 0.5, 3)["expected"]
        self.assertEqual((e["f"], e["grad"]), ("3/1", ["-3/1", "3/1"]))  # 2.25 + 0.75, (-3, 3)


@needs_numpy
class AgainstNumPy(unittest.TestCase):
    def test_shapes_and_indexing(self):
        for c in oracle.build_shapes():
            e = c["expected"]
            shape = tuple(int(x) for x in e["shape"].strip("()").split(",") if x.strip())
            arr = np.arange(e["count"]).reshape(shape)
            self.assertEqual(str(arr.shape), e["shape"])
            if c["kind"] == "scalar":
                continue
            idx0 = tuple(e["idx0"])
            if e["outcome"] == "IndexError":
                with self.assertRaises(IndexError):
                    arr[idx0]
            else:
                value = int(arr[idx0])
                if e["outcome"] == "value":
                    self.assertEqual(value, e["offset"])
                    self.assertEqual(int(np.ravel_multi_index(idx0, shape)), e["offset"])
                else:  # a negative index silently reads from the end: it is a valid NumPy index and the WRONG mathematical one
                    self.assertFalse(e["valid"])
                    self.assertEqual(value, int(arr[tuple(v % s for v, s in zip(idx0, shape))]))
            self.assertEqual([s // arr.itemsize for s in arr.strides], e["strides"] if e["valid"] or e["strides"] else [])

    def test_products(self):
        for c in oracle.build_algebra():
            e = c["expected"]
            X = np.ones((c["n"], c["d"]))
            ops = {
                "matvec": lambda: X @ np.ones(c["p"]),
                "matmul": lambda: X @ np.ones((c["p"], c["q"])),
                "transpose": lambda: X.T,
                "gram": lambda: X.T @ X,
            }
            if e["valid"]:
                self.assertEqual(str(ops[c["op"]]().shape), e["resultTuple"])
            else:
                with self.assertRaises(ValueError):
                    ops[c["op"]]()

    def test_norms(self):
        for c in oracle.build_norms():
            x = np.array([float(Fraction(v)) for v in c["x"]])
            e = c["expected"]
            # the exact l1 norm is a rational; NumPy adds doubles, so it is only close (a sum of non-dyadic decimals is rounded)
            self.assertAlmostEqual(float(np.linalg.norm(x, ord=1)), float(Fraction(e["l1"])), delta=1e-12 * max(1.0, float(Fraction(e["l1"]))))
            self.assertEqual(float(np.linalg.norm(x, ord=np.inf)), float(Fraction(e["linf"])))
            self.assertAlmostEqual(float(np.linalg.norm(x)), e["l2double"], delta=1e-12 * max(1.0, e["l2double"]))

    def test_argmin(self):
        thetas = np.arange(-4, 5)
        for c in oracle.build_argmin():
            u = thetas - c["c"]
            L = {"bowl": u**2, "two-wells": (u**2 - 1) ** 2, "flat-bottom": np.maximum(np.abs(u) - 1, 0) ** 2}[c["kind"]] + c["b"]
            e = c["expected"]
            self.assertEqual(L.tolist(), e["losses"])
            self.assertEqual(int(np.min(L)), e["min"])
            self.assertEqual(int(np.argmin(L)), e["npIndex"])
            self.assertEqual(int(thetas[np.argmin(L)]), e["npTheta"])
            self.assertEqual(thetas[L == np.min(L)].tolist(), e["argmin"])

    def test_expectation_in_floating_point_is_only_close(self):
        for c in oracle.build_expect():
            e = c["expected"]
            if not e["defined"]:
                continue
            counts = np.array(e["counts"])
            p = counts / counts.sum()
            self.assertAlmostEqual(float(np.average(np.array(e["values"]), weights=p)), float(Fraction(e["expectation"])), places=12)

    def test_finite_differences_are_the_same_doubles(self):
        for c in oracle.build_gradient():
            theta = np.array([c["t1"], c["t2"]])

            def f(t):
                return t[0] * t[0] + 3 * t[1] * t[1]

            h = oracle.STEP_LITERALS[c["e"]]
            est = [float((f(theta + h * np.eye(2)[j]) - f(theta)) / h) for j in (0, 1)]
            self.assertEqual(est, c["expected"]["estimate"])


class ReferenceCode(unittest.TestCase):
    @needs_numpy
    def test_shapes_example_runs(self):
        ns, lines = run_file("notation_shapes.py")
        self.assertEqual(lines[0], "(3,) (4, 3) 5 [3, 4, 5] [2, 5, 8, 11] 5 True")
        self.assertEqual(lines[1], "(3, 4) [-2.0, -2.0, -2.0, -2.0] (4, 2) (3, 3) 32.0 [4.0, 10.0, 18.0] [1, 0, 1] ValueError")
        self.assertEqual(lines[2], "4 3 2 3 4 23 (3, 4) [0, 3, 6, 9]")
        e = oracle.shape_case("matrix", 4, 3, 1, 1, 2, 3, 1)["expected"]
        self.assertEqual(ns["flat_position"], e["offset"])
        self.assertEqual(int(ns["entry"]), e["offset"])
        t = oracle.shape_case("tensor", 1, 4, 2, 3, 2, 3, 4)["expected"]
        self.assertEqual(int(ns["element_of_tensor"]), t["offset"])
        self.assertEqual(ns["mismatch"], "ValueError")
        self.assertEqual(oracle.algebra_case("matvec", 4, 3, 4, 1)["expected"]["valid"], False)

    @needs_numpy
    def test_norms_and_argmin_example_runs(self):
        ns, lines = run_file("notation_norms_argmin.py")
        self.assertEqual(lines[0], "7.0 5.0 4.0 True 5 1.4142135623730951 False")
        self.assertEqual(lines[1], "1 3 -1 [-1, 1] 1 1.0 3.0")
        e = oracle.norms_case([Fraction(3), Fraction(4)])["expected"]
        self.assertEqual((float(Fraction(e["l1"])), e["l2coef"], float(Fraction(e["linf"]))), (7.0, "5/1", 4.0))
        d = oracle.norms_case([Fraction(1), Fraction(1)])["expected"]
        self.assertEqual(ns["diagonal"], d["l2double"])
        a = oracle.argmin_case("two-wells", 0, 1)["expected"]
        self.assertEqual((a["min"], a["npIndex"], a["npTheta"], a["argmin"]), (1, 3, -1, [-1, 1]))

    @needs_numpy
    def test_expectation_and_gradient_example_runs(self):
        ns, lines = run_file("notation_expectation_gradient.py")
        self.assertEqual(lines[0], "0.9999999999999999 4.333333333333334 13/3 1 7/2 ZeroDivisionError")
        self.assertEqual(lines[1], "0.5238095238095237 5/9 21 [5, 7, 9] [6, 15] 720 3.5")
        self.assertEqual(lines[2], "[2.0, 12.0] True 2.001 0.001 2.5 True")
        e = oracle.expect_case("die", [1, 2, 3, 4, 5, 6])["expected"]
        self.assertEqual(str(ns["exact_expectation"]), e["expectation"].replace("/1", "") if e["expectation"].endswith("/1") else e["expectation"])
        self.assertEqual(Fraction(ns["fair_expectation"]), Fraction(oracle.expect_case("die", [1] * 6)["expected"]["expectation"]))
        g = oracle.gradient_case(1.0, 2.0, 3)["expected"]
        self.assertEqual(float(ns["estimate"]), g["estimate"][0])
        self.assertEqual(ns["grad"].tolist(), [float(Fraction(x)) for x in g["grad"]])
        self.assertEqual(ns["p_A_given_B"], Fraction(5, 9))
        self.assertEqual(ns["by_column"], [5, 7, 9])


class FixtureShape(unittest.TestCase):
    def test_fixture_is_valid_json_and_fresh(self):
        text = oracle.render(oracle.build_fixture())
        self.assertEqual(json.loads(text)["schema"], oracle.SCHEMA)
        self.assertEqual(oracle.FIXTURE_PATH.read_text(encoding="utf-8"), text)


if __name__ == "__main__":
    unittest.main()
