"""Expectations from exact raw weights, including dependent linearity."""
from fractions import Fraction as F


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
    return mean, second


def main():
    x, w = [-2, 0, 4], [1, 2, 1]
    mean, second = moments(x, w)
    assert (mean, second) == (F(1, 2), F(5))
    y = [2*v + 1 for v in x]  # Y shares X's outcome: these are dependent.
    assert moments(y, w)[0] == 2
    assert moments([a+b for a, b in zip(x, y)], w)[0] == F(5, 2) == 3*mean + 1
    assert moments([a*b for a, b in zip(x, y)], w)[0] == F(21, 2)
    assert mean * moments(y, w)[0] == 1
    assert moments([-2*v + 5 for v in x], w)[0] == 4
    assert moments([v + 2 for v in x], w)[0] == F(5, 2)
    assert moments([2, 2, 2], w) == (F(2), F(4))
    assert moments(x, [10, 20, 10]) == (mean, second)
    assert moments([99, 2], [0, 1]) == (F(2), F(4))
    for values, weights in (([], []), ([0], [0]), ([0, 1], [1, -1]), ([0, 1], [1]), ([0.5], [1])):
        try:
            moments(values, weights)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid exact weighted model accepted")
    print("E[X] =", mean, "; E[X²] =", second)
    print("Dependent Y = 2X+1: E[X+Y] = 5/2; E[XY] = 21/2, not E[X]E[Y] = 1")


if __name__ == "__main__":
    main()
