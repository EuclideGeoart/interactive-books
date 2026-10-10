import math

import numpy as np


# The domain of a function is the set of inputs for which the machine can finish. Python tells you the moment it cannot:
# a division by zero or a square root of a negative number raises an exception instead of returning a number.
def reciprocal_shift(x):
    return 1 / (x - 2)  # undefined where x - 2 = 0


def root_shift(x):
    return math.sqrt(x + 3)  # undefined where x + 3 < 0


def defined(f, x):
    try:
        f(x)
    except (ZeroDivisionError, ValueError):
        return False
    return True


print([defined(reciprocal_shift, x) for x in (0, 1, 2, 3)])  # [True, True, False, True]: only x = 2 is refused
print([defined(root_shift, x) for x in (-4, -3, 0)])  # [False, True, True]: the edge x = -3 belongs to the domain

try:
    math.sqrt(-1)
except ValueError as error:
    print(error)  # math domain error

# The domain of a composite is smaller than the domain of the inner function: sqrt(2x - 1) needs 2x - 1 >= 0, so x >= 1/2.
print([defined(lambda x: math.sqrt(2 * x - 1), x) for x in (0, 0.5, 1)])  # [False, True, True]

# NumPy applies the rule to a whole array. Invalid inputs become nan (not a number) rather than raising, so state the
# domain yourself with a mask, and say what to do outside it.
x = np.array([-4.0, -3.0, 0.0, 5.0])
inside = x + 3 >= 0
y = np.where(inside, np.sqrt(np.where(inside, x + 3, 0.0)), np.nan)
print(y.tolist())  # [nan, 0.0, 1.7320508075688772, 2.8284271247461903]
print(inside.tolist())  # [False, True, True, True]
