"""Two approaches to 0 that disagree for sin(1/x), and a squeeze that works for x*sin(1/x) (III.1)."""
import numpy as np

k = np.arange(1, 200)
zeros = 1 / (k * np.pi)                  # sin(1/x) = sin(k*pi) = 0
ones = 2 / ((4 * k + 1) * np.pi)         # sin(1/x) = sin(pi/2 + 2k*pi) = 1
assert np.allclose(np.sin(1 / zeros), 0, atol=1e-12)
assert np.allclose(np.sin(1 / ones), 1, atol=1e-12)
# Both sequences approach 0 from the right, yet the values approach 0 and 1: no limit exists.
assert zeros[-1] < 1e-2 and ones[-1] < 1e-2

# Squeeze: |x sin(1/x)| <= |x| -> 0.
x = np.concatenate([-np.logspace(-1, -8, 400), np.logspace(-8, -1, 400)])
assert np.all(np.abs(x * np.sin(1 / x)) <= np.abs(x))
