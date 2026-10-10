from fractions import Fraction


def solve_linear(a1, b1, a2, b2):
    """Solve a1*x + b1 = a2*x + b2 exactly. The answer is one of exactly three things."""
    m = a1 - a2  # what is left in front of x after moving the x-terms to the left
    c = b2 - b1  # what is left on the right after moving the constants
    if m == 0:  # the equation reads 0 = c and does not involve x at all
        return ("all",) if c == 0 else ("none",)
    return ("point", Fraction(c) / m)  # Fraction keeps integers and decimals-from-strings exact


def solve_inequality(a1, b1, rel, a2, b2):
    """Solve a1*x + b1 (rel) a2*x + b2 for rel in '<', '<=', '>', '>='. Dividing by a negative m reverses the relation."""
    flipped = {"<": ">", "<=": ">=", ">": "<", ">=": "<="}
    m, c = a1 - a2, b2 - b1
    if m == 0:  # 0 (rel) c: true for every x or for none
        holds = {"<": 0 < c, "<=": 0 <= c, ">": 0 > c, ">=": 0 >= c}[rel]
        return ("all",) if holds else ("none",)
    if m < 0:  # dividing both sides by a negative number reverses the order
        rel = flipped[rel]
    return ("x", rel, Fraction(c) / m)


# 3x + 2 = x + 10  ->  2x = 8  ->  x = 4
print(solve_linear(3, 2, 1, 10))  # ('point', Fraction(4, 1))
print(solve_linear(2, 3, 2, 7))  # ('none',)   : 0 = 4
print(solve_linear(2, 3, 2, 3))  # ('all',)    : 0 = 0

# the same operation on both sides keeps the solution: subtract x, subtract 2, divide by 2 (each step is reversible)
step1 = (3 - 1, 2, 0, 10)  # 2x + 2 = 10
step2 = (2, 0, 0, 8)  # 2x = 8
step3 = (1, 0, 0, 4)  # x = 4
history_agrees = all(solve_linear(*s) == solve_linear(3, 2, 1, 10) for s in (step1, step2, step3))
print(history_agrees)  # True

# multiplying both sides by 0 is the one operation that is NOT allowed: 0 = 0 holds for every x, but x = 4 was the only solution
times_zero = solve_linear(0 * 3, 0 * 2, 0 * 1, 0 * 10)  # ('all',)
print(times_zero, times_zero == solve_linear(3, 2, 1, 10))  # ('all',) False

# 4 - 2x < x + 10  ->  -3x < 6  ->  dividing by -3 reverses the order:  x > -2
print(solve_inequality(-2, 4, "<", 1, 10))  # ('x', '>', Fraction(-2, 1))
wrong_if_not_reversed = ("x", "<", Fraction(-2))  # what forgetting the reversal would claim
test_point = Fraction(-5)  # satisfies the WRONG answer (-5 < -2) ...
original_holds_at_test_point = (-2 * test_point + 4) < (1 * test_point + 10)  # 14 < 5 is False
print(original_holds_at_test_point)  # False: ... but not the original inequality

# exactness: the same equation 0.1x + 0.2 = 0.3 solved with floats and with Fractions built from strings
float_x = (0.3 - 0.2) / 0.1  # 0.9999999999999998
exact_x = solve_linear(Fraction("0.1"), Fraction("0.2"), Fraction(0), Fraction("0.3"))[1]  # Fraction(1, 1)
print(float_x, exact_x, float_x == 1, exact_x == 1)  # 0.9999999999999998 1 False True

# a coefficient that should cancel to exactly 0 may not, in floats: 0.1 + 0.2 - 0.3 is 2**-54, not 0
m_float = (0.1 + 0.2) - 0.3
print(m_float, m_float == 2.0**-54, (2 - 1) / m_float)  # 5.551115123125783e-17 True 1.8014398509481984e+16 : "no solution" became a huge x
m_exact = (Fraction("0.1") + Fraction("0.2")) - Fraction("0.3")
print(m_exact, solve_linear(Fraction("0.1") + Fraction("0.2"), 1, Fraction("0.3"), 2))  # 0 ('none',)
