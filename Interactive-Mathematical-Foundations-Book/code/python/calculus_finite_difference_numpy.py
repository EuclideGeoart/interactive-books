"""Sweep h = 10**-1 ... 10**-16 for sin at 1: forward error is smallest near sqrt(eps), centered near eps**(1/3) (III.14)."""
import numpy as np

x = 1.0
h = 10.0 ** -np.arange(1, 17)
forward = np.abs((np.sin(x + h) - np.sin(x)) / h - np.cos(x))
centered = np.abs((np.sin(x + h) - np.sin(x - h)) / (2 * h) - np.cos(x))
eps = np.finfo(float).eps
assert abs(np.log10(h[np.argmin(forward)]) - np.log10(np.sqrt(eps))) <= 1.5
assert abs(np.log10(h[np.argmin(centered)]) - np.log10(np.cbrt(eps))) <= 1.5
assert centered.min() < forward.min()          # higher order wins at its best step
assert forward[-3] > 100 * forward.min()       # tiny steps are much worse
