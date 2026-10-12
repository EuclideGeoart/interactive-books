"""Count outcomes, then justify their masses; never assume multisets are uniform.

Enumeration is bounded to the stage's n = 2..8, k = 0..4. Formulas return exact
integers; probabilities below use Fraction, not floating-point count ratios.
"""
from collections import Counter
from fractions import Fraction as F
from itertools import combinations, combinations_with_replacement, permutations, product
from math import comb, perm


def validate(n, k):
    if type(n) is not int or type(k) is not int or not 2 <= n <= 8 or not 0 <= k <= 4:
        raise ValueError("This explorer requires integer n = 2..8 and k = 0..4")


def selection_count(n, k, ordered, replacement):
    validate(n, k)
    if replacement:
        return n ** k if ordered else comb(n + k - 1, k)
    if k > n:
        return 0
    return perm(n, k) if ordered else comb(n, k)


def enumerate_selections(n, k, ordered, replacement):
    validate(n, k)
    labels = range(1, n + 1)
    if replacement:
        return tuple(product(labels, repeat=k) if ordered else combinations_with_replacement(labels, k))
    return tuple(permutations(labels, k) if ordered else combinations(labels, k))


def multiset_masses(n, k):
    sequences = enumerate_selections(n, k, ordered=True, replacement=True)
    preimages = Counter(tuple(sorted(row)) for row in sequences)
    return {multiset: F(count, len(sequences)) for multiset, count in preimages.items()}


def main():
    assert selection_count(4, 2, True, False) == 12
    assert selection_count(4, 2, False, False) == 6
    assert selection_count(4, 2, True, True) == 16
    assert selection_count(4, 2, False, True) == 10
    assert selection_count(2, 3, True, False) == 0
    assert selection_count(2, 3, False, False) == 0
    for n in range(2, 9):
        for k in range(5):
            for ordered, replacement in product((False, True), repeat=2):
                outcomes = enumerate_selections(n, k, ordered, replacement)
                assert len(outcomes) == selection_count(n, k, ordered, replacement)
                if k == 0:
                    assert outcomes == ((),)
            masses = multiset_masses(n, k)
            assert sum(masses.values(), F(0)) == 1
    for n, k in ((1, 2), (9, 2), (4, -1), (4, 5), (4.0, 2), (4, True)):
        try:
            selection_count(n, k, True, False)
        except ValueError:
            pass
        else:
            raise AssertionError("Out-of-range or noninteger input was accepted")
    pairs = enumerate_selections(4, 2, True, False)
    target_mass = F(sum(set(row) == {1, 2} for row in pairs), len(pairs))
    assert target_mass == F(1, 6)
    masses = multiset_masses(4, 2)
    assert masses[(1, 1)] == F(1, 16)
    assert masses[(1, 2)] == F(1, 8)
    print("Two of four, without replacement: ordered 12, unordered 6; P({1,2}) =", target_mass)
    print("With replacement: ordered 16, unordered 10; exact induced multiset masses:", masses)
    print("k = 0: one empty outcome; k > n without replacement: no sampling space")


if __name__ == "__main__":
    main()
