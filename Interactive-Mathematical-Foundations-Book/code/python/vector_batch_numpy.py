import numpy as np

# In data science code a collection of vectors is usually stored one per ROW. (This book writes a single
# vector as a column; the numbers are the same, only the layout differs.)
V = np.array([[3.0, 2.0], [-3.0, 2.0], [-3.0, -2.0], [3.0, -2.0]])

lengths = np.linalg.norm(V, axis=1)  # one norm per row
angles = np.arctan2(V[:, 1], V[:, 0])  # one quadrant-aware angle per row: y first, then x

print(lengths)  # four equal lengths, each sqrt(13)
print(angles)  # one angle per quadrant: I, II, III, IV
