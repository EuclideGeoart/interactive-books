"""Reverse-mode gradient of a scalar loss over many parameters versus central differences (III.10)."""
import numpy as np

rng = np.random.default_rng(1012)
A = rng.normal(size=(20, 50))
b = rng.normal(size=20)
w = rng.normal(size=50)

def loss(w):
    r = A @ w - b          # forward: r, then L = 0.5 * r.r
    return 0.5 * r @ r

r = A @ w - b
grad = A.T @ r             # backward: r_bar = r, w_bar = A^T r_bar  (one pass for all 50 parameters)

h = 1e-6
fd = np.array([(loss(w + h * e) - loss(w - h * e)) / (2 * h) for e in np.eye(50)])   # 100 evaluations
assert np.max(np.abs(grad - fd)) < 1e-5 * max(1.0, np.max(np.abs(grad)))
