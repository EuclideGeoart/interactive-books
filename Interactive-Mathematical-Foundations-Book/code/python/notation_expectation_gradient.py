from fractions import Fraction

import numpy as np

# Expectation of a finite distribution: E[X] = sum_i p_i x_i, with p_i >= 0 and sum_i p_i = 1.
# Counts become probabilities by dividing by their total: p_i = c_i / sum(c). The division is the taught step, and it is only defined for a non-zero total.
values = np.array([1, 2, 3, 4, 5, 6])  # the faces of a die
counts = np.array([1, 2, 3, 4, 5, 6])  # how often each face was seen
p = counts / counts.sum()  # 1/21, 2/21, ..., 6/21 (floating point)
sum_of_p = float(p.sum())  # about 1.0
expectation = np.average(values, weights=p)  # sum(p * values): about 13/3 = 4.333...
exact_p = [Fraction(int(c), int(counts.sum())) for c in counts]
exact_expectation = sum(pi * int(v) for pi, v in zip(exact_p, values))  # Fraction(13, 3), exact
exact_sum_of_p = sum(exact_p)  # Fraction(1, 1)

fair = [Fraction(1, 6)] * 6
fair_expectation = sum(pi * int(v) for pi, v in zip(fair, values))  # Fraction(7, 2): a die never shows 3.5

try:
    Fraction(0, int(np.zeros(6).sum()))  # all counts zero: the total is 0, so there is no distribution
    zero_total = 'no error'
except ZeroDivisionError:
    zero_total = 'ZeroDivisionError'

# Probability notation as arithmetic on a small table of joint counts: P(A | B) = P(A and B) / P(B).
mask = values > 4  # the event A: the die shows more than 4
p_A = np.sum(p[mask])  # P(A) = (5 + 6) / 21
p_AB = Fraction(5, 21)  # P(A and B) with B = "the face is odd": only face 5 is odd and above 4
p_B = Fraction(1 + 3 + 5, 21)  # P(B) = 9/21
p_A_given_B = p_AB / p_B  # Fraction(5, 9)

# Sums and means over an axis, with the index convention stated: a.sum(axis=0) adds DOWN the rows.
a = np.array([[1, 2, 3], [4, 5, 6]])
total = np.sum(a)  # 21
by_column = a.sum(axis=0).tolist()  # [5, 7, 9]: one sum per column (feature)
by_row = a.sum(axis=1).tolist()  # [6, 15]: one sum per row (example)
product = np.prod(a)  # 720
mean = np.mean(a)  # 3.5

# The gradient of f(theta) = theta1**2 + 3 * theta2**2 has the SAME SHAPE as theta, and a finite difference only approximates it.
t1, t2 = 1.0, 2.0
theta = np.array([t1, t2])
grad = np.array([2 * t1, 6 * t2])  # (2, 12), exact for these values
same_shape = grad.shape == theta.shape  # True


def f(theta):
    return theta[0] * theta[0] + 3 * theta[1] * theta[1]  # the same operations, in the same order, as the stage


h = 1e-3
e_j = np.array([1.0, 0.0])  # the first coordinate direction
estimate = (f(theta + h * e_j) - f(theta)) / h  # about 2.001: close to 2 but not equal
error = float(estimate - grad[0])  # about 0.001: the step h shows up in the error

x_abs = abs(-2.5)  # |x| = 2.5
A = {1, 2, 3}
member = 2 in A  # x in A

print(float(sum_of_p), float(expectation), exact_expectation, exact_sum_of_p, fair_expectation, zero_total)
print(float(p_A), p_A_given_B, int(total), by_column, by_row, int(product), float(mean))
print(grad.tolist(), same_shape, round(float(estimate), 3), round(error, 3), x_abs, member)
