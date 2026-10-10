import math

# v = (-3, 2): left of the y-axis, above the x-axis (quadrant II).
x, y = -3.0, 2.0

theta_naive = math.atan(y / x)  # -0.588...: arctan only returns angles between -pi/2 and pi/2
theta = math.atan2(y, x)  # 2.553...: atan2 looks at the signs of BOTH y and x

# -v = (3, -2) has exactly the same ratio y/x, so atan cannot tell v from -v apart.
theta_naive_of_minus_v = math.atan((-y) / (-x))  # the same -0.588... as for v
theta_of_minus_v = math.atan2(-y, -x)  # -0.588...: atan2 DOES see the difference (it is theta - pi)


def direction(x, y):
    """The angle from the +x axis in (-pi, pi], or None for the zero vector (it has no direction)."""
    if x == 0 and y == 0:
        return None
    return math.atan2(y, x)


zero_direction = direction(0.0, 0.0)  # None: the mathematics has no answer
silent_zero = math.atan2(0.0, 0.0)  # 0.0: the library quietly picks a value. Do not mistake it for a direction.

# A vertical vector has no ratio y/x at all, but it has a perfectly good direction.
try:
    math.atan(2.0 / 0.0)
except ZeroDivisionError:
    vertical_naive = "ZeroDivisionError"
vertical_atan2 = math.atan2(2.0, 0.0)  # pi/2

print(theta_naive, theta, theta_of_minus_v, zero_direction, vertical_naive, vertical_atan2)
