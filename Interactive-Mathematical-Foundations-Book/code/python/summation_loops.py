from fractions import Fraction

# The sum of a_i for i = m, ..., n (both ends INCLUDED) is a loop with an accumulator.
# Python's range(start, stop) stops BEFORE stop, so the loop that visits i = m, ..., n is range(m, n + 1).


def summation(term, m, n):
    acc = Fraction(0)  # the empty sum: the value before any term has been added
    for i in range(m, n + 1):
        acc += term(i)
    return acc


total = summation(lambda i: Fraction(i), 1, 5)  # 1 + 2 + 3 + 4 + 5 = 15
squares = summation(lambda i: Fraction(i) ** 2, 1, 5)  # 1 + 4 + 9 + 16 + 25 = 55
empty = summation(lambda i: Fraction(i), 3, 2)  # n < m: range(3, 3) has no values, so the sum is 0
single = summation(lambda i: Fraction(i), 4, 4)  # one term

# Closed forms are claims about EVERY n; compare them with the loop for a few bounds.
n = 10
gauss_ok = summation(lambda i: Fraction(i), 1, n) == Fraction(n * (n + 1), 2)  # n(n+1)/2
squares_ok = summation(lambda i: Fraction(i) ** 2, 1, n) == Fraction(n * (n + 1) * (2 * n + 1), 6)
odd_ok = summation(lambda i: Fraction(2 * i - 1), 1, n) == n**2  # the first n odd numbers add up to n squared

# Geometric: (1 - r) * (r**m + ... + r**n) telescopes to r**m - r**(n + 1), so for r != 1 the sum is (r**m - r**(n+1)) / (1 - r).
# Convention (stated in I.8; I.1 leaves 0**0 undefined for ordinary powers): the term r**0 of a geometric sum is 1 for every r, even r = 0,
# which is what Fraction(0) ** 0 gives. A negative power of 0 (r = 0, i < 0) is an error; an empty range(...) never evaluates it.
r = Fraction(1, 2)
geometric = summation(lambda i: r**i, 0, 4)  # 1 + 1/2 + 1/4 + 1/8 + 1/16 = 31/16
geometric_closed = (r**0 - r**5) / (1 - r)
geometric_ok = geometric == geometric_closed
all_ones = summation(lambda i: Fraction(1) ** i, 0, 4)  # r = 1 needs its own formula: n - m + 1 = 5, not 0/0

# Off-by-one: the same sum written four ways. Only the first one is the mathematical sum from 1 to 5.
a = [Fraction(2 * i - 1) for i in range(1, 6)]  # the list holds a_1, ..., a_5, so a[i - 1] is a_i (zero-based list!)
correct = sum(a[i - 1] for i in range(1, 5 + 1))  # 1 + 3 + 5 + 7 + 9 = 25
stops_early = sum(a[i - 1] for i in range(1, 5))  # range(1, 5) misses i = 5: 16, not 25
try:
    sum(a[i] for i in range(1, 5 + 1))  # a[5] does not exist: the list has indices 0 .. 4
    index_error = False
except IndexError:
    index_error = True
slid_window = sum(Fraction(2 * i - 1) for i in range(0, 5))  # reads a_0 ... a_4 = -1 + 1 + 3 + 5 + 7 = 15, not 25

# A negative index does not fail: a[-1] is the LAST entry. a_0 "exists" in code even though the list starts at a_1.
silent_wrap = a[0 - 1] == a[-1]  # True

print(total, squares, empty, single, gauss_ok, squares_ok, odd_ok, geometric, geometric_ok, all_ones, correct, stops_early, index_error, slid_window, silent_wrap)
