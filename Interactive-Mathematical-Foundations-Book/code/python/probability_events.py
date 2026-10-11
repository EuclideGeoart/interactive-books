"""Set operations select outcomes; one normalized mass map weights every set."""
from fractions import Fraction as F


def event_mass(weights, event):
    if not weights or any(not isinstance(p, F) or p < 0 for p in weights.values()):
        raise ValueError("Use a nonempty model with nonnegative Fraction masses")
    if sum(weights.values(), F(0)) != 1:
        raise ValueError("Masses must sum exactly to one")
    if not set(event) <= weights.keys():
        raise ValueError("Event contains an outcome outside the sample space")
    return sum((weights[x] for x in set(event)), F(0))


def describe_events(weights, a, b):
    a, b = set(a), set(b)
    # Validate even events whose out-of-space labels disappear in an intersection.
    pa, pb = event_mass(weights, a), event_mass(weights, b)
    joint = event_mass(weights, a & b)
    union = event_mass(weights, a | b)
    complement = event_mass(weights, set(weights) - a)
    assert union == pa + pb - joint
    assert complement == 1 - pa
    return {"P(A)": pa, "P(B)": pb, "P(A∩B)": joint,
            "P(A∪B)": union, "P(Aᶜ)": complement, "disjoint": not (a & b)}


def main():
    die = {face: F(1, 6) for face in range(1, 7)}
    a, b = {2, 4, 6}, {4, 5, 6}
    result = describe_events(die, a, b)
    assert result == {"P(A)": F(1, 2), "P(B)": F(1, 2), "P(A∩B)": F(1, 3),
                      "P(A∪B)": F(2, 3), "P(Aᶜ)": F(1, 2), "disjoint": False}
    assert describe_events(die, a, a)["P(A∪B)"] == F(1, 2)
    assert describe_events(die, a, set(die) - a)["P(A∪B)"] == 1
    assert describe_events(die, set(), b)["P(A∩B)"] == 0
    weighted = {"x": F(1, 2), "y": F(1, 3), "z": F(1, 6)}
    weighted_result = describe_events(weighted, {"x", "y"}, {"y", "z"})
    assert weighted_result["P(A∩B)"] == F(1, 3)
    assert weighted_result["P(A∪B)"] == 1
    zero_weight = {"possible": F(1), "zero": F(0)}
    overlap = describe_events(zero_weight, {"zero"}, {"zero"})
    assert overlap["P(A∩B)"] == 0 and not overlap["disjoint"]
    for weights, event in ((die, {7}), ({}, set()),
                           ({1: F(-1), 2: F(2)}, {1}), ({1: F(1, 2)}, {1})):
        try:
            describe_events(weights, event, set())
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid model or event was accepted")
    print("Fair die, A = {2, 4, 6}, B = {4, 5, 6}:", result)
    print("Weighted x, y, z example:", weighted_result)
    print("Shared zero-weight label: joint mass 0, but sets are not disjoint")


if __name__ == "__main__":
    main()
