from fractions import Fraction


# Standardising a feature is an affine map z = (x - mu) / sigma. Undoing it is solving z = (x - mu) / sigma for x:
# multiply both sides by sigma (not 0), then add mu: both are balanced, reversible operations.
def standardise(x, mu, sigma):
    return (x - mu) / sigma


def unstandardise(z, mu, sigma):
    return z * sigma + mu


mu, sigma = Fraction(50), Fraction(8)
values = [Fraction(v) for v in (42, 50, 66, 53)]
z = [standardise(v, mu, sigma) for v in values]  # [-1, 0, 2, 3/8]
back = [unstandardise(t, mu, sigma) for t in z]
print([str(t) for t in z])  # ['-1', '0', '2', '3/8']
print(back == values)  # True: the two maps undo each other exactly (with floats this can fail in the last digit)

# sigma = 0 is the case "multiply by 0" in disguise: a constant feature cannot be standardised, and the inverse does not exist
constant_feature = [Fraction(7)] * 4
sigma_zero = Fraction(0)
try:
    standardise(constant_feature[0], Fraction(7), sigma_zero)
except ZeroDivisionError as error:
    print("sigma = 0:", type(error).__name__)  # ZeroDivisionError: nothing can be divided by 0

# A learning rate is a scale factor in an inequality. Gradient descent on f(w) = (w - c)**2 steps  w <- w - eta * 2(w - c),
# so the distance to the minimiser is multiplied by (1 - 2*eta) at every step.
def step(w, c, eta):
    return w - eta * 2 * (w - c)


def contracts(eta):
    """|1 - 2*eta| < 1  <=>  -1 < 1 - 2*eta < 1  <=>  (subtract 1)  -2 < -2*eta < 0  <=>  (divide by -2 and REVERSE)  1 > eta > 0."""
    return 0 < eta < 1


c = Fraction(3)
for eta in (Fraction(1, 4), Fraction(1, 2), Fraction(3, 4), Fraction(-1, 10), Fraction(11, 10)):
    w = Fraction(0)
    for _ in range(3):
        w = step(w, c, eta)
    print(str(eta), str(abs(w - c)), contracts(eta))
# eta = 1/4 -> 3/8   (|1 - 1/2|**3 * 3), contracts
# eta = 1/2 -> 0     (a step of 1/2 lands on the minimiser), contracts
# eta = 3/4 -> 3/8   (|1 - 3/2|**3 * 3 = 3/8), contracts
# eta = -1/10 -> 648/125 = 5.184 : the sign of eta is wrong, every step moves AWAY from the minimiser (factor 6/5)
# eta = 11/10 -> 648/125 = 5.184 : too large, each step overshoots by more than it gained (factor -6/5)
