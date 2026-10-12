"""Vectorized binary64 GD paths for many rates, checked by a closed-form power grid."""
import numpy as np


def trajectories(start, rates, iterations=12, a=1.0, c=0.0):
    start, rates = np.asarray(start, dtype=np.float64), np.asarray(rates, dtype=np.float64)
    if start.shape != (2,) or rates.ndim != 1 or not rates.size:
        raise ValueError("Require one two-component start and a nonempty rate vector")
    if not np.all(np.isfinite(start)) or not np.all(np.isfinite(rates)) or np.any(rates <= 0):
        raise ValueError("Require finite start and positive finite rates")
    if not np.isfinite(a) or a <= 0 or not np.isfinite(c):
        raise ValueError("Require positive finite a and finite c")
    if type(iterations) is not int or not 0 <= iterations <= 1000:
        raise ValueError("Require an integer iteration count in [0,1000]")
    center, hessian = np.array([c, 0.0]), np.diag([a, 4.0])
    path = np.empty((iterations+1, rates.size, 2), dtype=np.float64)
    path[0] = start
    for k in range(iterations):
        path[k+1] = path[k] - rates[:, None]*((path[k]-center) @ hessian)
        if not np.all(np.isfinite(path[k+1])):
            raise OverflowError(f"Non-finite binary64 iterate at step {k+1}")
    shifted = path-center
    losses = np.einsum("kni,ij,knj->kn", shifted, hessian, shifted)/2
    if not np.all(np.isfinite(losses)):
        raise OverflowError("Non-finite binary64 loss")
    return path, losses


def main():
    rates = np.array([0.03, 0.25, 0.4, 0.5, 0.75])
    path, losses = trajectories([2, 1], rates)
    factors = 1-rates[:, None]*np.array([1.0, 4.0])
    powers = np.arange(13)[:, None, None]
    direct = np.array([2.0, 1.0])*factors[None, :, :]**powers
    np.testing.assert_allclose(path, direct, rtol=2e-14, atol=1e-14)
    np.testing.assert_array_equal(path[1, 1], [1.5, 0])
    np.testing.assert_array_equal(path[:3, 3, 1], [1, -1, 1])
    assert np.all(np.diff(losses[:, :3], axis=0) < 0)
    assert path[-1, 4, 1] == 4096
    exception, _ = trajectories([2, 0], [0.75], 8)
    np.testing.assert_array_equal(exception[:, 0, 1], np.zeros(9))
    assert exception[-1, 0, 0] == 2*(0.25**8)
    np.testing.assert_array_equal(np.linalg.eigvalsh(np.diag([1.0, 4.0])), [1, 4])
    for invalid in ([0], [-1], [np.nan]):
        try:
            trajectories([2, 1], invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid rate accepted")
    print("Binary64 final losses by rate ≈", losses[-1])
    print("The eta=0.5 y mode alternates without decay; eta=0.75 grows unless y starts at zero.")
    print("Closed-form cross-check: rtol=2e-14, atol=1e-14 on this bounded grid.")


if __name__ == "__main__":
    main()
