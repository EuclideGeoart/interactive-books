import numpy as np

# Rows of a dataset are indexed 0..9. A split into train / validation / test is three SETS of indices that must be disjoint.
rows = np.arange(10)
rng = np.random.default_rng(0)
order = rng.permutation(rows)  # a shuffle of the indices
train, val, test = order[:6], order[6:8], order[8:]

disjoint = (
    np.intersect1d(train, val).size == 0
    and np.intersect1d(train, test).size == 0
    and np.intersect1d(val, test).size == 0
)  # True: no row appears in two splits (an overlap is "leakage")
covers = np.array_equal(np.union1d(np.union1d(train, val), test), rows)  # True: together they are the whole universe

# Membership as a Boolean mask: np.isin(x, S) is the indicator 1[x in S], one entry per row.
mask_train = np.isin(rows, train)  # array of True/False
indicator = mask_train.astype(int)  # 0/1 values: 1 where the row is in the training set
count_matches = int(indicator.sum()) == train.size  # True: summing the indicator counts the members

# Complement relative to the universe is the mask negation.
not_train = ~mask_train
complement_ok = np.array_equal(rows[not_train], np.union1d(val, test))  # True

# Clipping to a CLOSED interval [lo, hi]: values outside are moved onto the nearest endpoint, so the result is always in [lo, hi].
x = np.array([-3.0, 0.0, 0.5, 1.0, 4.0])
clipped = np.clip(x, 0.0, 1.0)  # [0.  0.  0.5 1.  1. ]
inside = bool(np.all((clipped >= 0.0) & (clipped <= 1.0)))  # True

# Cartesian product of two small feature value sets: every combination, as a grid of pairs.
first, second = np.meshgrid([0, 1, 2], [10, 20], indexing="ij")
grid = np.stack([first.ravel(), second.ravel()], axis=1)  # 3 * 2 = 6 rows (a, b), a from the first set, b from the second
grid_size_ok = grid.shape == (3 * 2, 2)  # True

print(disjoint, covers, count_matches, complement_ok, clipped, inside, grid_size_ok)
