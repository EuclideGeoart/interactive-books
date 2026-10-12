"""Push a finite experiment through a random-variable function, exactly."""
from fractions import Fraction as F


def induced_distribution(values, masses):
    if not values or len(values) != len(masses):
        raise ValueError("One value and one mass are required per outcome")
    if any(not isinstance(x, (int, F)) or isinstance(x, bool) for x in values):
        raise ValueError("Values must be integers or exact Fractions")
    if any(not isinstance(p, F) or p < 0 for p in masses) or sum(masses, F(0)) != 1:
        raise ValueError("Nonnegative Fraction masses must sum to 1")
    result = {}
    for value, mass in zip(values, masses):
        result[value] = result.get(value, F(0)) + mass
    return result


def main():
    values = [0, 0, 1, 1, 2, 2]
    masses = [F(1, 6)] * 6
    induced = induced_distribution(values, masses)
    assert induced == {0: F(1, 3), 1: F(1, 3), 2: F(1, 3)}
    assert sum(p for x, p in induced.items() if x >= 1) == F(2, 3)
    assert sum(p for x, p in zip(values, masses) if x >= 1) == F(2, 3)
    assert induced_distribution([0, 0, 1], [F(1, 2), F(1, 4), F(1, 4)]) == {0: F(3, 4), 1: F(1, 4)}
    assert induced_distribution([2, 2], [F(0), F(1)]) == {2: F(1)}
    assert induced_distribution([9, 0], [F(0), F(1)])[9] == 0
    for values_bad, masses_bad in (([], []), ([0], [F(1, 2)]), ([0], [1.0]),
                                   ([0, 1], [F(-1), F(2)]), ([0, 1], [F(1)]), ([float('nan')], [F(1)])):
        try:
            induced_distribution(values_bad, masses_bad)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid finite mapping accepted")
    print("Exact induced PMF:", induced)
    print("P(X >= 1) =", sum(p for x, p in induced.items() if x >= 1))


if __name__ == "__main__":
    main()
