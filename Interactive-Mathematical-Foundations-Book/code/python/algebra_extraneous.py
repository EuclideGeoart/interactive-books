import math
from fractions import Fraction


def squared_roots(p, q):
    """Roots of the SQUARED equation x + p = (x + q)**2, i.e. x**2 + (2q - 1)x + (q**2 - p) = 0, as floats (None when there are none)."""
    discriminant = 4 * p - 4 * q + 1
    if discriminant < 0:
        return None
    root = math.sqrt(discriminant)
    return sorted([(1 - 2 * q - root) / 2, (1 - 2 * q + root) / 2])


def classify(p, q, x):
    """Substitute a candidate into the ORIGINAL equation sqrt(x + p) = x + q. Squaring cannot be trusted; substitution can."""
    if x + p < 0:
        return "outside the domain"  # sqrt(x + p) is not defined for x < -p
    return "valid" if math.isclose(math.sqrt(x + p), x + q, abs_tol=1e-12) else "extraneous"


def exact_check(p, q, x):
    """The same test in exact arithmetic for a Fraction x: sqrt(x + p) is a Fraction only if numerator and denominator are perfect squares."""
    r = x + p
    if r < 0:
        return False
    n, d = math.isqrt(r.numerator), math.isqrt(r.denominator)
    return n * n == r.numerator and d * d == r.denominator and Fraction(n, d) == x + q


# p = 2, q = 0:  sqrt(x + 2) = x  ->  x + 2 = x**2  ->  x = -1 or x = 2
roots = squared_roots(2, 0)  # [-1.0, 2.0]
verdicts = [classify(2, 0, x) for x in roots]  # ['extraneous', 'valid']
print(roots, verdicts)
print(math.sqrt(-1 + 2), "!=", -1)  # 1.0 != -1 : the root -1 satisfies -sqrt(x + 2) = x, the other sign
print([exact_check(2, 0, Fraction(x)) for x in (-1, 2)])  # [False, True]

# p = 1, q = 0:  sqrt(x + 1) = x  has the irrational candidates (1 +- sqrt(5))/2
golden, conjugate = squared_roots(1, 0)[1], squared_roots(1, 0)[0]
print(classify(1, 0, golden), classify(1, 0, conjugate))  # valid extraneous
print(golden, conjugate)  # 1.618033988749895 -0.6180339887498949
print(math.sqrt(conjugate + 1), -conjugate)  # both are 0.618... (equal up to rounding): the conjugate solves -sqrt(x + 1) = x
print(squared_roots(0, 1))  # None : sqrt(x) = x + 1 has no candidates at all (the discriminant is -3)

# The division fallacy: x(x - 2) = 3(x - 2).  Dividing by (x - 2) gives x = 3 and loses x = 2, where both sides are 0.
def both_sides(x, c=2, m=3):
    return x * (x - c), m * (x - c)


solutions = [x for x in range(-10, 11) if both_sides(x)[0] == both_sides(x)[1]]  # a scan, nothing divided
print(solutions)  # [2, 3]
print(both_sides(2))  # (0, 0) : dividing by (x - 2) is dividing by zero at x = 2
