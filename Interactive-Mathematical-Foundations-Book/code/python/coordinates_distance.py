import math
from fractions import Fraction


def displacement(a, b):
    """The displacement from point a to point b: b - a, component by component."""
    return (b[0] - a[0], b[1] - a[1])


def squared_distance(a, b):
    dx, dy = displacement(a, b)
    return dx * dx + dy * dy


A, B = (1, 2), (4, 6)
step = displacement(A, B)  # (3, 4): the direction matters ...
step_back = displacement(B, A)  # (-3, -4): ... so reversing it flips both signs
distance = math.hypot(*step)  # 5.0: the length of the step
distance_from_points = math.dist(A, B)  # 5.0: math.dist takes the two points directly
same_both_ways = math.dist(B, A) == math.dist(A, B)  # True: distance has no direction
taxicab = abs(step[0]) + abs(step[1])  # 7: walking along the axes, never shorter than 5.0
midpoint = ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)  # (2.5, 4.0)

# Comparing distances needs no square root: both sides are non-negative, so d1 < d2 exactly when d1**2 < d2**2.
origin = (0, 0)
closer = squared_distance(origin, (3, 4)) < squared_distance(origin, (4, 4))  # 25 < 32: True

# Equal distances, decided exactly. Build Fractions from STRINGS so that no binary rounding enters.
P = (Fraction("0.1"), Fraction("0.7"))
Q = (Fraction("0.5"), Fraction("0.5"))
exact_equal = squared_distance(origin, P) == squared_distance(origin, Q)  # True: both are 1/2
float_equal = (0.1**2 + 0.7**2) == (0.5**2 + 0.5**2)  # False: 0.49999999999999994 against 0.5

print(step, distance, taxicab, midpoint, exact_equal, float_equal)
