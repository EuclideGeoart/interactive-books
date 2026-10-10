import math
from fractions import Fraction

import numpy as np

# Norms. For x = (3, 4) every norm is a whole number; for (1, 1) the l2 norm is sqrt(2), an irrational number that no double stores exactly.
x = np.array([3.0, 4.0])
l1 = np.linalg.norm(x, ord=1)  # |3| + |4| = 7
l2 = np.linalg.norm(x)  # sqrt(3**2 + 4**2) = 5
linf = np.linalg.norm(x, ord=np.inf)  # max(|3|, |4|) = 4
chain = bool(linf <= l2 <= l1)  # ||x||_inf <= ||x||_2 <= ||x||_1 for every vector

# The same l2 norm exactly: the squared norm is a rational number, and an integer square root decides whether the norm is rational.
sum_of_squares = Fraction(3) ** 2 + Fraction(4) ** 2
root = math.isqrt(25)
exact_l2 = Fraction(root) if root * root == sum_of_squares else None  # Fraction(5, 1)
diagonal = np.linalg.norm(np.array([1.0, 1.0]))  # 1.4142135623730951, the nearest double to sqrt(2)
diagonal_squared_is_two = diagonal * diagonal == 2.0  # False: squaring the rounded root does not return exactly 2

# arg min versus min. The loss on a grid of candidate parameters: L(theta) = (theta**2 - 1)**2 + 1 has TWO minimisers, -1 and 1.
thetas = np.arange(-4, 5)
L = (thetas**2 - 1) ** 2 + 1
best_value = np.min(L)  # the minimum VALUE: 1
best_position = int(np.argmin(L))  # the 0-based POSITION of the FIRST minimum: 3
best_theta = thetas[np.argmin(L)]  # the parameter at that position: -1 (the other minimiser, 1, is not reported)
all_minimisers = thetas[L == best_value].tolist()  # [-1, 1]: argmin as a SET
p = np.array([0.1, 0.5, 0.4])
most_likely = int(np.argmax(p))  # the position of the largest entry: 1

# Conventions: log is the natural logarithm; bits need log2.
nats = np.log(math.e)  # 1.0
bits = np.log2(8.0)  # 3.0

print(float(l1), float(l2), float(linf), chain, exact_l2, float(diagonal), diagonal_squared_is_two)
print(int(best_value), best_position, int(best_theta), all_minimisers, most_likely, float(nats), float(bits))
