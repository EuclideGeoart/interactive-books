"""Tabulate secant slopes with NumPy and compare with the analytic derivative (III.3)."""
import numpy as np

f = lambda x: x**3 / 6 - x
fprime = lambda x: x**2 / 2 - 1          # derived analytically, not from the table

x = 1.0
h = 2.0 ** -np.arange(0, 12)              # nonzero steps only
slopes = (f(x + h) - f(x)) / h
gaps = np.abs(slopes - fprime(x))

# For this cubic m(h) = f'(x) + h/2 + h**2/6, so the gap shrinks roughly in proportion to h.
assert np.all(np.diff(gaps) < 0)
assert gaps[-1] < 1e-3
# Both sides agree for a smooth function.
left = (f(x - h) - f(x)) / (-h)
assert np.allclose(left[-4:], fprime(x), atol=3e-3)   # gap ≈ h/2 ≤ 2⁻⁹
