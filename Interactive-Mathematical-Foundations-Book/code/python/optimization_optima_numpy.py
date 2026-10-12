"""Vectorized stationary candidates and NumPy Hessian eigenvalue cross-checks."""
import numpy as np


def main():
    candidates = np.array([[-1, 0], [1, 0]], dtype=np.float64)
    x, y = candidates.T
    cubic_gradients = np.column_stack((3*x*x - 3, 2*y))
    cubic_hessians = np.zeros((2, 2, 2), dtype=np.float64)
    cubic_hessians[:, 0, 0], cubic_hessians[:, 1, 1] = 6*x, 2
    np.testing.assert_array_equal(cubic_gradients, np.zeros((2, 2)))
    eigenvalues = np.linalg.eigvalsh(cubic_hessians)
    np.testing.assert_array_equal(eigenvalues, [[-6, 2], [2, 6]])
    np.testing.assert_array_equal(x**3 - 3*x + y*y, [2, -2])
    witnesses = -np.array([2, 3, 4], dtype=np.float64)
    np.testing.assert_array_equal(witnesses**3 - 3*witnesses, [-2, -18, -52])
    well_x = np.array([-1, 0, 1], dtype=np.float64)
    well_gradients = 4*well_x*(well_x*well_x - 1)
    well_hessians = np.zeros((3, 2, 2), dtype=np.float64)
    well_hessians[:, 0, 0], well_hessians[:, 1, 1] = 12*well_x*well_x - 4, 2
    np.testing.assert_array_equal(well_gradients, [0, 0, 0])
    np.testing.assert_array_equal(np.linalg.eigvalsh(well_hessians), [[2, 8], [-4, 2], [2, 8]])
    degenerate_hessians = np.array([[[0, 0], [0, 0]], [[0, 0], [0, 2]]], dtype=np.float64)
    np.testing.assert_array_equal(np.linalg.eigvalsh(degenerate_hessians), [[0, 0], [0, 2]])
    h = np.array([-0.1, 0.1], dtype=np.float64)
    assert np.all(h**4 > 0) and h[0]**3 < 0 < h[1]**3
    print("Binary64 Hessian eigenvalues at cubic candidates ≈", eigenvalues)
    print("Zero eigenvalues are inconclusive: compare x^4+y^4 with x^3+y^2.")
    print("Finite witnesses disprove globality; the polynomial tail proves unboundedness.")


if __name__ == "__main__":
    main()
