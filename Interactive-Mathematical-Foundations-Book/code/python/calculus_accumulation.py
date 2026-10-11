"""The accumulation function F(x) = integral from a to x of f, built exactly; F'(x) = f(x) (III.13)."""
from fractions import Fraction as F

f = lambda t: t**3 / 4 - t
P = lambda t: t**4 / 16 - t**2 / 2          # an antiderivative of f
a = F(-2)
Fx = lambda x: P(x) - P(a)                  # F(a) = 0 by construction

assert (Fx(a), Fx(F(1)), Fx(F(2)), Fx(F(0))) == (0, F(9, 16), 0, 1)

# A thin strip adds nearly f(x)*h; the ratio tends to f(x) as h shrinks.
x = F(1)
gaps = [abs((Fx(x + h) - Fx(x)) / h - f(x)) for h in (F(1, 2**k) for k in range(4, 14))]   # small h: gap ~ |f'(x)| h/2
assert all(b < a_ for a_, b in zip(gaps, gaps[1:]))
assert Fx(x + F(1, 2)) - Fx(x) == F(-95, 256)

# A jump in f gives a corner in F: one-sided slopes 1 and -1 at t = 1.
step_F = lambda x: x if x < 1 else 2 - x    # integral from 0 of (1 for t < 1, -1 for t >= 1)
h = F(1, 1000)
assert (step_F(F(1)) - step_F(1 - h)) / h == 1 and (step_F(1 + h) - step_F(F(1))) / h == -1
