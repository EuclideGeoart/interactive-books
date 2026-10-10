from itertools import product

# A universe is a choice, not a given: a complement means nothing until you say "relative to U".
U = set(range(1, 13))  # {1, 2, ..., 12}
A = {1, 2, 3, 4, 5}
B = {4, 5, 6, 7}

union = A | B  # {1, 2, 3, 4, 5, 6, 7}
intersection = A & B  # {4, 5}
a_minus_b = A - B  # {1, 2, 3}
symmetric = A ^ B  # {1, 2, 3, 6, 7}: in exactly one of the two
complement_a = U - A  # {6, ..., 12}: always U minus the set

# Inclusion-exclusion: counting A and B separately counts A ∩ B twice.
inclusion_exclusion = len(union) == len(A) + len(B) - len(intersection)  # True

# De Morgan: complementing swaps union and intersection.
de_morgan_union = (U - (A | B)) == (U - A) & (U - B)  # True
de_morgan_intersection = (U - (A & B)) == (U - A) | (U - B)  # True

# Subset tests: A <= B means every element of A is in B; < means proper subset.
a_in_b = A <= B  # False (1 is not in B)
small_in_a = {2, 3} <= A  # True
empty_is_subset = set() <= A  # True: the empty set is a subset of every set

# Ordered pairs: (1, 2) and (2, 1) are different elements of a product.
X = {1, 2, 3}
Y = {3, 4}
pairs = set(product(X, Y))  # 3 * 2 = 6 ordered pairs
pairs_swapped = set(product(Y, X))
product_size_ok = len(pairs) == len(X) * len(Y)  # True
commutes = pairs == pairs_swapped  # False: X x Y is not Y x X unless X = Y or one is empty

# A relation on S is just a subset of S x S. Its properties are statements about that subset.
S = {1, 2, 3, 4}
less_than = {(a, b) for a, b in product(S, S) if a < b}
reflexive = all((a, a) in less_than for a in S)  # False: 1 < 1 is false
transitive = all((a, c) in less_than for (a, b) in less_than for (b2, c) in less_than if b == b2)  # True
same_parity = {(a, b) for a, b in product(S, S) if (a - b) % 2 == 0}
symmetric_parity = all((b, a) in same_parity for (a, b) in same_parity)  # True
classes = {frozenset(b for b in S if (a, b) in same_parity) for a in S}  # {frozenset({1, 3}), frozenset({2, 4})}

print(union, intersection, a_minus_b, symmetric, complement_a, inclusion_exclusion, de_morgan_union, de_morgan_intersection)
print(a_in_b, small_in_a, empty_is_subset, product_size_ok, commutes, reflexive, transitive, symmetric_parity, classes)
