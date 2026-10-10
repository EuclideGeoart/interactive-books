import math

# ln undoes e^x for EVERY real x: ln(e^x) = x. The computer rounds twice, so the answer can differ in the last digits.
x = 1.5
back = math.log(math.exp(x))  # 1.5 (here it happens to come back exactly)

# e^x is larger than the largest double (about 1.8e308) once x > 709.78. Python raises an error; NumPy would return inf.
try:
    math.exp(710.0)
except OverflowError:
    overflow = "OverflowError"

# ln x does not exist for x <= 0: no power of e is zero or negative.
try:
    math.log(0.0)
except ValueError:
    no_log_of_zero = "ValueError"

# e^(ln x) = x only for x > 0. At x = 10 the round trip is a hair off, because ln 10 is stored rounded.
exp_of_ln = math.exp(math.log(10.0))  # 10.000000000000002: compare with math.isclose, never ==
exp_of_ln_close = math.isclose(exp_of_ln, 10.0, rel_tol=1e-12)  # True

# Square then root: sqrt(x**2) is |x|, not x. The sign is lost on the way up.
sqrt_of_square = math.sqrt((-3.0) ** 2)  # 3.0

# Change of base: log_b a = ln a / ln b. In floating point the quotient is not always the integer you expect.
log2_of_8 = math.log2(8.0)  # 3.0, exactly (math.log2 is built for powers of two)
log_1000_base_10 = math.log(1000, 10)  # 2.9999999999999996 (a quotient of two rounded logarithms)
log10_of_1000 = math.log10(1000.0)  # 3.0 (the dedicated function)

# Bits and nats: log2(a) = ln(a) / ln(2).
bits = math.log(1024.0) / math.log(2.0)  # 10.0
nats = math.log(1024.0)  # 6.931471805599453

# A doubling time: how far must x go for 3**x to double?  log_3(2) = ln 2 / ln 3.
doubling_time = math.log(2.0) / math.log(3.0)  # 0.6309297535714574

print(back, overflow, no_log_of_zero, exp_of_ln, exp_of_ln_close, sqrt_of_square, log2_of_8, log_1000_base_10, log10_of_1000, bits, nats, doubling_time)
