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
    # Constancy is a support property; floating centering can leave a spurious tiny variance.
    active=p>0
    constant_x=np.all(x[active]==x[active][0])
    constant_y=np.all(y[active]==y[active][0])
    if constant_x:
        ex=x[active][0]
    if constant_y:
        ey=y[active][0]
    dx,dy=x-ex,y-ey
    vx,vy,cov=np.sum(p*dx*dx),np.sum(p*dy*dy),np.sum(p*dx*dy)
    if constant_x or constant_y:
        cov=0.
    if (not constant_x and vx==0) or (not constant_y and vy==0):
        raise ValueError("A nonconstant marginal variance underflowed; rescale the numerical inputs")
    rho=None if constant_x or constant_y else float(cov/np.sqrt(vx)/np.sqrt(vy))
    return float(ex),float(ey),float(vx),float(vy),float(cov),rho


def main():
    w=[[1,1,0],[1,2,1],[0,1,1]]
    np.testing.assert_allclose(association(w),[0,0,.5,.5,.25,.5],rtol=0,atol=1e-14)
    np.testing.assert_allclose(association(w,-2,3,3,-1),[3,-1,2,4.5,-1.5,-.5],rtol=0,atol=1e-14)
    collapsed=association(w,0,3)
    assert collapsed[2]==0 and collapsed[5] is None
    for shift in (.1,.3,-.7):
        result=association(w,0,shift)
        assert result[0]==shift and result[2]==0 and result[4]==0 and result[5] is None
    one_row=association([[0,0,0],[1,1,1],[0,0,0]],1,.3)
    assert one_row[2]==0 and one_row[5] is None
    try:
        association(w,1e-300)
    except ValueError:
        pass
    else:
        raise AssertionError("Nonconstant variance underflow was silently accepted")
    nonlinear=association([[0,0,1],[0,1,0],[0,0,1]])
    np.testing.assert_allclose(nonlinear,[0,2/3,2/3,2/9,0,0],rtol=0,atol=1e-14)
    for a in (-2,0,1,3):
        for c in (-3,0,1,2):
            result=association(w,a,7,c,-4)
            np.testing.assert_allclose(result[2:5],[a*a/2,c*c/2,a*c/4],rtol=0,atol=1e-14)
            if a*c==0:
                assert result[5] is None
            else:
                np.testing.assert_allclose(result[5],np.sign(a*c)*.5,rtol=0,atol=1e-14)
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
