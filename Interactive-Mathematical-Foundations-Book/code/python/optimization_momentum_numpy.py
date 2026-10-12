"""Binary64 batch momentum, cross-checked with powers of a four-state transition matrix."""
import numpy as np


def trajectories(starts, iterations=8, eta=0.25, beta=0.8, a=1.0, c=0.0):
    starts = np.asarray(starts, dtype=np.float64)
    if starts.ndim != 2 or starts.shape[1] != 2 or not np.all(np.isfinite(starts)):
        raise ValueError("Require finite starts of shape (n,2)")
    if not np.all(np.isfinite([eta, beta, a, c])) or eta <= 0 or a <= 0 or not 0 <= beta < 1:
        raise ValueError("Require finite parameters, eta>0, a>0, 0<=beta<1")
    if type(iterations) is not int or not 0 <= iterations <= 1000:
        raise ValueError("Require an integer iteration count in [0,1000]")
    center, hessian = np.array([c, 0.0]), np.diag([a, 4.0])
    path = np.empty((iterations+1, len(starts), 2), dtype=np.float64)
    velocity = np.zeros_like(path)
    path[0] = starts
    for k in range(iterations):
        gradient = (path[k]-center) @ hessian
        velocity[k+1] = beta*velocity[k]+gradient
        path[k+1] = path[k]-eta*velocity[k+1]
        if not np.all(np.isfinite(path[k+1])) or not np.all(np.isfinite(velocity[k+1])):
            raise OverflowError(f"Non-finite binary64 state at step {k+1}")
    losses = np.einsum("kni,ij,knj->kn", path-center, hessian, path-center)/2
    if not np.all(np.isfinite(losses)):
        raise OverflowError("Non-finite binary64 loss")
    return path, velocity, losses


def main():
    starts = np.array([[2, 1], [-2, -1], [0, 0]], dtype=np.float64)
    path, velocity, losses = trajectories(starts)
    h, identity = np.diag([1.0, 4.0]), np.eye(2)
    transition = np.block([[identity-0.25*h, -0.25*0.8*identity], [h, 0.8*identity]])
    initial = np.column_stack((starts, np.zeros_like(starts)))
    for k in range(9):
        direct = initial @ np.linalg.matrix_power(transition, k).T
        np.testing.assert_allclose(path[k], direct[:, :2], rtol=0, atol=1e-12)
        np.testing.assert_allclose(velocity[k], direct[:, 2:], rtol=0, atol=1e-12)
    np.testing.assert_allclose(velocity[2, 0], [3.1, 3.2], rtol=0, atol=1e-14)
    np.testing.assert_allclose(path[2, 0], [0.725, -0.8], rtol=0, atol=1e-14)
    np.testing.assert_allclose(losses[:3, 0], [4, 1.125, 1.5428125], rtol=0, atol=1e-14)
    assert losses[2, 0] > losses[1, 0]
    assert np.all(path[:, 2] == 0) and np.all(velocity[:, 2] == 0)
    plain, _, _ = trajectories([[2, 1]], iterations=2, beta=0)
    np.testing.assert_array_equal(plain[:, 0], [[2, 1], [1.5, 0], [1.125, 0]])
    print("Binary64 momentum path for the first start ≈", path[:, 0])
    print("Binary64 velocities ≈", velocity[:, 0])
    print("Matrix-power cross-check: absolute tolerance 1e-12 on this bounded run.")


if __name__ == "__main__":
    main()
