"""Educational elimination: 0-based Python indices, exact Fraction arithmetic."""
from fractions import Fraction

def elimination(a, b):
    rows = [[Fraction(str(x)) for x in row] + [Fraction(str(rhs))] for row, rhs in zip(a, b)]
    n = len(a[0])
    pivot_row = 0
    trace = [tuple(tuple(row) for row in rows)]
    for col in range(n):
        candidate = next((i for i in range(pivot_row, len(rows)) if rows[i][col]), None)
        if candidate is None:
            continue  # Free column; do not divide by a zero pivot.
        rows[pivot_row], rows[candidate] = rows[candidate], rows[pivot_row]
        pivot = rows[pivot_row][col]
        rows[pivot_row] = [x/pivot for x in rows[pivot_row]]
        for i in range(len(rows)):
            if i != pivot_row:
                factor = rows[i][col]
                rows[i] = [x-factor*y for x, y in zip(rows[i], rows[pivot_row])]
        trace.append(tuple(tuple(row) for row in rows))
        pivot_row += 1
        if pivot_row == len(rows):
            break
    return rows, trace

rref, trace = elimination([[0, 1], [2, 1]], [1, 3])
assert rref == [[1, 0, 1], [0, 1, 1]]
assert trace[0] == ((0, 1, 1), (2, 1, 3))
