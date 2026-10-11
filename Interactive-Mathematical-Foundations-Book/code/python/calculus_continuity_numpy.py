"""Scan many configurations at once: the jump |1 + c - m| vanishes only where the pieces join (III.2)."""
import numpy as np

c = np.linspace(-2, 2, 17)                  # steps of 0.25: exactly representable
m = 2.0
jump = np.abs(1 + c - m)
assert np.count_nonzero(jump == 0) == 1 and c[jump == 0][0] == 1.0

# Endpoint: sqrt is continuous from the right at 0; there is no left side in the real domain.
h = np.logspace(-1, -12, 12)
assert np.all(np.diff(np.sqrt(h)) < 0) and np.sqrt(h[-1]) < 1e-5
with np.errstate(invalid="ignore"):
    assert np.isnan(np.sqrt(-h)).all()
