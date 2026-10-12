import numpy as np
from fractions import Fraction
if __name__ == '__main__':
    x = np.array([2., 1.000001]); delta = np.array([.01, .000001])
    square_change = np.square(x+delta)-np.square(x)
    reciprocal_change = np.reciprocal(x+delta-1)-np.reciprocal(x-1)
    assert abs(square_change[0]-.0401) < 2e-15
    exact_change = 1/(Fraction('1.000002')-1)-1/(Fraction('1.000001')-1)
    assert exact_change == -500000
    print('square changes', square_change, 'reciprocal changes', reciprocal_change)
    print('Numerical output need not equal the intended exact-decimal problem.')
