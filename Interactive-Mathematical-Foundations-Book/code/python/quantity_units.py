# A quantity is a number and a unit. Keep the unit as a tuple of exponents (metres, seconds, kilograms).
LENGTH = (1, 0, 0)
TIME = (0, 1, 0)


def times(a, b):
    """Multiplying quantities ADDS the exponents."""
    return (a[0] * b[0], tuple(x + y for x, y in zip(a[1], b[1])))


def over(a, b):
    """Dividing quantities SUBTRACTS the exponents."""
    return (a[0] / b[0], tuple(x - y for x, y in zip(a[1], b[1])))


def plus(a, b):
    """Adding needs identical units, and keeps them."""
    if a[1] != b[1]:
        raise ValueError(f"cannot add units {a[1]} and {b[1]}")
    return (a[0] + b[0], a[1])


def sqrt_unit(a):
    """A square root halves the exponents, so they must all be even."""
    if any(e % 2 for e in a[1]):
        raise ValueError(f"the square root of units {a[1]} needs a fractional exponent")
    return (a[0] ** 0.5, tuple(e // 2 for e in a[1]))


side = (3.0, LENGTH)  # 3 m
area = times(side, side)  # (9.0, (2, 0, 0)): 9 m^2
speed = over((12.0, LENGTH), (4.0, TIME))  # (3.0, (1, -1, 0)): 3 m/s
back_to_side = sqrt_unit(area)  # (3.0, (1, 0, 0)): 3 m again
ratio = over(side, side)  # (1.0, (0, 0, 0)): no unit left

try:
    plus(side, (2.0, TIME))  # 3 m + 2 s
except ValueError as error:
    refused_sum = str(error)

try:
    sqrt_unit(side)  # sqrt(3 m) would be m^(1/2)
except ValueError as error:
    refused_root = str(error)

print(area, speed, back_to_side, ratio, refused_sum, refused_root)
