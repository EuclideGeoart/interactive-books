"""Observed trapezoid orders: about 2 for sin on [0, 3], about 1.5 for sqrt on [0, 1] (III.15)."""
import numpy as np

def trapezoid(f, a, b, n):
    x = np.linspace(a, b, n + 1)
    return np.trapezoid(f(x), x)

def observed(f, a, b, exact, k):
    e1, e2 = abs(trapezoid(f, a, b, 2**k) - exact), abs(trapezoid(f, a, b, 2**(k + 1)) - exact)
    return np.log2(e1 / e2)

assert abs(observed(np.sin, 0, 3, 1 - np.cos(3), 8) - 2) < 0.05
assert abs(observed(np.sqrt, 0, 1, 2 / 3, 10) - 1.5) < 0.05
