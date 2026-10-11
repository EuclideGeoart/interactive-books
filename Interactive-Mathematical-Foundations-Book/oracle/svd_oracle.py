"""NumPy decomposition cross-check plus Decimal(100) spectrum for difficult small singular values."""
from decimal import Decimal, localcontext
from fractions import Fraction as F
from pathlib import Path
import json
import random
import sys
import numpy as np
FIXTURE=Path(__file__).resolve().parents[1]/'fixtures/svd.fixtures.json'
TOLERANCE=256*np.finfo(float).eps

def decompose(a):
    p,q,r,s=[F(str(x)) for row in a for x in row]
    det=p*s-q*r
    rank=2 if det else 1 if any((p,q,r,s)) else 0
    g11,g12,g22=p*p+r*r,p*q+r*s,q*q+s*s
    repeated=g11==g22 and g12==0
    with localcontext() as ctx:
        ctx.prec=100
        dec=lambda x:Decimal(x.numerator)/Decimal(x.denominator)
        root=((dec(g11-g22))**2+4*dec(g12)**2).sqrt()
        first=((dec(g11+g22)+root)/2).sqrt()
        second=abs(dec(det))/first if rank==2 else Decimal(0)
        singular=[float(first),float(second)]
    numeric=np.array(a,float)
    U,values,Vt=np.linalg.svd(numeric)
    scale=max(1,np.linalg.norm(numeric))
    assert np.linalg.norm(numeric-U@np.diag(values)@Vt)/scale<=TOLERANCE
    assert np.linalg.norm(U.T@U-np.eye(2))<=TOLERANCE
    assert np.linalg.norm(Vt@Vt.T-np.eye(2))<=TOLERANCE
    # Absolute error bound: NumPy may not retain relative accuracy of an extremely tiny singular value.
    assert max(abs(x-y) for x,y in zip(values,singular))<=TOLERANCE*scale
    return dict(rank=rank,repeated=repeated,singular=singular)

def cases():
    inputs=[[[3,1],[0,1]],[[0,0],[0,0]],[[1,2],[2,4]],[[2,0],[0,2]],[[0,2],[2,0]],[[0,-1],[1,0]],[[4,3.99],[3.99,3.98]],
            [[.01,0],[0,4]],[[1000000,999999.99],[999999.99,999999.98]],[[0,-3],[0,0]],[[1,-1],[-1,1]],[[1,0],[0,-1]]]
    rng=random.Random(619)
    for _ in range(64):inputs.append([[rng.randint(-400,400)/100 for _ in range(2)] for _ in range(2)])
    return [dict(a=a,expected=decompose(a)) for a in inputs]

def main():
    text=json.dumps(dict(method='NumPy SVD reconstruction/orthogonality/order cross-check; independent Decimal(100) singular spectrum and Fraction rank',tolerance=float(TOLERANCE),toleranceRationale='256 epsilon units for two-term sums, products, trig normalization and reconstruction; relative Frobenius with max(1, norm A); absolute spectrum comparison at the same scale, exact rank never thresholded',cases=cases()),indent=2)+'\n'
    if '--check' in sys.argv:
        if not FIXTURE.exists()or FIXTURE.read_text()!=text:raise SystemExit('svd fixture stale; deliberate regeneration required')
        print('SVD: 76 independent NumPy/Decimal cases fresh')
    else:FIXTURE.write_text(text)
if __name__=='__main__':main()
