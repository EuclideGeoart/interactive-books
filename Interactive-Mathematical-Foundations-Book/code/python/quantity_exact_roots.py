from fractions import Fraction
from math import gcd, isqrt


def simplify_sqrt(n):
    """Write sqrt(n) as a*sqrt(b) with b square-free, for a whole number n >= 0. Returns (a, b)."""
    a, b, d = 1, n, 2
    while d * d <= b:
        while b % (d * d) == 0:  # a square factor d*d can leave the root as d
            b //= d * d
            a *= d
        d += 1
    return a, b


def exact_sqrt(q):
    """sqrt of a non-negative rational, as (a, b, c) meaning a*sqrt(b)/c, or None for a negative number."""
    q = Fraction(q)
    if q < 0:
        return None  # no real square root
    # sqrt(p/q) = sqrt(p*q) / q : after this step the number under the root is a whole number
    a, b = simplify_sqrt(q.numerator * q.denominator)
    g = gcd(a, q.denominator)  # 6*sqrt(2)/9 is the same number as 2*sqrt(2)/3: cancel the common factor
    return a // g, b, q.denominator // g


# Perfect squares come out whole; everything else keeps its root symbol.
side_of_area_9 = exact_sqrt(9)  # (3, 1, 1): 3 exactly
side_of_area_12 = exact_sqrt(12)  # (2, 3, 1): 2*sqrt(3), exactly
side_of_area_8_9 = exact_sqrt(Fraction(8, 9))  # (2, 2, 3): 2*sqrt(2)/3
side_of_area_2_25 = exact_sqrt(Fraction("2.25"))  # (3, 1, 2): 3/2, since 2.25 = 9/4
side_of_area_negative = exact_sqrt(-4)  # None

# The check that matters: square the answer and compare with what you started from.
a, b, c = side_of_area_8_9
round_trip = Fraction(a * a * b, c * c)  # (a*sqrt(b)/c)**2 = a*a*b / (c*c), all whole numbers

# isqrt is exact for whole numbers of any size, unlike int(math.sqrt(n)).
exact_floor = isqrt(10**30 + 1)  # 10**15

print(side_of_area_12, side_of_area_8_9, round_trip, exact_floor)
