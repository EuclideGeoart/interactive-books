"""Read real 2×2 cases from the characteristic equation, with exact rational coefficients."""
from fractions import Fraction as F
from decimal import Decimal, localcontext

def eigenvalues(a):
    p,q,r,s = [F(str(x)) for row in a for x in row]
    trace, determinant = p+s, p*s-q*r
    discriminant = trace*trace-4*determinant
    if discriminant < 0:
        return 'no real eigenvectors', []
    with localcontext() as ctx:
        ctx.prec = 50
        dec = lambda x: Decimal(x.numerator)/Decimal(x.denominator)
        h = dec(discriminant).sqrt()
        values = [(dec(trace)+h)/2,(dec(trace)-h)/2]
    scalar = q == r == 0 and p == s
    kind = 'every nonzero direction' if scalar else 'one direction' if discriminant == 0 else 'two directions'
    return kind, values

assert eigenvalues([[2,0],[0,-1]]) == ('two directions',[Decimal(2),Decimal(-1)])
assert eigenvalues([[1,1],[0,1]])[0] == 'one direction'
assert eigenvalues([[2,0],[0,2]])[0] == 'every nonzero direction'
assert eigenvalues([[0,-1],[1,0]])[1] == []
