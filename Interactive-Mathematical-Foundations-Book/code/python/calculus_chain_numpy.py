"""e**sin(x): chain-rule derivative versus a centered difference with a bounded error (III.6)."""
import numpy as np

x = np.linspace(-3, 3, 61)
chain = np.exp(np.sin(x)) * np.cos(x)            # f'(u) at u = sin x, times g'(x)
h = 1e-5
centered = (np.exp(np.sin(x + h)) - np.exp(np.sin(x - h))) / (2 * h)
# Truncation ~ h**2 |h'''|/6 (|h'''| < 20 here) plus rounding ~ eps*e/h.
assert np.max(np.abs(chain - centered)) < 20 * h**2 / 6 + 4 * np.finfo(float).eps * np.e / h
