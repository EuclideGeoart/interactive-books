from itertools import product

# A double sum is a loop inside a loop. Rows i = 1..n, columns j = 1..k, entries a[i][j] (here written with 1-based indices).
n, k = 3, 4


def entry(i, j):
    return i * j


# Rectangular: the inner bound does not depend on i. Every cell of the grid is visited exactly once.
rows_first = 0
for i in range(1, n + 1):
    for j in range(1, k + 1):
        rows_first += entry(i, j)

columns_first = 0
for j in range(1, k + 1):
    for i in range(1, n + 1):
        columns_first += entry(i, j)

same_total = rows_first == columns_first == 60  # (1+2+3)(1+2+3+4): the sum factors because entry(i, j) = i * j
cells = len(list(product(range(1, n + 1), range(1, k + 1))))  # n * k = 12 cells

# Triangular: the inner bound is the OUTER index, so the cells with j <= i form a triangle with n(n+1)/2 cells.
m = 4
by_rows = 0
for i in range(1, m + 1):
    for j in range(1, i + 1):
        by_rows += entry(i, j)

# Swapping the order must swap the bounds too: j runs 1..m and then i must run from j up to m (the cells with i >= j).
by_columns = 0
for j in range(1, m + 1):
    for i in range(j, m + 1):
        by_columns += entry(i, j)

triangle_cells = sum(1 for i in range(1, m + 1) for j in range(1, i + 1))  # 1 + 2 + 3 + 4 = 10
triangle_ok = by_rows == by_columns == 65 and triangle_cells == m * (m + 1) // 2

# The classic slip: keeping the bounds 1..i for j and 1..m for i after swapping the loops visits a DIFFERENT set of cells.
wrong = 0
for j in range(1, m + 1):
    for i in range(1, j + 1):  # now i <= j: the other triangle (the upper one)
        wrong += entry(i, j)
wrong_same_here = wrong == by_rows  # True ONLY because entry(i, j) = i * j is symmetric; not for a general table

table = [[2, -1, 0], [1, 4, -2], [0, 5, 1]]
lower = sum(table[i][j] for i in range(3) for j in range(i + 1))  # cells with j <= i: 2 + 1 + 4 + 0 + 5 + 1 = 13
upper_wrong = sum(table[i][j] for j in range(3) for i in range(j + 1))  # cells with i <= j instead: 2 + (-1) + 4 + 0 + (-2) + 1 = 4
wrong_differs = lower != upper_wrong

print(rows_first, columns_first, same_total, cells, by_rows, by_columns, triangle_ok, wrong_same_here, lower, upper_wrong, wrong_differs)
