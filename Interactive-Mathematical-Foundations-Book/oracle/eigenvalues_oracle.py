"""Exact characteristic coefficients plus 100-digit Decimal roots; NumPy is a separate check."""
from decimal import Decimal, localcontext
from fractions import Fraction as F
from pathlib import Path
import json
import random
import sys
FIXTURE = Path(__file__).resolve().parents[1]/'fixtures/eigenvalues.fixtures.json'
def spectrum(a):
    p,q,r,s = [F(str(x)) for row in a for x in row]
    t,det = p+s,p*s-q*r
    d = t*t-4*det
    kind = 'no-real' if d < 0 else 'scalar' if d == 0 and q == r == 0 and p == s else 'defective' if d == 0 else 'distinct'
    values = []
    if d >= 0:
        with localcontext() as ctx:
            ctx.prec = 100
            dec = lambda x: Decimal(x.numerator)/Decimal(x.denominator)
            h = dec(d).sqrt()
            values = [float((dec(t)+h)/2),float((dec(t)-h)/2)]
    return dict(trace=str(t),determinant=str(det),discriminant=str(d),kind=kind,values=values)
def cases():
    inputs = [[[2,0],[0,-1]],[[1,1],[0,1]],[[2,0],[0,2]],[[2,0],[0,0]],[[0,-1],[1,0]],[[0,2],[1,0]],[[0,0],[0,0]],[[1,0],[0,-2]],[[4,3.99],[3.99,3.98]]]
    rng = random.Random(617)
    for _ in range(48):
        inputs.append([[rng.randint(-16,16)/4 for _ in range(2)] for _ in range(2)])
    return [dict(a=a,expected=spectrum(a)) for a in inputs]
def main():
    text=json.dumps(dict(method='Fraction characteristic identities + Decimal(100) roots',tolerance='256 epsilon units times max(1, Frobenius norm of A); never used for exact classification',cases=cases()),indent=2)+'\n'
    if '--check' in sys.argv:
        if not FIXTURE.exists() or FIXTURE.read_text()!=text: raise SystemExit('eigenvalues fixture stale')
        print('eigenvalues: 57 characteristic cases fresh')
    else: FIXTURE.write_text(text)
if __name__=='__main__': main()
