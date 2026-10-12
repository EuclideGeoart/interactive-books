"""Normalize a weight vector, then compute expectations as dot products."""
import numpy as np


def moments(values, weights):
    x, w = np.asarray(values, dtype=float), np.asarray(weights, dtype=float)
    if x.ndim != 1 or x.size == 0 or w.shape != x.shape or not np.all(np.isfinite(x)):
        raise ValueError("Require finite nonempty values and matching weights")
    if not np.all(np.isfinite(w)) or np.any(w < 0) or not np.isfinite(w.sum()) or w.sum() <= 0:
        raise ValueError("Require nonnegative finite weights with positive finite total")
    p = w / w.sum()
    return float(np.dot(p, x)), float(np.dot(p, x*x))


def main():
    x, w = np.array([-2., 0., 4.]), np.array([1., 2., 1.])
    mean, second = moments(x, w)
    np.testing.assert_array_equal([mean, second], [0.5, 5])
    y = 2*x + 1
    assert moments(y, w)[0] == 2
    assert moments(x + y, w)[0] == 2.5
    assert moments(x*y, w)[0] == 10.5 != mean * moments(y, w)[0]
    assert moments(-2*x + 5, w)[0] == 4
    assert moments(x + 2, w)[0] == 2.5
    assert moments(np.full(3, 2.), w) == (2., 4.)
    assert moments(x, 10*w) == (mean, second)
    assert moments([99, 2], [0, 1]) == (2., 4.)
    for values, weights in (([], []), ([0], [0]), ([0, 1], [1, -1]), ([np.nan], [1]), ([0], [np.inf])):
        try:
            moments(values, weights)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid weighted model accepted")
    print("Normalized weights:", w/w.sum(), "E[X] ≈", mean, "E[X²] ≈", second)
    print("Same-outcome Y = 2X+1:", y, "E[X+Y] ≈", moments(x+y, w)[0])


if __name__ == "__main__":
    main()
