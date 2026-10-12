"""Exact joint, marginal, conditional masses from a 3x3 raw-weight table."""
from fractions import Fraction as F


def joint(weights):
    if len(weights) != 9 or any(type(w) is not int or not 0 <= w <= 1_000_000 for w in weights):
        raise ValueError("Require nine nonnegative integer weights, each at most 1000000")
    total = sum(weights)
    if total == 0:
        raise ValueError("The complete table needs positive weight")
    p = [[F(weights[3*i+j], total) for j in range(3)] for i in range(3)]
    rows = [sum(row, F(0)) for row in p]
    columns = [sum((p[i][j] for i in range(3)), F(0)) for j in range(3)]
    row_conditionals = [None if rows[i] == 0 else [v/rows[i] for v in p[i]] for i in range(3)]
    column_conditionals = [None if columns[j] == 0 else [p[i][j]/columns[j] for i in range(3)] for j in range(3)]
    independent = all(p[i][j] == rows[i]*columns[j] for i in range(3) for j in range(3))
    assert sum(rows) == sum(columns) == 1
    for conditional in (*row_conditionals, *column_conditionals):
        assert conditional is None or sum(conditional) == 1
    return p, rows, columns, row_conditionals, column_conditionals, independent


def main():
    p, rows, columns, row_given, col_given, independent = joint([1,1,0,1,2,1,0,1,1])
    assert p[0][0] == F(1,8) and p[1][1] == F(1,4)
    assert rows == columns == [F(1,4), F(1,2), F(1,4)]
    assert row_given[0] == [F(1,2), F(1,2), F(0)] and not independent
    assert col_given[1] == [F(1,4), F(1,2), F(1,4)]
    assert joint([1,2,1,2,4,2,1,2,1])[-1]
    empty_row = joint([0,0,0,1,0,0,0,0,0])
    assert empty_row[3][0] is None and empty_row[4][1] is None
    assert empty_row[-1]  # A deterministic pair factors, including its zero cells.
    for factor in (1, 2, 10):
        assert joint([factor*w for w in [1,1,0,1,2,1,0,1,1]]) == joint([1,1,0,1,2,1,0,1,1])
    for bad in ([0]*9, [-1]+[1]*8, [1]*8, [True]+[1]*8, [1.5]+[1]*8):
        try:
            joint(bad)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid table accepted")
    print("Joint mass:", p, "marginals:", rows, columns)
    print("V given U=-1:", row_given[0], "independent:", independent)
    print("Zero-mass conditioning is None, never an invented distribution.")


if __name__ == "__main__":
    main()
