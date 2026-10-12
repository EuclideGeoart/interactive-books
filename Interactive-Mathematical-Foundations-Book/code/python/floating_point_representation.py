"""Direct decimal → emulated binary formats: nearest, ties to even; no float intermediate."""
from fractions import Fraction
FORMATS = {'binary64': (11, 52, 1023), 'binary32': (8, 23, 127),
           'fp16': (5, 10, 15), 'bf16': (8, 7, 127)}
def power2(e):
    return Fraction(2**e) if e >= 0 else Fraction(1, 2**-e)
def convert(text, name):
    e, p, bias = FORMATS[name]
    raw = text.strip(); sign = raw.startswith('-'); all_exponents = 2**e-1
    if raw.lower().lstrip('+-') == 'infinity':
        return (int(sign) << (e+p)) | (all_exponents << p)
    if raw.lower() == 'nan':
        return (all_exponents << p) | (1 << (p-1))
    x = abs(Fraction(raw)); prefix = int(sign) << (e+p)
    if x == 0:
        return prefix
    exponent = x.numerator.bit_length() - x.denominator.bit_length()
    if x < power2(exponent):
        exponent -= 1
    exponent = max(exponent, 1-bias)
    if exponent > bias:
        return prefix | (all_exponents << p)
    scaled = x / power2(exponent-p)
    significand = round(scaled)  # Fraction.__round__: nearest, ties even.
    if significand == 2**(p+1):
        significand //= 2; exponent += 1
    if exponent > bias:
        return prefix | (all_exponents << p)
    normal = significand >= 2**p
    return prefix | ((exponent+bias if normal else 0) << p) | (significand-2**p if normal else significand)
def exact(bits, name):
    e, p, bias = FORMATS[name]
    sign = bits >> (e+p); exponent = (bits >> p) & (2**e-1); fraction = bits & (2**p-1)
    if exponent == 2**e-1:
        return None  # infinity or NaN has no rational value.
    return (-1 if sign else 1) * (fraction + (2**p if exponent else 0)) * power2((exponent-bias if exponent else 1-bias)-p)
if __name__ == '__main__':
    assert exact(convert('0.1', 'binary64'), 'binary64') == Fraction(3602879701896397, 36028797018963968)
    assert convert('1.00048828125', 'fp16') == convert('1', 'fp16')
    assert convert('1.000488281250000000000000000001', 'fp16') != convert('1', 'fp16')
    assert convert('-0', 'fp16') == 32768
    for name in FORMATS:
        bits = convert('0.1', name); print(name, 'emulated bits', hex(bits), 'exact', exact(bits, name))
