"""Centered exact covariance for mapped latent U,V; correlation may be undefined."""
from fractions import Fraction as F
from math import sqrt


def association(weights, a=F(1), b=F(0), c=F(1), d=F(0)):
    if len(weights) != 9 or any(type(w) is not int or not 0 <= w <= 1_000_000 for w in weights) or sum(weights) <= 0:
        raise ValueError("Require nine bounded nonnegative integer weights of positive total")
    if any(isinstance(s, bool) or not isinstance(s, (int,F)) or abs(s)>1_000_000 for s in (a,b,c,d)):
        raise ValueError("Use exact integer or Fraction affine parameters bounded by 1000000")
    values = [-1,0,1]
    points = [(a*u+b,c*v+d,F(weights[3*i+j],sum(weights))) for i,u in enumerate(values) for j,v in enumerate(values)]
    ex = sum((x*p for x,y,p in points), F(0))
    ey = sum((y*p for x,y,p in points), F(0))
    vx = sum((p*(x-ex)**2 for x,y,p in points), F(0))
    vy = sum((p*(y-ey)**2 for x,y,p in points), F(0))
    cov = sum((p*(x-ex)*(y-ey) for x,y,p in points), F(0))
    assert cov == sum((p*x*y for x,y,p in points),F(0))-ex*ey
    rho = None if vx == 0 or vy == 0 else float(cov)/sqrt(float(vx*vy))
    merged = {}
    for x,y,p in points:
        if p:
            merged[x,y] = merged.get((x,y),F(0))+p
    mx = {x: sum((p for (u,v),p in merged.items() if u==x), F(0)) for x,y in merged}
    my = {y: sum((p for (u,v),p in merged.items() if v==y), F(0)) for x,y in merged}
    independent = all(merged.get((x,y),F(0)) == px*py for x,px in mx.items() for y,py in my.items())
    return ex, ey, vx, vy, cov, rho, independent, merged


def main():
    w=[1,1,0,1,2,1,0,1,1]
    assert association(w)[:6] == (F(0),F(0),F(1,2),F(1,2),F(1,4),.5)
    assert association(w,-2,3,3,-1)[:6] == (F(3),F(-1),F(2),F(9,2),F(-3,2),-.5)
    collapsed=association(w,0,3)
    assert collapsed[2] == 0 and collapsed[5] is None and collapsed[6]
    assert len(collapsed[7]) == 3 and sum(collapsed[7].values()) == 1
    nonlinear=association([0,0,1,0,1,0,0,0,1])
    assert nonlinear[:6] == (F(0),F(2,3),F(2,3),F(2,9),F(0),0.) and not nonlinear[6]
    assert association([1,2,1,2,4,2,1,2,1])[6]
    for a in (-2,0,1,3):
        for c in (-3,0,1,2):
            result=association(w,a,7,c,-4)
            assert result[2:5] == (F(a*a,2),F(c*c,2),F(a*c,4))
            assert result[5] is None if a*c==0 else abs(result[5]) == .5
    print("Canonical moments, covariance, correlation:",association(w)[:6])
    print("Nonlinear zero correlation is still dependent:",nonlinear[:7])
    print("Constant correlation is undefined. Association alone is not causation.")


if __name__ == "__main__":
    main()
