import numpy as np

u = np.array([2.0, 1.0])
v = np.array([1.0, 2.0])
sum_vector = u + v          # elementwise; plain Python lists concatenate
move_from_u_to_v = v - u
assert np.array_equal(sum_vector, [3, 3])
assert np.array_equal(move_from_u_to_v, [-1, 1])
