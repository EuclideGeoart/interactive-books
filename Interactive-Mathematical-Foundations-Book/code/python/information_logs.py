"""Exact independent-event product and approximate natural-log likelihood."""
from fractions import Fraction
from math import log, inf, prod, isfinite
def product(probabilities, repeat=1):
    if not 1 <= len(probabilities) <= 6 or type(repeat) is not int or not 1 <= repeat <= 1200:
        raise ValueError('Use 1–6 factors and 1–1200 repetitions')
    masses = [Fraction(str(p)) for p in probabilities]
    if any(p < 0 or p > 1 for p in masses): raise ValueError('Probabilities in [0,1]')
    exact = prod(masses) ** repeat
    log_likelihood = -inf if not exact else sum(log(p.numerator)-log(p.denominator) for p in masses) * repeat
    direct = 1.0
    for _ in range(repeat):
        for p in masses: direct *= float(p)
    return exact, direct, log_likelihood
if __name__ == '__main__':
    assert product([.5,.25,.8])[0] == Fraction(1,10)
    exact, direct, ll = product([.5,.5,.5],400)
    assert exact > 0 and direct == 0 and isfinite(ll)
    assert product([0,.5])[2] == -inf
    print(product([.5,.25,.8]))
