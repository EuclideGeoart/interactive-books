"""A finite probability model is not an observed sequence of trials.

Fractions made from integers keep these model probabilities exact. The seeded,
bounded die sequence illustrates observations; its frequency is not the model.
"""
from collections import Counter
from fractions import Fraction as F
from random import Random


def validate_model(weights):
    if not weights or any(not isinstance(p, F) or p < 0 for p in weights.values()):
        raise ValueError("Use a nonempty outcome map with nonnegative Fraction masses")
    if sum(weights.values(), F(0)) != 1:
        raise ValueError("Outcome masses must sum exactly to one")


def event_mass(weights, event):
    validate_model(weights)
    if not set(event) <= weights.keys():
        raise ValueError("An event must be a subset of the sample space")
    return sum((weights[outcome] for outcome in set(event)), F(0))


def main():
    die = {face: F(1, 6) for face in range(1, 7)}
    even = {2, 4, 6}
    assert event_mass(die, even) == F(1, 2)
    assert event_mass(die, set()) == 0
    assert event_mass(die, set(die)) == 1
    coins = {outcome: F(1, 4) for outcome in ("HH", "HT", "TH", "TT")}
    assert event_mass(coins, {"HT", "TH"}) == F(1, 2)
    weighted = {"red": F(1, 2), "green": F(1, 3), "blue": F(1, 6)}
    assert event_mass(weighted, {"green", "blue"}) == F(1, 2)
    for bad in ({}, {1: F(1, 2)}, {1: F(-1, 4), 2: F(5, 4)}):
        try:
            validate_model(bad)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid model was accepted")
    try:
        event_mass(die, {7})
    except ValueError:
        pass
    else:
        raise AssertionError("An outcome outside the sample space was accepted")

    # The random generator samples the fair-die model, not arbitrary weights.
    def observations(seed, count):
        rng = Random(seed)
        return tuple(rng.randrange(1, 7) for _ in range(count))

    rolls = observations(2026, 24)
    assert rolls == observations(2026, 24)
    counts = Counter(rolls)
    observed_even = F(sum(counts[face] for face in even), len(rolls))
    print("Fair die: Ω =", tuple(die), "; exact P(even) =", event_mass(die, even))
    print("Two fair independent coins: exact P(one head) =", event_mass(coins, {"HT", "TH"}))
    print("Unequal weights: exact P(green or blue) =", event_mass(weighted, {"green", "blue"}))
    print("24 observed rolls, seed 2026:", rolls)
    print("Empirical even frequency =", observed_even, "(not a replacement for P(even) = 1/2)")


if __name__ == "__main__":
    main()
