import numpy as np

v = np.array([1.0, 3.0])
u = np.array([2.0, 1.0])
if not np.isfinite(u).all() or not np.isfinite(v).all():
    raise ValueError('Finite components required')
m = np.max(np.abs(u))
if m == 0:
    raise ValueError('Projection direction is zero')
un = u / m
un = un / np.hypot(*un)
signed_scalar = v @ un
projected = signed_scalar * un
residual = v - projected
distance = np.hypot(*residual)
assert np.allclose(projected, [2, 1])
assert np.allclose(residual, [-1, 2])
assert np.isclose(residual @ un, 0, atol=1e-15)
# Rescaling u protects its norm, not arbitrary overflow in v @ un.
