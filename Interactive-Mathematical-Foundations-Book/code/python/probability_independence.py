"""Exact independence tests include zero-mass events without dividing by zero."""
from fractions import Fraction as F


def compare(weights, a, b):
    if not weights or any(not isinstance(p, F) or p < 0 for p in weights.values()):
        raise ValueError("Use a nonempty model of nonnegative Fraction masses")
    if sum(weights.values(), F(0)) != 1:
        raise ValueError("Masses must sum exactly to one")
    a, b = set(a), set(b)
    if not (a | b) <= weights.keys():
        raise ValueError("Events must be inside the sample space")
    pa = sum((weights[x] for x in a), F(0))
    pb = sum((weights[x] for x in b), F(0))
    joint = sum((weights[x] for x in a & b), F(0))
    return {"P(A)": pa, "P(B)": pb, "joint": joint, "product": pa * pb,
            "independent": joint == pa * pb,
            "P(A|B)": joint / pb if pb else None,
            "P(B|A)": joint / pa if pa else None}


def main():
    die = {face: F(1, 6) for face in range(1, 7)}
    a, b = {2, 4, 6}, {4, 5, 6}
    dependent = compare(die, a, b)
    assert dependent["joint"] == F(1, 3)
    assert dependent["product"] == F(1, 4)
    assert dependent["P(A|B)"] == F(2, 3)
    assert not dependent["independent"]
    coins = {outcome: F(1, 4) for outcome in ("HH", "HT", "TH", "TT")}
    first_h, second_h = {"HH", "HT"}, {"HH", "TH"}
    independent = compare(coins, first_h, second_h)
    assert independent["joint"] == independent["product"] == F(1, 4)
    assert independent["P(A|B)"] == F(1, 2) and independent["independent"]
    assert not compare(die, a, set(die) - a)["independent"]
    assert compare(die, a, set())["independent"]
    zero = compare(die, set(), b)
    assert zero["independent"] and zero["P(A|B)"] == 0 and zero["P(B|A)"] is None
    zero_label = {"x": F(1, 2), "y": F(1, 2), "z": F(0)}
    assert compare(zero_label, {"z"}, {"x"})["independent"]
    assert compare(die, a, set(die))["independent"]
    assert not compare(coins, first_h, {"HH"})["independent"]
    cells = (F(1, 6), F(1, 6), F(1, 3), F(1, 3))
    assert sum(cells) == 1 and cells[0] + cells[1] == F(1, 3)
    assert cells[0] + cells[2] == F(1, 2)
    # Pairwise independence does not force the triple product rule.
    matches = {"HH", "TT"}
    assert compare(coins, first_h, matches)["independent"]
    assert compare(coins, second_h, matches)["independent"]
    triple = sum((coins[x] for x in first_h & second_h & matches), F(0))
    assert triple == F(1, 4) != F(1, 8)
    for weights, event in ((die, {7}), ({}, set()),
                           ({1: F(-1), 2: F(2)}, {1}), ({1: F(1, 2)}, {1})):
        try:
            compare(weights, event, set())
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid model or event was accepted")
    print("Dependent fair-die events:", dependent)
    print("Independent fair-coin positions:", independent)
    print("Zero event: product definition holds; reverse conditioning is undefined:", zero)
    print("Pairwise coin events: triple mass 1/4, product 1/8 (not mutually independent)")


if __name__ == "__main__":
    main()
