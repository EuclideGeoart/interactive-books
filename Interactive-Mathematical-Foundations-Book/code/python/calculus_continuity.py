"""The three conditions of continuity, decided exactly for two polynomial pieces meeting at x = 1 (III.2)."""
from fractions import Fraction as F


def check(c, m, value_at_1):
    """Left piece x**2 + c (x < 1), right piece m*x (x > 1), f(1) = value_at_1 (None = undefined)."""
    left_limit = 1 + c            # polynomial pieces: the one-sided limit is the piece evaluated at 1
    right_limit = m
    defined = value_at_1 is not None
    limit_exists = left_limit == right_limit
    agrees = defined and limit_exists and value_at_1 == left_limit
    return defined, limit_exists, agrees


assert check(F(1), F(2), F(2)) == (True, True, True)       # joined
assert check(F(0), F(2), F(2)) == (True, False, False)     # jump
assert check(F(1), F(2), F(0)) == (True, True, False)      # removable: limit 2, value 0
assert check(F(1), F(2), None) == (False, True, False)     # value missing
