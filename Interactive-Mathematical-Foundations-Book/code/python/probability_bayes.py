"""Bayes' theorem for a fictional quality flag, not a real diagnostic tool.

All masses and expected counts are exact Fractions. Expected population counts
are a scaled model, not observations; arbitrary parameters can yield fractions.
"""
from fractions import Fraction as F


def joint_table(prior, true_flag, false_flag):
    if any(not isinstance(x, F) or not 0 <= x <= 1 for x in (prior, true_flag, false_flag)):
        raise ValueError("Prior and likelihoods must be Fractions in [0, 1]")
    return {"A,flag": prior * true_flag,
            "A,no flag": prior * (1 - true_flag),
            "not A,flag": (1 - prior) * false_flag,
            "not A,no flag": (1 - prior) * (1 - false_flag)}


def update(prior, true_flag, false_flag, positive=True):
    if type(positive) is not bool:
        raise ValueError("Select flag (True) or no flag (False) evidence")
    joint = joint_table(prior, true_flag, false_flag)
    suffix = "flag" if positive else "no flag"
    a_mass = joint["A," + suffix]
    not_a_mass = joint["not A," + suffix]
    evidence = a_mass + not_a_mass
    posterior = a_mass / evidence if evidence else None
    return evidence, posterior


def main():
    p, t, f = F(1, 100), F(9, 10), F(1, 20)
    joint = joint_table(p, t, f)
    assert sum(joint.values(), F(0)) == 1
    assert joint["A,flag"] + joint["A,no flag"] == p
    expected_counts = {cell: mass * 10000 for cell, mass in joint.items()}
    assert expected_counts == {"A,flag": F(90), "A,no flag": F(10),
                               "not A,flag": F(495), "not A,no flag": F(9405)}
    assert update(p, t, f) == (F(117, 2000), F(2, 13))
    assert update(p, t, f, False) == (F(1883, 2000), F(2, 1883))
    assert update(F(1, 10), t, f) == (F(27, 200), F(2, 3))
    assert update(p, F(1, 5), F(1, 5))[1] == p
    assert update(p, F(1, 5), F(1, 5), False)[1] == p
    assert update(p, t, F(0))[1] == 1
    assert update(p, F(0), F(0)) == (F(0), None)
    assert update(p, F(1), F(1), False) == (F(0), None)
    assert update(F(0), t, f)[1] == 0
    assert update(F(1), t, f)[1] == 1
    assert update(F(0), t, F(0))[1] is None
    tiny = F(1, 10 ** 100)
    assert update(p, tiny, tiny) == (tiny, p)
    assert joint_table(F(1, 3), F(1, 2), F(1, 4))["A,flag"] * 10 == F(5, 3)
    for params in ((F(-1), t, f), (p, F(2), f), (p, t, F(-1, 20)), (0.01, t, f)):
        try:
            update(*params)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid parameters were accepted")
    print("Fictional quality flag: prior 1%, P(flag|A) 90%, P(flag|not A) 5%")
    print("Exact expected counts for N = 10000:", expected_counts)
    print("Positive evidence (mass, posterior):", update(p, t, f))
    print("Negative evidence (mass, posterior):", update(p, t, f, False))
    print("Prior 10%, unchanged likelihoods:", update(F(1, 10), t, f))
    print("Impossible evidence:", update(p, F(0), F(0)), "; None means undefined")


if __name__ == "__main__":
    main()
