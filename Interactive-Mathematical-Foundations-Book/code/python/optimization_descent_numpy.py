"""Binary64 simultaneous descent paths, cross-checked by the diagonal recurrence."""
import numpy as np


def trajectories(starts, eta, iterations, a=1.0, c=0.0):
    starts = np.asarray(starts, dtype=np.float64)
    if starts.ndim != 2 or starts.shape[1] != 2 or not np.all(np.isfinite(starts)):
        raise ValueError("Require finite starts of shape (n,2)")
    if not np.isfinite(eta) or eta <= 0 or not np.isfinite(a) or not np.isfinite(c):
        raise ValueError("Require finite parameters and a positive learning rate")
    if type(iterations) is not int or not 0 <= iterations <= 1000:
        raise ValueError("Require an integer iteration count in [0,1000]")
    path = np.empty((iterations+1, len(starts), 2), dtype=np.float64)
    path[0] = starts
    center, hessian = np.array([c, 0.0]), np.diag([a, 4.0])
    for k in range(iterations):
        gradient = (path[k]-center) @ hessian
        path[k+1] = path[k] - eta*gradient
        if not np.all(np.isfinite(path[k+1])):
            raise OverflowError(f"Non-finite binary64 iterate at step {k+1}")
    shifted = path-center
    losses = np.einsum("kni,ij,knj->kn", shifted, hessian, shifted)/2
    if not np.all(np.isfinite(losses)):
        raise OverflowError("Non-finite binary64 loss")
    return path, losses


def main():
    starts = np.array([[2, 1], [-2, -1], [1, 0]], dtype=np.float64)
    path, losses = trajectories(starts, 0.25, 8)
    powers = np.arange(9)[:, None, None]
    closed_form = starts[None, :, :] * np.array([0.75, 0.0])**powers
    np.testing.assert_allclose(path, closed_form, rtol=0, atol=1e-14)
    np.testing.assert_array_equal(path[1, 0], [1.5, 0])
    np.testing.assert_array_equal(losses[:3, 0], [4, 1.125, 0.6328125])
    assert np.all(np.diff(losses, axis=0) < 0)
    _, overshoot_losses = trajectories([[2, 1]], 0.75, 1)
    assert overshoot_losses[1, 0] == 8.125 > 4
    stationary, _ = trajectories([[0, 0]], 0.25, 2)
    assert np.all(stationary == 0)
    for eta in (0, -1, np.nan, np.inf):
        try:
            trajectories([[2, 1]], eta, 1)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid learning rate accepted")
    print("Binary64 trajectory approximations for the first start:", path[:, 0])
    print("Binary64 loss approximations:", losses[:, 0])
    print("Closed-form cross-check: absolute tolerance 1e-14 on this bounded run.")


if __name__ == "__main__":
    main()
