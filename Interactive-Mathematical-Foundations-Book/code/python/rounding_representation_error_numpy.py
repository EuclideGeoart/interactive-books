import numpy as np
from fractions import Fraction
if __name__ == '__main__':
    for dtype in (np.float16, np.float32, np.float64):
        a, b = dtype('0.1'), dtype('0.2'); result = dtype(a+b)
        stored = Fraction.from_float(float(result))
        print(dtype.__name__, 'display', result, 'exact stored', stored, 'error', stored-Fraction(3, 10))
        assert stored != Fraction(3, 10)
    assert float(np.float64('9007199254740993')) == 9007199254740992
