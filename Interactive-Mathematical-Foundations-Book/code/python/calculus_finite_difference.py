"""Finite differences of a polynomial: exact rational quotients versus binary64 ones isolate rounding error (III.14)."""
from fractions import Fraction as F

p = lambda x: x**3 / 6 - x                  # works for Fraction and float
dp = lambda x: x**2 / 2 - 1                 # exact derivative

x = F(3, 2)
for k in range(1, 17):
    h = F(1, 10**k)
    exact_forward = (p(x + h) - p(x)) / h          # exact rational quotient
    # In exact arithmetic the forward error is exactly h*x/2 + h**2/6 (truncation only).
    assert exact_forward - dp(x) == h * x / 2 + h * h / 6

xf = 1.5
errs = [abs((p(xf + 10.0**-k) - p(xf)) / 10.0**-k - float(dp(x))) for k in range(1, 17)]
best = min(range(16), key=lambda i: errs[i])
assert 5 <= best + 1 <= 10                # the best step is near sqrt(eps) ~ 1e-8, not the smallest one
assert errs[15] > errs[best] * 100        # h = 1e-16 is far worse than the best step
