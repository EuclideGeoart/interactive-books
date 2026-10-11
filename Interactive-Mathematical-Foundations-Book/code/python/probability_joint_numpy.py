"""NumPy joint-table operations; float equality is an approximate cross-check."""
import numpy as np


def joint(weights):
    w = np.asarray(weights, dtype=float)
    if w.shape != (3,3) or not np.all(np.isfinite(w)) or np.any(w < 0) or not np.isfinite(w.sum()) or w.sum() <= 0:
        raise ValueError("Require a finite nonnegative 3x3 table of positive total")
    p = w/w.sum()
    rows, columns = p.sum(axis=1), p.sum(axis=0)
    row_given = [None if mass == 0 else p[i]/mass for i, mass in enumerate(rows)]
    col_given = [None if mass == 0 else p[:,j]/mass for j, mass in enumerate(columns)]
    factors = np.outer(rows, columns)
    independent = bool(np.allclose(p, factors, rtol=0, atol=1e-14))
    return p, rows, columns, row_given, col_given, independent


def main():
    w = np.array([[1,1,0],[1,2,1],[0,1,1]])
    p, rows, cols, rg, cg, independent = joint(w)
    np.testing.assert_allclose(rows, [.25,.5,.25], rtol=0, atol=1e-14)
    np.testing.assert_allclose(cols, [.25,.5,.25], rtol=0, atol=1e-14)
    np.testing.assert_allclose(rg[0], [.5,.5,0], rtol=0, atol=1e-14)
    np.testing.assert_allclose(cg[1], [.25,.5,.25], rtol=0, atol=1e-14)
    assert p[0,0] == .125 and not independent
    assert joint(np.outer([1,2,1],[1,2,1]))[-1]
    zero = joint([[0,0,0],[1,0,0],[0,0,0]])
    assert zero[3][0] is None and zero[4][1] is None and zero[-1]
    for bad in (np.zeros((3,3)), -w, [[1]], np.full((3,3), np.nan)):
        try:
            joint(bad)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid table accepted")
    print("Joint mass ≈", p, "row/column marginals ≈", rows, cols)
    print("Conditional row ≈", rg[0], "independent within atol=1e-14:", independent)
    print("Use exact fractions for a mathematical proof of factorization.")


if __name__ == "__main__":
    main()
