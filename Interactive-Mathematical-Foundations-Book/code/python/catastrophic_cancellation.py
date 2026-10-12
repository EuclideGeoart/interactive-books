from decimal import Decimal, localcontext
from math import sqrt
if __name__ == '__main__':
    for text in ['0', '1', '1e16', '1e100', '1e300']:
        x = float(text); naive = sqrt(x+1)-sqrt(x); stable = 1/(sqrt(x+1)+sqrt(x))
        with localcontext() as ctx:
            ctx.prec = 450; exact_x = Decimal(text)
            reference = 1/((exact_x+1).sqrt()+exact_x.sqrt())
            print(text, 'naive', naive, 'stable', stable, 'real reference', reference)
            assert abs(Decimal.from_float(stable)/reference-1) < Decimal('1e-15')
    assert sqrt(1e16+1)-sqrt(1e16) == 0
