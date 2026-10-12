import numpy as np
from decimal import Decimal, localcontext
if __name__ == '__main__':
    x = np.array([1., 1e8, 1e16, 1e100, 1e300], dtype=np.float64)
    naive = np.sqrt(x+1)-np.sqrt(x)
    stable = np.reciprocal(np.sqrt(x+1)+np.sqrt(x))
    assert naive[2] == 0 and np.all(stable > 0)
    with localcontext() as ctx:
        ctx.prec = 450
        for value, answer in zip(x, stable):
            exact_x = Decimal.from_float(float(value))
            reference = 1/((exact_x+1).sqrt()+exact_x.sqrt())
            assert abs(Decimal.from_float(float(answer))/reference-1) < Decimal('1e-15')
    print('naive', naive, 'stable', stable)
