"""Condition by restricting original masses, then normalizing their total.

None means undefined conditioning, not probability zero. Fraction keeps a tiny
positive evidence mass distinct from impossible evidence without an epsilon.
"""
from fractions import Fraction as F


def conditional_distribution(weights, evidence):
    if not weights or any(not isinstance(p, F) or p < 0 for p in weights.values()):
        raise ValueError("Use nonnegative Fraction masses in a nonempty model")
    if sum(weights.values(), F(0)) != 1:
        raise ValueError("Masses must sum exactly to one")
    evidence = set(evidence)
    if not evidence <= weights.keys():
        raise ValueError("Evidence must be inside the sample space")
    retained = sum((weights[x] for x in evidence), F(0))
    if retained == 0:
        return None
    return {x: p / retained if x in evidence else F(0) for x, p in weights.items()}


def conditional_probability(weights, target, evidence):
    target = set(target)
    if not target <= weights.keys():
        raise ValueError("Target must be inside the sample space")
    conditioned = conditional_distribution(weights, evidence)
    if conditioned is None:
        return None
    return sum((conditioned[x] for x in target), F(0))


def main():
    die = {face: F(1, 6) for face in range(1, 7)}
    a, b = {2, 4, 6}, {4, 5, 6}
    original = dict(die)
    given_b = conditional_distribution(die, b)
    assert given_b == {1: F(0), 2: F(0), 3: F(0), 4: F(1, 3), 5: F(1, 3), 6: F(1, 3)}
    assert sum(given_b.values(), F(0)) == 1
    assert conditional_probability(die, a, b) == F(2, 3)
    assert conditional_probability(die, a, {4, 6}) == 1
    assert conditional_probability(die, a, {5}) == 0
    assert conditional_probability(die, a, set(die)) == F(1, 2)
    assert conditional_probability(die, a, set()) is None
    assert die == original  # Conditioning must not overwrite the base experiment.
    weighted = {"x": F(1, 2), "y": F(1, 3), "z": F(1, 6)}
    assert conditional_distribution(weighted, {"y", "z"}) == {"x": F(0), "y": F(2, 3), "z": F(1, 3)}
    assert conditional_probability(die, {2}, a) == F(1, 3)
    assert conditional_probability(die, a, {2}) == 1
    zero_weight = {"x": F(1), "z": F(0)}
    assert conditional_distribution(zero_weight, {"z"}) is None
    tiny = F(1, 10 ** 100)
    assert conditional_probability({"rare": tiny, "other": 1 - tiny}, {"rare"}, {"rare"}) == 1
    for weights, target, evidence in ((die, {7}, b), (die, a, {7}),
                                      ({1: F(-1), 2: F(2)}, {1}, {2}),
                                      ({1: F(1, 2)}, {1}, {1}), ({}, set(), set())):
        try:
            conditional_probability(weights, target, evidence)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid model or event was accepted")
    print("Die given B = {4, 5, 6}: exact normalized masses", given_b)
    print("Exact P(A | B) =", conditional_probability(die, a, b))
    print("Unequal survivors y, z:", conditional_distribution(weighted, {"y", "z"}))
    print("P({2} | even) = 1/3; P(even | {2}) = 1")
    print("Empty or zero-mass evidence: undefined (None)")


if __name__ == "__main__":
    main()
