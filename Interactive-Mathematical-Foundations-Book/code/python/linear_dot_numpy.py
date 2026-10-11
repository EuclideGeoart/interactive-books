import numpy as np

u = np.array([3.0, 0.0])
v = np.array([2.0, 2.0])
product = u @ v
# Rescale each vector before normalizing, avoiding squared-norm overflow.
if not np.isfinite(u).all() or not np.isfinite(v).all():
    raise ValueError('Finite components required')
mu, mv = np.max(np.abs(u)), np.max(np.abs(v))
if mu == 0 or mv == 0:
    raise ValueError('Angle undefined at zero')
un, vn = u / mu, v / mv
un, vn = un / np.hypot(*un), vn / np.hypot(*vn)
cosine = float(un @ vn)
if not np.isfinite(cosine) or abs(cosine) > 1 + 8 * np.finfo(float).eps:
    raise ArithmeticError('Invalid cosine; do not conceal it with clipping')
angle = np.arccos(np.clip(cosine, -1, 1))
assert product == 6
assert np.isclose(angle, np.pi / 4)
