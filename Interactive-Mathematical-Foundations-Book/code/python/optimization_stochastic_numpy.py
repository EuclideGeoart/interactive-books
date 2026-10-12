"""Vectorized fixed-data residuals and parallel LCG streams; no NumPy RNG substitution."""
from itertools import product
import numpy as np

DESIGN = np.array([[-1, 1], [0, 1], [1, 1], [2, 1]], dtype=np.float64)
TARGET = np.array([-1, 1, 2, 2], dtype=np.float64)


def sample(states, size=2):
    states = np.asarray(states)
    if states.ndim != 1 or not np.issubdtype(states.dtype, np.integer) or np.any(states < 0) or np.any(states >= 2**32):
        raise ValueError("Require a vector of uint32 seeds/states")
    if type(size) is not int or not 1 <= size <= 64:
        raise ValueError("Require an integer batch size in [1,64]")
    states = states.astype(np.uint64, copy=True)
    indices = np.empty((len(states), size), dtype=np.int64)
    for slot in range(size):
        states = (np.uint64(1664525)*states+np.uint64(1013904223)) % np.uint64(2**32)
        indices[:, slot] = (np.uint64(4)*states)//np.uint64(2**32)
    return indices, states


def batch(points, indices):
    points, indices = np.asarray(points, dtype=np.float64), np.asarray(indices)
    if points.ndim != 2 or points.shape[1] != 2 or not np.all(np.isfinite(points)):
        raise ValueError("Require finite parameter points of shape (n,2)")
    if indices.ndim != 2 or indices.shape[0] != len(points) or indices.shape[1] == 0:
        raise ValueError("Require a nonempty batch per point")
    if not np.issubdtype(indices.dtype, np.integer) or np.any(indices < 0) or np.any(indices >= 4):
        raise ValueError("Require data indices 0..3, retaining any repeats")
    selected = DESIGN[indices]
    residuals = np.einsum("nbi,ni->nb", selected, points)-TARGET[indices]
    losses = np.mean(residuals**2/2, axis=1)
    gradients = np.mean(residuals[..., None]*selected, axis=1)
    if not np.all(np.isfinite(losses)) or not np.all(np.isfinite(gradients)):
        raise OverflowError("Non-finite binary64 loss or gradient")
    return losses, gradients


def main():
    initial_states = np.array([42, 43, 0], dtype=np.uint64)
    indices, states = sample(initial_states)
    np.testing.assert_array_equal(indices[0], [1, 0])
    assert states[0] == 378494188 and initial_states[0] == 42
    np.testing.assert_array_equal(sample([42], 4)[0][0], [1, 0, 2, 0])
    points = np.zeros((3, 2))
    losses, gradients = batch(points, indices)
    np.testing.assert_array_equal(gradients[0], [-0.5, 0])
    points -= 0.1*gradients
    np.testing.assert_allclose(points[0], [0.05, 0], rtol=0, atol=1e-14)
    full_indices = np.broadcast_to(np.arange(4), (3, 4))
    full_losses, _ = batch(points, full_indices)
    np.testing.assert_allclose(full_losses[0], 1.164375, rtol=0, atol=1e-14)
    next_indices, states = sample(states)
    np.testing.assert_array_equal(next_indices[0], [2, 0])
    _, gradients = batch(points, next_indices)
    points -= 0.1*gradients
    np.testing.assert_allclose(points[0], [0.195, 0.05], rtol=0, atol=1e-14)
    full_losses, full_gradients = batch(np.zeros((3, 2)), full_indices)
    np.testing.assert_array_equal(full_losses, [1.25]*3)
    np.testing.assert_array_equal(full_gradients, [[-1.75, -1]]*3)
    full_next = -0.1*full_gradients  # This full-batch computation draws nothing.
    np.testing.assert_allclose(full_next[0], [0.175, 0.1], rtol=0, atol=1e-14)
    assert initial_states[0] == 42
    pairs = np.array(list(product(range(4), repeat=2)), dtype=np.int64)
    _, pair_gradients = batch(np.zeros((16, 2)), pairs)
    np.testing.assert_array_equal(pair_gradients.mean(axis=0), [-1.75, -1])
    duplicate_loss, duplicate_gradient = batch([[1, 0.5]], [[0, 0]])
    np.testing.assert_array_equal(duplicate_gradient, [[-0.5, 0.5]])
    noisy_next = np.array([[1, 0.5]])-0.1*duplicate_gradient
    np.testing.assert_allclose(batch(noisy_next, [[0, 1, 2, 3]])[0], [0.126875], rtol=0, atol=1e-14)
    print("Selected seed-42 batches:", indices[0], next_indices[0])
    print("Binary64 mini-batch iterates after two steps ≈", points)
    print("Binary64 full-batch next point ≈", full_next[0], "; RNG state unchanged.")
    print("Ideal uniform pair enumeration checks unbiasedness; fixed seeds do not prove iid behavior.")


if __name__ == "__main__":
    main()
