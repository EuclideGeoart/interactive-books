"""Grid partial derivatives with numpy.gradient versus the analytic ones (III.7)."""
import numpy as np

x = np.linspace(-2, 2, 81)
y = np.linspace(-2, 2, 81)
X, Y = np.meshgrid(x, y, indexing="ij")
Z = X**2 * Y + 3 * Y
dZdx, dZdy = np.gradient(Z, x, y)
# Central differences are exact for this quadratic in x and linear in y in the interior.
interior = (slice(1, -1), slice(1, -1))
assert np.allclose(dZdx[interior], (2 * X * Y)[interior], atol=1e-12)
assert np.allclose(dZdy[interior], (X**2 + 3)[interior], atol=1e-12)
