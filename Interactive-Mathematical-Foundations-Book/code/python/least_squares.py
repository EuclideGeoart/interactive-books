"""Exact Gram–Schmidt projection onto a column space."""
from fractions import Fraction as F

def project(columns,b):
    dot=lambda u,v: sum(x*y for x,y in zip(u,v))
    basis=[]
    for col in columns:
        u=list(map(F,col))
        for q in basis:
            gain=dot(u,q)/dot(q,q)
            u=[x-gain*y for x,y in zip(u,q)]
        if not any(u):
            continue  # Dependent or zero vector: do not normalize it.
        basis.append(u)
    p=[F(0)]*len(b)
    for u in basis:
        gain=dot(b,u)/dot(u,u)
        p=[x+gain*y for x,y in zip(p,u)]
    residual=[F(x)-y for x,y in zip(b,p)]
    assert all(dot(residual,c)==0 for c in columns)
    return p,residual,basis

p,r,basis=project([[1,1,1],[-1,0,1]],[0,2,2])
assert p==[F(1,3),F(4,3),F(7,3)]
assert r==[F(-1,3),F(2,3),F(-1,3)]
assert sum(x*x for x in r)==F(2,3)
assert len(project([[1,1],[2,2]],[0,2])[2])==1
