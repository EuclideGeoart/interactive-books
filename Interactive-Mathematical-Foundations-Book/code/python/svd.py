"""Educational 2×2 decomposition: symmetric Jacobi angle, scale, orthogonal output frame."""
from fractions import Fraction as F
from math import atan2,cos,sin,hypot

def svd2(a):
    p,q,r,s=[F(str(x)) for row in a for x in row]
    det=p*s-q*r
    if not any((p,q,r,s)):
        return [[1.,0.],[0.,1.]],[0.,0.],[[1.,0.],[0.,1.]]
    g11,g12,g22=p*p+r*r,p*q+r*s,q*q+s*s
    angle=.5*atan2(2*float(g12),float(g11-g22))
    v1=(cos(angle),sin(angle));v2=(-v1[1],v1[0])
    mapped=(float(p)*v1[0]+float(q)*v1[1],float(r)*v1[0]+float(s)*v1[1])
    sigma1=hypot(*mapped);sigma2=abs(float(det))/sigma1 if det else 0.
    u1=(mapped[0]/sigma1,mapped[1]/sigma1)
    orientation=-1 if det<0 else 1
    U=[[u1[0],-orientation*u1[1]],[u1[1],orientation*u1[0]]]
    Vt=[list(v1),list(v2)]
    return U,[sigma1,sigma2],Vt

U,s,Vt=svd2([[3,0],[0,-1]])
assert s==[3.,1.]
for i in range(2):
    for j in range(2):
        reconstructed=sum(U[i][k]*s[k]*Vt[k][j] for k in range(2))
        assert abs(reconstructed-[[3,0],[0,-1]][i][j])<1e-12
assert svd2([[1,2],[2,4]])[1][1]==0
assert svd2([[0,0],[0,0]])[1]==[0.,0.]
# This bounded reference exposes mechanics; production numerical work should use an established SVD.
