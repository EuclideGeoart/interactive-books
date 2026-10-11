import numpy as np


def normalize(v):
    v = np.asarray(v, dtype=float)
    if v.shape != (2,) or not np.isfinite(v).all():
        raise ValueError('Expected a finite two-component vector')
    m = np.max(np.abs(v))
    if m == 0:
        raise ValueError('Zero has no unit direction')
    scaled = v / m
    return scaled / np.hypot(*scaled)


v = np.array([-3.0, 4.0])
l2 = np.hypot(*v)  # avoids squaring overflow; a truly huge norm can still overflow
l1 = np.sum(np.abs(v))
linf = np.max(np.abs(v))
assert (l2, l1, linf) == (5, 7, 4)
assert np.allclose(normalize(v), [-0.6, 0.8])
