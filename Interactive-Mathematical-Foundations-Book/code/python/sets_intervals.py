from dataclasses import dataclass
from fractions import Fraction

# Closed endpoints are tests like x >= a. With doubles, 0.1 + 0.2 is not 0.3, so a closed test can fail by one rounding error.
double_sum = 0.1 + 0.2  # 0.30000000000000004
float_test = 0.3 <= double_sum <= 0.3  # False: the point 0.3 "missed" its own closed interval

# Fraction('0.1') reads the TEXT and gives exactly 1/10. Fraction(0.1) would read the double, which is not 1/10.
tenth, fifth = Fraction("0.1"), Fraction("0.2")
exact_test = Fraction("0.3") <= tenth + fifth <= Fraction("0.3")  # True


@dataclass(frozen=True)
class Interval:
    """The set of x with lo <= x <= hi, each end open or closed. An infinite end is None and is always open."""

    lo: Fraction | None
    hi: Fraction | None
    lo_closed: bool = True
    hi_closed: bool = True

    def contains(self, x: Fraction) -> bool:
        above = self.lo is None or (x >= self.lo if self.lo_closed else x > self.lo)
        below = self.hi is None or (x <= self.hi if self.hi_closed else x < self.hi)
        return above and below

    def is_empty(self) -> bool:
        if self.lo is None or self.hi is None:
            return False
        return self.lo > self.hi or (self.lo == self.hi and not (self.lo_closed and self.hi_closed))


def touch_and_merge(left: Interval, right: Interval) -> bool:
    """Do two intervals with left.hi == right.lo form ONE interval? Only if the shared point belongs to at least one."""
    return left.hi == right.lo and (left.hi_closed or right.lo_closed)


a = Interval(Fraction(0), Fraction(1), True, False)  # [0, 1)
b = Interval(Fraction(1), Fraction(2), False, True)  # (1, 2]
c = Interval(Fraction(1), Fraction(2), True, True)  # [1, 2]

joined_ab = touch_and_merge(a, b)  # False: 1 belongs to neither, so [0,1) ∪ (1,2] is two pieces
joined_ac = touch_and_merge(a, c)  # True:  [0,1) ∪ [1,2] = [0,2]
one_in_union = a.contains(Fraction(1)) or b.contains(Fraction(1))  # False
reversed_is_empty = Interval(Fraction(3), Fraction(1)).is_empty()  # True: left end greater than right end
point_is_not_empty = Interval(Fraction(1), Fraction(1)).is_empty()  # False: [1, 1] = {1}
open_point_is_empty = Interval(Fraction(1), Fraction(1), False, True).is_empty()  # True: (1, 1] has nothing in it

print(double_sum, float_test, exact_test, joined_ab, joined_ac, one_in_union, reversed_is_empty, point_is_not_empty, open_point_is_empty)
