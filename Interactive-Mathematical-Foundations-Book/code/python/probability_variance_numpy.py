"""A centered weighted variance; raw weights describe a model, not a sample."""
import numpy as np


def moments(values, weights):
    x, w = np.asarray(values, dtype=float), np.asarray(weights, dtype=float)
    if x.ndim != 1 or x.size == 0 or w.shape != x.shape or not np.all(np.isfinite(x)):
        raise ValueError("Require finite nonempty values and matching weights")
    if not np.all(np.isfinite(w)) or np.any(w < 0) or not np.isfinite(w.sum()) or w.sum() <= 0:
        raise ValueError("Require nonnegative finite weights with positive finite total")
    p = w / w.sum()
    mean = np.dot(p, x)
    second = np.dot(p, x*x)
    centered = x - mean
    variance = np.dot(p, centered*centered)
    return float(mean), float(second), float(variance), float(np.sqrt(variance))


def main():
    x, w = np.array([-2., 0., 4.]), np.array([1., 2., 1.])
    mean, second, variance, sigma = moments(x, w)
    np.testing.assert_allclose([mean, second, variance, sigma], [0.5, 5, 4.75, 2.179449471770337], rtol=0, atol=1e-12)
    assert moments(x+2, w)[0] == 2.5 and moments(x+2, w)[2] == 4.75
    assert moments(-2*x, w)[2] == 19
    assert moments(np.full(3, 2.), w) == (2., 4., 0., 0.)
    for scale in (-2, 0, 1, 3):
        for shift in (-5, 0, 2):
            transformed = moments(scale*x + shift, w)
            np.testing.assert_allclose([transformed[0], transformed[2], transformed[3]], [scale*mean + shift, scale**2*variance, abs(scale)*sigma], rtol=0, atol=1e-12)
    assert moments(10**12 + x, w)[2] == 4.75
    assert moments([99, 2], [0, 1])[2] == 0
    for values, weights in (([], []), ([0], [0]), ([0, 1], [1, -1]), ([np.nan], [1]), ([0], [np.inf])):
        try:
            moments(values, weights)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid weighted model accepted")
    print("Weighted theoretical moments ≈", (mean, second, variance, sigma))
    print("For an observed sample only, np.var(sample, ddof=1) uses m-1 for m>1.")
    print("Centered squares avoid subtracting two large, nearly equal moments.")


if __name__ == "__main__":
    main()
