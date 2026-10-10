import math

# Python's trigonometric functions take RADIANS. A full turn is 2*pi.
theta = math.pi / 6
cos_t, sin_t = math.cos(theta), math.sin(theta)  # 0.8660254037844387 and 0.49999999999999994: sqrt(3)/2 and 1/2 up to rounding

# cos^2 + sin^2 = 1 holds exactly in mathematics; the doubles agree to about 1e-16, so compare with isclose.
pythagorean_gap = cos_t**2 + sin_t**2 - 1.0
pythagorean_ok = math.isclose(cos_t**2 + sin_t**2, 1.0, rel_tol=1e-15)

# pi is stored rounded, so sin(pi) is not 0 and cos(pi/2) is not 0. Never test a trigonometric value with ==.
sin_pi = math.sin(math.pi)  # 1.2246467991473532e-16
cos_half_pi = math.cos(math.pi / 2)  # 6.123233995736766e-17
sin_pi_is_zero = math.isclose(sin_pi, 0.0, abs_tol=1e-12)  # True: ask for a tolerance

# Periodicity: adding a full turn gives the same point (to rounding).
periodic = math.isclose(math.sin(theta + 2 * math.pi), math.sin(theta), rel_tol=0, abs_tol=1e-15)

# arcsin(sin t) is NOT t unless t is in [-pi/2, pi/2]: arcsin only returns angles in that interval.
arcsin_of_sin_2 = math.asin(math.sin(2.0))  # 1.1415926535897933, which is pi - 2 up to rounding

# atan2(sin t, cos t) IS t modulo 2*pi, in (-pi, pi]: it sees the signs of both components.
atan2_of_4 = math.atan2(math.sin(4.0), math.cos(4.0))  # -2.2831853071795867, which is 4 - 2*pi up to rounding

# Degrees and radians: 180 degrees is pi radians.
thirty_degrees = math.radians(30.0)  # 0.5235987755982988
back_to_degrees = math.degrees(math.pi / 6)  # 29.999999999999996: close to 30, not equal

print(cos_t, sin_t, pythagorean_ok, sin_pi, cos_half_pi, sin_pi_is_zero, periodic, arcsin_of_sin_2, atan2_of_4, thirty_degrees, back_to_degrees)
