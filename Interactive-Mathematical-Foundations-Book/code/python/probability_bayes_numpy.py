"""A fictional quality flag as a joint array: rows are classes, columns evidence.

Compare against literal exact fractions with absolute tolerance 1e-12, relative
tolerance 0. Expected counts scale the model; they are not simulated observations.
"""
from fractions import Fraction as F
import numpy as np

ATOL = 1e-12


def update(prior, true_flag, false_flag, positive=True):
    values = np.asarray([prior, true_flag, false_flag], dtype=float)
    if not np.all(np.isfinite(values)) or np.any(values < 0) or np.any(values > 1):
        raise ValueError("Prior and likelihoods must be finite and in [0, 1]")
    if type(positive) is not bool:
        raise ValueError("Select flag (True) or no flag (False) evidence")
    p, t, f = values
    priors = np.array([p, 1 - p])
    likelihoods = np.array([[t, 1 - t], [f, 1 - f]])
    # shortcut: direct float products can underflow, use scaling/log-space for tiny likelihoods.
    joint = priors[:, None] * likelihoods
    np.testing.assert_allclose(joint.sum(), 1.0, rtol=0, atol=ATOL)
    np.testing.assert_allclose(joint.sum(axis=1), priors, rtol=0, atol=ATOL)
    retained = joint[:, 0 if positive else 1]
    evidence = retained.sum()
    posterior = retained / evidence if evidence > 0 else None
    return joint, evidence, posterior


def main():
    p, t, f = 0.01, 0.90, 0.05
    joint, evidence, posterior = update(p, t, f)
    expected_counts = np.array([[90, 10], [495, 9405]])
    np.testing.assert_allclose(joint * 10000, expected_counts, rtol=0, atol=ATOL)
    np.testing.assert_allclose(evidence, float(F(117, 2000)), rtol=0, atol=ATOL)
    np.testing.assert_allclose(posterior, [float(F(2, 13)), float(F(11, 13))], rtol=0, atol=ATOL)
    np.testing.assert_allclose(posterior.sum(), 1.0, rtol=0, atol=ATOL)
    _, negative_mass, negative_posterior = update(p, t, f, False)
    np.testing.assert_allclose(negative_mass, float(F(1883, 2000)), rtol=0, atol=ATOL)
    np.testing.assert_allclose(negative_posterior[0], float(F(2, 1883)), rtol=0, atol=ATOL)
    np.testing.assert_allclose(update(0.1, t, f)[2][0], float(F(2, 3)), rtol=0, atol=ATOL)
    np.testing.assert_allclose(update(p, 0.2, 0.2)[2][0], p, rtol=0, atol=ATOL)
    np.testing.assert_allclose(update(p, 0.2, 0.2, False)[2][0], p, rtol=0, atol=ATOL)
    assert update(p, 0.0, 0.0)[2] is None
    assert update(p, 1.0, 1.0, False)[2] is None
    assert update(0.0, t, f)[2][0] == 0.0
    assert update(1.0, t, f)[2][0] == 1.0
    np.testing.assert_allclose(update(p, t, 0.0)[2], [1.0, 0.0], rtol=0, atol=ATOL)
    # A small positive evidence total is not invalid merely because it is below ATOL.
    np.testing.assert_allclose(update(p, 1e-100, 1e-100)[2][0], p, rtol=0, atol=ATOL)
    for params in ((-0.1, t, f), (p, 1.1, f), (p, t, -0.01), (np.nan, t, f), (p, np.inf, f)):
        try:
            update(*params)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid Bayes parameters were accepted")
    print("Fictional quality joint masses ≈\n", joint)
    print("Expected counts for N = 10000 ≈\n", joint * 10000)
    print("Positive evidence mass ≈", evidence, "(exact 117/2000)")
    print("Defective/nondefective posterior ≈", posterior, "(exact 2/13, 11/13)")
    print("No-flag defective posterior ≈", negative_posterior[0], "(exact 2/1883)")
    print("Zero represented evidence: undefined (None); underflow needs a separate policy")


if __name__ == "__main__":
    main()
