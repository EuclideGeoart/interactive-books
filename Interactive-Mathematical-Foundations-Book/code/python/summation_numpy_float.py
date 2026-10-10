import math

import numpy as np

# Sigma notation as arrays. Index convention: NumPy is zero-based, the mathematics here starts at i = 1.
n = 10
i = np.arange(1, n + 1)  # the indices 1, 2, ..., n  (np.arange stops BEFORE its second argument, like range)
total_int = int(i.sum())  # 55 = n(n+1)/2, exact in integer arithmetic
squares = int((i**2).sum())  # 385

# The weighted sum, the dot product and the mean are all sums.
w = np.array([0.5, 0.25, 0.25])
x = np.array([4.0, 8.0, 12.0])
dot = float(w @ x)  # sum_i w_i x_i = 2 + 2 + 3 = 7
mean = float(x.sum() / x.size)  # (4 + 8 + 12) / 3 = 8

# Sums of doubles are NOT exact, and the order of addition matters: adding a tiny term to a huge accumulator can lose it completely.
big, tiny = 1e16, 1.0
lost = (big + tiny) - big  # 0.0: 1e16 + 1 rounds back to 1e16 (the spacing of doubles near 1e16 is 2)
kept = (big - big) + tiny  # 1.0: add the small term to a small accumulator instead

# Adding 0.1 ten times does not give 1.0 with a plain loop; math.fsum tracks the lost low-order bits and does.
acc = 0.0
for _ in range(10):
    acc += 0.1
naive_sum = acc  # 0.9999999999999999
careful_sum = math.fsum([0.1] * 10)  # 1.0
naive_is_one = naive_sum == 1.0  # False
careful_is_one = careful_sum == 1.0  # True

# For many terms the plain left-to-right loop drifts; NumPy's pairwise summation drifts much less. Compare both with the correctly rounded fsum.
values = np.full(10**5, 0.1)
exact = math.fsum(values.tolist())
pairwise_error = abs(float(values.sum()) - exact)
left_to_right = 0.0
for v in values.tolist():
    left_to_right += v
loop_error = abs(left_to_right - exact)
pairwise_wins = pairwise_error < loop_error  # True: same numbers, same exact answer, different order of additions

print(total_int, squares, dot, mean, lost, kept, naive_sum, careful_sum, naive_is_one, careful_is_one, pairwise_error, loop_error, pairwise_wins)
