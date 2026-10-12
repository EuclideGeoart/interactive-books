"""Vectorized binary64 Adam paths, checked against explicit weighted gradient histories."""
import numpy as np


def trajectories(starts, iterations=8, eta=0.25, beta1=0.9, beta2=0.999, epsilon=1e-8):
    starts = np.asarray(starts, dtype=np.float64)
    if starts.ndim != 2 or starts.shape[1] != 2 or not np.all(np.isfinite(starts)):
        raise ValueError("Require finite starts of shape (n,2)")
    if not np.all(np.isfinite([eta, beta1, beta2, epsilon])) or eta <= 0 or epsilon <= 0 or not 0 <= beta1 < 1 or not 0 <= beta2 < 1:
        raise ValueError("Require finite parameters, eta,epsilon>0, and betas in [0,1)")
    if type(iterations) is not int or not 1 <= iterations <= 1000:
        raise ValueError("Require an integer iteration count in [1,1000]")
    path = np.empty((iterations+1, len(starts), 2), dtype=np.float64)
    gradients = np.empty((iterations, len(starts), 2), dtype=np.float64)
    moments, seconds, updates = np.empty_like(gradients), np.empty_like(gradients), np.empty_like(gradients)
    m, v = np.zeros_like(starts), np.zeros_like(starts)
    path[0] = starts
    for k in range(iterations):
        t = k+1
        gradients[k] = path[k]*np.array([1.0, 4.0])
        m = beta1*m+(1-beta1)*gradients[k]
        v = beta2*v+(1-beta2)*gradients[k]**2
        moments[k], seconds[k] = m, v
        m_hat, v_hat = m/(1-beta1**t), v/(1-beta2**t)
        updates[k] = -eta*m_hat/(np.sqrt(v_hat)+epsilon)
        path[k+1] = path[k]+updates[k]
        if not np.all(np.isfinite(path[k+1])) or not np.all(np.isfinite(m)) or not np.all(np.isfinite(v)):
            raise OverflowError(f"Non-finite binary64 Adam state at t={t}")
    return path, gradients, moments, seconds, updates


def weighted_moments(gradients, beta):
    count = len(gradients)
    lag = np.arange(count)[:, None]-np.arange(count)[None, :]
    weights = np.where(lag >= 0, (1-beta)*beta**np.maximum(lag, 0), 0.0)
    return np.einsum("ti,inj->tnj", weights, gradients)


def main():
    path, gradients, moments, seconds, updates = trajectories([[2, 1], [-2, -1], [0, 0]])
    np.testing.assert_allclose(moments, weighted_moments(gradients, 0.9), rtol=0, atol=1e-14)
    np.testing.assert_allclose(seconds, weighted_moments(gradients**2, 0.999), rtol=0, atol=1e-14)
    np.testing.assert_allclose(moments[0, 0], [0.2, 0.4], rtol=0, atol=1e-14)
    np.testing.assert_allclose(seconds[0, 0], [0.004, 0.016], rtol=0, atol=1e-14)
    expected_first = -0.25*np.array([2.0, 4.0])/(np.array([2.0, 4.0])+1e-8)
    np.testing.assert_allclose(updates[0, 0], expected_first, rtol=0, atol=1e-14)
    np.testing.assert_allclose(path[1, 0], [1.75000000125, 0.750000000625], rtol=0, atol=1e-14)
    assert np.all(path[:, 2] == 0) and np.all(updates[:, 2] == 0)
    probes = np.array([[[2.0, 4.0]], [[0.0, 0.0]], [[-2.0, -4.0]]])
    probe_m, probe_v = weighted_moments(probes, 0.9), weighted_moments(probes**2, 0.999)
    t = np.arange(1, 4)[:, None, None]
    probe_updates = -0.25*(probe_m/(1-0.9**t))/(np.sqrt(probe_v/(1-0.999**t))+1e-8)
    assert np.all(probe_updates[1] < 0) and np.all(probe_updates[2] > 0)
    np.testing.assert_allclose(probe_m[1, 0], [0.18, 0.36], rtol=0, atol=1e-14)
    reversal = weighted_moments(np.array([[[2.0, 4.0]], [[-2.0, -4.0]]]), 0.9)
    np.testing.assert_allclose(reversal[1, 0]/(1-0.9**2), [-2/19, -4/19], rtol=0, atol=1e-14)
    large_epsilon = trajectories([[2, 1]], iterations=1, epsilon=1)[4]
    np.testing.assert_allclose(large_epsilon[0, 0], [-1/6, -1/5], rtol=0, atol=1e-14)
    for kwargs in ({"epsilon": 0}, {"beta1": 1}, {"beta2": np.nan}, {"eta": 0}):
        try:
            trajectories([[2, 1]], **kwargs)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid Adam configuration accepted")
    print("Binary64 Adam path for the first start ≈", path[:, 0])
    print("Binary64 first moments ≈", moments[:, 0])
    print("Weighted-history cross-check: absolute tolerance 1e-14 on this bounded run.")
    print("The raw second moment is not a Hessian or a centered variance.")


if __name__ == "__main__":
    main()
