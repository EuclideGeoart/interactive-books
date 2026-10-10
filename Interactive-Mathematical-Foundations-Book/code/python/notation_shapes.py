import numpy as np

# Conventions: a vector is a column of d numbers; a data matrix X has n EXAMPLES as rows and d FEATURES as columns.
# Mathematics counts from 1 (X_{ij}, i = 1..n, j = 1..d); NumPy counts from 0, so X_{ij} is X[i - 1, j - 1].
X = np.arange(12).reshape(4, 3)  # n = 4 examples, d = 3 features; the entry in row r, column c is 3 * r + c
x = np.array([2.0, -1.0, 0.5])  # a vector in R^3
w = np.array([1.0, 0.0, -1.0])
W = np.arange(6).reshape(3, 2)
a = np.array([1.0, 2.0, 3.0])
b = np.array([4.0, 5.0, 6.0])
X3 = np.arange(24).reshape(2, 3, 4)  # a tensor: B = 2 examples, T = 3 positions, d = 4 features

n = X.shape[0]  # the number of examples (rows)
d = X.shape[1]  # the number of features (columns)
B, T, d3 = X3.shape
shape_vector = x.shape  # (3,): a one-dimensional array, NOT a column (3, 1)
shape_matrix = X.shape  # (4, 3)

i, j = 2, 3  # a mathematical (1-based) example number and feature number
entry = X[i - 1, j - 1]  # X_{2,3} is X[1, 2] = 3 * 1 + 2 = 5
row = X[i - 1, :]  # the whole example i, a vector with d = 3 entries
column = X[:, j - 1]  # the whole feature j, a vector with n = 4 entries
flat_position = int(np.ravel_multi_index((i - 1, j - 1), X.shape))  # row-major: (i - 1) * d + (j - 1) = 5
same_entry = X.ravel()[flat_position] == entry  # True: the flattened array lists row 1 first, then row 2, ...

Xt = X.T  # the transpose swaps the axes: shape (3, 4)
Xw = X @ w  # (4 x 3)(3) -> (4,): one number per example
XW = X @ W  # (4 x 3)(3 x 2) -> (4, 2)
G = X.T @ X  # (3 x 4)(4 x 3) -> (3, 3): one row and one column per feature
dot = a @ b  # the dot product: 1*4 + 2*5 + 3*6 = 32.0, a scalar
hadamard = a * b  # the elementwise product, written with a circled dot in the notation
indicator = (x > 0).astype(int)  # the indicator 1[x_j > 0], entry by entry

try:
    X @ np.ones(4)  # X has d = 3 columns but this vector has 4 entries: the inner dimensions differ
    mismatch = 'no error'
except ValueError:
    mismatch = 'ValueError'

element_of_tensor = X3[1, 2, 3]  # the last element: 1 * 12 + 2 * 4 + 3 = 23
tensor_slice_shape = X3[1].shape  # one example of the batch: (3, 4), T positions with d features each

indices = []
for i in range(1, n + 1):  # the mathematical index range 1, ..., n; the matching row is X[i - 1]
    indices.append(int(X[i - 1, 0]))

print(shape_vector, shape_matrix, int(entry), row.tolist(), column.tolist(), flat_position, bool(same_entry))
print(Xt.shape, Xw.tolist(), XW.shape, G.shape, float(dot), hadamard.tolist(), indicator.tolist(), mismatch)
print(n, d, B, T, d3, int(element_of_tensor), tensor_slice_shape, indices)
