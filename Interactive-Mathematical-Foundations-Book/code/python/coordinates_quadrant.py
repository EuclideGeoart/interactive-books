import math


def quadrant(x, y):
    """The quadrant 1..4 of the point (x, y), or None for a point on an axis or the origin: the axes belong to no quadrant."""
    if x == 0 or y == 0:
        return None
    if x > 0:
        return 1 if y > 0 else 4
    return 2 if y > 0 else 3


def lumpy_quadrant(x, y):
    """The common mistake: the last `else` swallows every point that is not strictly inside quadrants I-III."""
    if x > 0 and y > 0:
        return 1
    elif x < 0 and y > 0:
        return 2
    elif x < 0 and y < 0:
        return 3
    else:
        return 4


second = quadrant(-3, 2)  # 2
fourth = quadrant(3, -2)  # 4
on_y_axis = quadrant(0, -4)  # None: (0, -4) is on the axis, in no quadrant
at_origin = quadrant(0, 0)  # None

wrong_on_axis = lumpy_quadrant(0, -4)  # 4: wrong, the point is on an axis
wrong_at_origin = lumpy_quadrant(0, 0)  # 4: wrong, the origin is in no quadrant

# -0.0 is a distinct double that compares equal to 0, so == 0 catches it, but a "sign bit" test does not.
negative_zero = quadrant(-0.0, 3)  # None: -0.0 == 0
sign_bit_of_negative_zero = math.copysign(1, -0.0)  # -1.0: the sign bit says "negative" for a zero

print(second, fourth, on_y_axis, wrong_on_axis, negative_zero)
