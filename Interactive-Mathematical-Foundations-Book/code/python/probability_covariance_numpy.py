"""Weighted theoretical covariance, not NumPy's unweighted sample covariance."""
import numpy as np


def association(weights, a=1., b=0., c=1., d=0.):
    w=np.asarray(weights,dtype=float)
    if w.shape != (3,3) or not np.all(np.isfinite(w)) or np.any(w<0) or not np.isfinite(w.sum()) or w.sum()<=0:
        raise ValueError("Require a finite nonnegative 3x3 table of positive total")
    if not np.all(np.isfinite([a,b,c,d])) or np.any(np.abs([a,b,c,d])>1_000_000):
        raise ValueError("Affine parameters must be finite and bounded by 1000000")
    p=w/w.sum()
    u,v=np.meshgrid([-1.,0.,1.],[-1.,0.,1.],indexing='ij')
    x,y=a*u+b,c*v+d
    ex,ey=np.sum(p*x),np.sum(p*y)
    dx,dy=x-ex,y-ey
    vx,vy,cov=np.sum(p*dx*dx),np.sum(p*dy*dy),np.sum(p*dx*dy)
    rho=None if vx==0 or vy==0 else float(cov/np.sqrt(vx*vy))
    return float(ex),float(ey),float(vx),float(vy),float(cov),rho


def main():
    w=[[1,1,0],[1,2,1],[0,1,1]]
    np.testing.assert_allclose(association(w),[0,0,.5,.5,.25,.5],rtol=0,atol=1e-14)
    np.testing.assert_allclose(association(w,-2,3,3,-1),[3,-1,2,4.5,-1.5,-.5],rtol=0,atol=1e-14)
    collapsed=association(w,0,3)
    assert collapsed[2]==0 and collapsed[5] is None
    nonlinear=association([[0,0,1],[0,1,0],[0,0,1]])
    np.testing.assert_allclose(nonlinear,[0,2/3,2/3,2/9,0,0],rtol=0,atol=1e-14)
    for a in (-2,0,1,3):
        for c in (-3,0,1,2):
            result=association(w,a,7,c,-4)
            np.testing.assert_allclose(result[2:5],[a*a/2,c*c/2,a*c/4],rtol=0,atol=1e-14)
            assert result[5] is None if a*c==0 else abs(result[5]) == .5
    for bad in (np.zeros((3,3)),[[-1,0,0],[0,0,0],[0,0,1]],np.full((3,3),np.inf)):
        try:
            association(bad)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid table accepted")
    print("Weighted theoretical association ≈",association(w))
    print("Do not use np.cov on nine cell labels as nine equally likely samples.")
    print("Zero correlation can conceal nonlinear dependence; it proves no causal direction.")


if __name__ == "__main__":
    main()
