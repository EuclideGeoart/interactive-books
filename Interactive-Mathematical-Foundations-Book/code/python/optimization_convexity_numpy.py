"""Vectorized chord samples plus a Hessian-eigenvalue library cross-check."""
import numpy as np


def loss(points, a=1.0, c=0.0):
    return a*(points[..., 0] - c)**2/2 + 2*points[..., 1]**2


def main():
    p = np.array([[0, 0], [-1, 2], [-2, 0]], dtype=np.float64)
    q = np.array([[2, 0], [3, -1], [2, 0]], dtype=np.float64)
    t = np.linspace(0, 1, 9)[:, None]
    z = (1-t[..., None])*p + t[..., None]*q
    delta = q-p
    for a in (1.0, 0.0, -1.0):
        measured = (1-t)*loss(p, a) + t*loss(q, a) - loss(z, a)
        formula = t*(1-t)*(a*delta[:, 0]**2/2 + 2*delta[:, 1]**2)
        np.testing.assert_allclose(measured, formula, rtol=0, atol=1e-14)
        spectrum = np.linalg.eigvalsh(np.diag([a, 4.0]))
        if a >= 0:
            assert np.all(measured >= -1e-14) and np.all(spectrum >= 0)
        else:
            assert measured[4, 0] == -0.5 and spectrum[0] < 0
    assert loss(z[4, 0]) == 0.5
    assert ((0.0**2-1)**2) > 0.0  # Double-well midpoint vs zero endpoint losses.
    print("Binary64 chord samples agree within absolute tolerance 1e-14.")
    print("The analytic gap and constant Hessian establish the whole-domain claim.")
    print("Sampling finitely many chords alone does not prove convexity.")


if __name__ == "__main__":
    main()
