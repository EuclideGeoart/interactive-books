"""Exact theoretical variance by centered squares and the moment identity."""
from fractions import Fraction as F
from math import sqrt


def moments(values, weights):
    if not values or len(values) != len(weights):
        raise ValueError("Require matching nonempty values and weights")
    if any(not isinstance(x, (int, F)) or isinstance(x, bool) for x in (*values, *weights)):
        raise ValueError("Use integer or Fraction values and weights")
    total = sum(weights, F(0))
    if any(w < 0 for w in weights) or total <= 0:
        raise ValueError("Weights must be nonnegative with positive total")
    mean = sum((x*w for x, w in zip(values, weights)), F(0)) / total
    second = sum((x*x*w for x, w in zip(values, weights)), F(0)) / total
    variance = sum((w*(x-mean)**2 for x, w in zip(values, weights)), F(0)) / total
    assert variance == second - mean**2 >= 0
    return mean, second, variance


def main():
    x, w = [-2, 0, 4], [1, 2, 1]
    mean, second, variance = moments(x, w)
    assert (mean, second, variance) == (F(1, 2), F(5), F(19, 4))
    assert abs(sqrt(float(variance)) - 2.179449471770337) < 1e-14
    shifted = moments([v+2 for v in x], w)
    assert shifted[0] == F(5, 2) and shifted[2] == variance
    reflected = moments([-2*v for v in x], w)
    assert reflected[0] == -1 and reflected[2] == 19
    assert moments([2, 2, 2], w) == (F(2), F(4), F(0))
    for scale in (-2, 0, 1, 3):
        for shift in (-5, 0, 2):
            transformed = moments([scale*v + shift for v in x], w)
            assert transformed[0] == scale*mean + shift
            assert transformed[2] == scale**2 * variance
    assert moments([10**12 + v for v in x], w)[2] == variance
    assert moments([99, 2], [0, 1])[2] == 0
    for values, weights in (([], []), ([0], [0]), ([0, 1], [1, -1]), ([0, 1], [1]), ([float('nan')], [1])):
        try:
            moments(values, weights)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid exact weighted model accepted")
    print("E[X] =", mean, "E[X²] =", second, "Var(X) =", variance)
    print("σ = √19/2 ≈", sqrt(float(variance)))
    print("Shift +2: same variance; scale -2: variance 19; collapsed X=2: variance 0")


if __name__ == "__main__":
    main()
