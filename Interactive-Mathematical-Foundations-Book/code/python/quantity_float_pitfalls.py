import cmath
import math

# Floating point stores binary fractions, so most decimals are stored with a tiny error.
square_of_point_one = 0.1**2  # 0.010000000000000002, not 0.01
exactly_equal = math.sqrt(2) ** 2 == 2  # False: sqrt(2) was rounded, squaring does not undo the rounding
squared_root_of_two = math.sqrt(2) ** 2  # 2.0000000000000004
close_enough = math.isclose(math.sqrt(2) ** 2, 2)  # True: compare with a tolerance, never with ==

# math.sqrt only knows real numbers.
try:
    math.sqrt(-1)
except ValueError as error:
    real_sqrt_of_negative = str(error)  # math domain error
complex_sqrt = cmath.sqrt(-1)  # 1j: the complex number whose square is -1 (a different number system)

# Python's ** with a fractional exponent silently switches to complex numbers for a negative base.
cube_root_attempt = (-8) ** (1 / 3)  # (1.0000000000000002+1.7320508075688772j), NOT -2
real_cube_root = -(8 ** (1 / 3))  # -2.0: take the root of the size, then restore the sign (odd roots only)

# Integer powers are exact in Python for whole numbers of any size.
big_power = 3**100  # 515377520732011331036461129765621272702107522001

# Negative exponents mean reciprocals, and 0 has no reciprocal.
try:
    0.0**-1
except ZeroDivisionError:
    zero_negative_power = "ZeroDivisionError"

print(square_of_point_one, squared_root_of_two, cube_root_attempt, real_cube_root)
