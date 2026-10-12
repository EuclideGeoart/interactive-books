"""NumPy groups equal values with unique/inverse indices and weighted bincount."""
import numpy as np


def induced_distribution(values, masses):
    x, p = np.asarray(values, dtype=float), np.asarray(masses, dtype=float)
    if x.ndim != 1 or p.shape != x.shape or x.size == 0 or not np.all(np.isfinite(x)):
        raise ValueError("Provide a nonempty finite value vector and matching masses")
    if not np.all(np.isfinite(p)) or np.any(p < 0) or abs(p.sum() - 1) > 1e-12:
        raise ValueError("Nonnegative finite masses must sum to 1 within 1e-12")
    labels, inverse = np.unique(x, return_inverse=True)
    return labels, np.bincount(inverse, weights=p, minlength=labels.size)


def main():
    labels, masses = induced_distribution([0, 0, 1, 1, 2, 2], [1/6] * 6)
    np.testing.assert_array_equal(labels, [0, 1, 2])
    np.testing.assert_allclose(masses, [1/3, 1/3, 1/3], rtol=0, atol=1e-12)
    np.testing.assert_allclose(masses[labels >= 1].sum(), 2/3, rtol=0, atol=1e-12)
    np.testing.assert_allclose(induced_distribution([0, 0, 1], [0.5, 0.25, 0.25])[1], [0.75, 0.25], rtol=0, atol=1e-12)
    np.testing.assert_array_equal(induced_distribution([9, 0], [0, 1])[1], [1, 0])
    for x, p in (([], []), ([0], [0.5]), ([0, 1], [-1, 2]), ([np.nan], [1]), ([0], [np.inf])):
        try:
            induced_distribution(x, p)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid mapping accepted")
    print("Value labels:", labels, "induced masses ≈", masses)


if __name__ == "__main__":
    main()
