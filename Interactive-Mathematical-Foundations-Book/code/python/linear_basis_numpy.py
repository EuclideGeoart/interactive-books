import numpy as np

u = np.array([2.0, 1.0])
v = np.array([1.0, 2.0])
p = np.array([3.0, 0.0])
columns = np.column_stack((u, v))
# solve raises LinAlgError for a singular matrix; never invent coordinates.
coordinates = np.linalg.solve(columns, p)
reconstructed = coordinates[0] * u + coordinates[1] * v
assert np.allclose(coordinates, [2, -1])
assert np.allclose(reconstructed, p)
# For nearly dependent columns, check sensitivity as well as the residual.
condition = np.linalg.cond(columns)
