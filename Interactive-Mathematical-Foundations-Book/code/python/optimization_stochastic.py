"""Exact fixed-data gradients with a reproducible uint32 LCG; sampling is with replacement."""
from fractions import Fraction as F
from itertools import product

DATA = ((-1, -1), (0, 1), (1, 2), (2, 2))
MODULUS = 2**32


def sample(state, size=2):
    if type(state) is not int or not 0 <= state < MODULUS:
        raise ValueError("Require a uint32 seed/state")
    if type(size) is not int or not 1 <= size <= 64:
        raise ValueError("Require an integer batch size in [1,64]")
    indices = []
    for _ in range(size):
        state = (1664525*state+1013904223) % MODULUS
        indices.append((4*state)//MODULUS)
    return tuple(indices), state


def batch(theta, indices):
    w, b = map(F, theta)
    indices = tuple(indices)
    if not indices or any(type(i) is not int or not 0 <= i < 4 for i in indices):
        raise ValueError("Require a nonempty sequence of data indices 0..3")
    examples = []
    for index in indices:
        x, y = DATA[index]
        residual = w*x+b-y
        examples.append({"index": index, "residual": residual,
                         "loss": residual*residual/2, "gradient": (residual*x, residual)})
    count = len(examples)
    return {
        "loss": sum(item["loss"] for item in examples)/count,
        "gradient": tuple(sum(item["gradient"][j] for item in examples)/count for j in (0, 1)),
        "examples": examples,
    }


def step(theta=(0, 0), state=42, eta=F(1, 10), batch_size=2, full_batch=False):
    theta, eta = tuple(map(F, theta)), F(eta)
    if eta <= 0 or type(state) is not int or not 0 <= state < MODULUS:
        raise ValueError("Require a positive learning rate and uint32 state")
    if type(batch_size) is not int or not 1 <= batch_size <= 64:
        raise ValueError("Require an integer batch size in [1,64]")
    if type(full_batch) is not bool:
        raise ValueError("full_batch must be a boolean")
    if full_batch:
        indices, next_state = (0, 1, 2, 3), state
    else:
        indices, next_state = sample(state, batch_size)
    selected, full = batch(theta, indices), batch(theta, (0, 1, 2, 3))
    update = tuple(-eta*g for g in selected["gradient"])
    next_theta = tuple(theta[j]+update[j] for j in (0, 1))
    return {
        "theta": theta, "indices": indices, "state_before": state, "state_after": next_state,
        "batch_loss": selected["loss"], "gradient": selected["gradient"],
        "full_loss": full["loss"], "full_gradient": full["gradient"],
        "update": update, "next_theta": next_theta,
        "next_full_loss": batch(next_theta, (0, 1, 2, 3))["loss"],
    }


def main():
    assert sample(42, 1) == ((1,), 1083814273)
    assert sample(42, 2) == ((1, 0), 378494188)
    assert sample(42, 4) == ((1, 0, 2, 0), 955863294)
    full = batch((0, 0), (0, 1, 2, 3))
    assert full["loss"] == F(5, 4) and full["gradient"] == (F(-7, 4), -1)
    first = step()
    assert first["gradient"] == (F(-1, 2), 0) and first["batch_loss"] == F(1, 2)
    assert first["next_theta"] == (F(1, 20), 0) and first["next_full_loss"] == F(1863, 1600)
    second = step(first["next_theta"], first["state_after"])
    assert second["indices"] == (2, 0) and second["state_after"] == 955863294
    assert second["gradient"] == (F(-29, 20), F(-1, 2))
    assert second["next_theta"] == (F(39, 200), F(1, 20))
    deterministic = step(full_batch=True)
    assert deterministic["indices"] == (0, 1, 2, 3) and deterministic["state_after"] == 42
    assert deterministic["next_theta"] == (F(7, 40), F(1, 10))
    assert step() == first  # Replaying the same seed and start repeats the actual batch.
    optimum = batch((1, F(1, 2)), (0, 1, 2, 3))
    assert optimum["gradient"] == (0, 0) and optimum["loss"] == F(1, 8)
    duplicate = batch((1, F(1, 2)), (0, 0))
    assert duplicate["gradient"] == (F(-1, 2), F(1, 2))
    assert batch((F(21, 20), F(9, 20)), (0, 1, 2, 3))["loss"] == F(203, 1600)
    ordered_pairs = list(product(range(4), repeat=2))
    average = tuple(sum(batch((0, 0), pair)["gradient"][j] for pair in ordered_pairs)/16 for j in (0, 1))
    assert average == full["gradient"]  # Enumerates the ideal uniform two-draw model, not a PRNG theorem.
    for invalid in (-1, MODULUS, True, 1.5):
        try:
            sample(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid uint32 seed accepted")
    print("Exact first seed-42 mini-batch frame:", first)
    print("Exact second frame:", second)
    print("Full batch uses every index once and does not advance the generator.")
    print("A fixed PRNG seed is a reproducible illustration, not proof of iid sampling.")


if __name__ == "__main__":
    main()
