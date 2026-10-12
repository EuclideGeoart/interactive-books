"""Vectorized binary64 landscape samples; a finite grid is not an optimum proof."""
import numpy as np


def quadratic(points, a=1.0, c=0.0):
    points = np.asarray(points, dtype=np.float64)
    if points.ndim != 2 or points.shape[1] != 2 or not np.all(np.isfinite(points)):
        raise ValueError("Require finite points of shape (n,2)")
    if not np.isfinite(a) or not np.isfinite(c):
        raise ValueError("Require finite a and c")
    shifted = points - np.array([c, 0.0])
    hessian = np.diag([a, 4.0])
    loss = np.einsum("ni,ij,nj->n", shifted, hessian, shifted) / 2
    gradient = shifted @ hessian
    if not np.all(np.isfinite(loss)) or not np.all(np.isfinite(gradient)):
        raise OverflowError("The binary64 result is non-finite")
    return loss, gradient, hessian


def barrier(points):
    points = np.asarray(points, dtype=np.float64)
    if points.ndim != 2 or points.shape[1] != 2 or not np.all(np.isfinite(points)) or np.any(points[:, 0] <= 0):
        raise ValueError("Require finite (n,2) points with x > 0")
    x, y = points.T
    loss = -np.log(x) + y*y
    gradient = np.column_stack((-1/x, 2*y))
    if not np.all(np.isfinite(loss)) or not np.all(np.isfinite(gradient)):
        raise OverflowError("The binary64 result is non-finite")
    return loss, gradient


def main():
    points = np.array([[2, 1], [2, 0], [0, 1], [0, 0]], dtype=np.float64)
    loss, gradient, hessian = quadratic(points)
    np.testing.assert_array_equal(loss, [4, 2, 2, 0])
    np.testing.assert_array_equal(gradient, [[2, 4], [2, 0], [0, 4], [0, 0]])
    np.testing.assert_array_equal(np.linalg.eigvalsh(hessian), [1, 4])
    np.testing.assert_array_equal(quadratic([[2, 1]], a=2, c=1)[0], [3])
    coordinates = np.linspace(-2, 2, 17)
    x, y = np.meshgrid(coordinates, coordinates, indexing="xy")
    wells = (x*x - 1)**2 + y*y
    assert wells.min() == 0 and np.count_nonzero(wells == 0) == 2
    np.testing.assert_array_equal(barrier([[1, 0]])[1], [[-1, 0]])
    for invalid in ([[0, 0]], [[-1, 0]], [[np.nan, 0]]):
        try:
            barrier(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid logarithmic domain accepted")
    print("Quadratic sample losses ≈", loss, "gradients ≈", gradient)
    print("Binary64 grid minimum ≈", wells.min(), "(finite samples only)")


if __name__ == "__main__":
    main()
