import numpy as np

v = np.array([3.0, 2.0])
k = -1.5
scaled = k * v
assert np.array_equal(scaled, [-4.5, -3])
assert np.isclose(np.hypot(*scaled), abs(k) * np.hypot(*v))
# k = 0 yields zero; do not attach a direction to that result.
