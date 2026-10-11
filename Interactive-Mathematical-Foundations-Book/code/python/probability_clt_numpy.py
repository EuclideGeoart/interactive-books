"""NumPy blocks and histogram; the upper endpoint 4 belongs to overflow."""
import numpy as np
from math import log1p, sqrt


def uniforms(seed):
    if type(seed) is not int or not 0 <= seed <= 0xffffffff:
        raise ValueError("Seed must be a uint32 integer")
    state=seed
    while True:
        state=(1664525*state+1013904223)&0xffffffff
        yield state/4294967296


def population(source, p=50):
    if source not in ('bernoulli','uniform','exponential'):
        raise ValueError("Unknown population")
    if isinstance(p,bool) or not isinstance(p,(int,float)) or not 0 <= p <= 100 or abs(p*100-round(p*100))>1e-8:
        raise ValueError("Probability percent must be in [0,100] with at most two decimals")
    q=p/100
    mean,variance={'bernoulli':(q,q*(1-q)),'uniform':(.5,1/12),'exponential':(1.,1.)}[source]
    draw=lambda u: float(u<q) if source=='bernoulli' else u if source=='uniform' else -log1p(-u)
    return mean,variance,draw


def experiment(source='exponential',p=50,seed=42,n=8,reps=240,dependent=False):
    if type(n) is not int or not 1<=n<=100 or type(reps) is not int or not 10<=reps<=1000 or type(dependent) is not bool:
        raise ValueError("Require bounded integer n/reps and a boolean dependence flag")
    mu,variance,_=population(source,p)
    draws=reps if dependent else n*reps
    u=np.fromiter(uniforms(seed),dtype=float,count=draws)
    x=(u<p/100).astype(float) if source=='bernoulli' else u if source=='uniform' else -np.log1p(-u)
    blocks=np.repeat(x[:,None],n,axis=1) if dependent else x.reshape(reps,n)
    means=blocks.mean(axis=1)
    sums=blocks.sum(axis=1)
    if variance==0:
        return means,sums,blocks[:3],None,None,None,None,variance
    z=np.sqrt(n)*(means-mu)/np.sqrt(variance)
    inside=(z>=-4)&(z<4)
    edges=np.linspace(-4,4,25)
    counts,_=np.histogram(z[inside],bins=edges)
    density=counts/(reps*(1/3))  # density=True would incorrectly renormalize retained data.
    tails=(int(np.sum(z < -4)),int(np.sum(z >= 4)))
    assert int(counts.sum())+sum(tails)==reps
    np.testing.assert_allclose(np.sum(density)/3,np.mean(inside),rtol=0,atol=1e-14)
    return means,sums,blocks[:3],z,counts,density,tails,variance if dependent else variance/n


def main():
    r=experiment(source='bernoulli',n=1,reps=10)
    np.testing.assert_array_equal(r[2],[[1],[1],[0]])
    np.testing.assert_array_equal(r[3][:3],[1,1,-1])
    np.testing.assert_array_equal(r[0],experiment(source='bernoulli',n=1,reps=10)[0])
    pair=experiment(source='bernoulli',n=2,reps=10)
    np.testing.assert_array_equal(pair[2][:2],[[1,1],[0,1]])
    assert experiment(source='bernoulli',p=0)[3] is None
    dependent=experiment(source='bernoulli',n=10,reps=10,dependent=True)
    assert np.all(dependent[2]==dependent[2][:,:1]) and dependent[-1]==.25
    for source in ('bernoulli','uniform','exponential'):
        for n in (1,100):
            r=experiment(source,n=n,reps=1000)
            assert len(r[0])==1000 and int(r[4].sum())+sum(r[6])==1000
            np.testing.assert_allclose(r[1]/n,r[0],rtol=0,atol=1e-14)
    # np.histogram includes the final right edge; filter it out explicitly first.
    boundary=np.array([-5.,-4.,0.,4.,5.])
    kept=boundary[(boundary>=-4)&(boundary<4)]
    counts,_=np.histogram(kept,bins=np.linspace(-4,4,25))
    assert counts.sum()==2 and np.sum(boundary>=4)==2 and np.sum(boundary < -4)==1
    for kwargs in ({'n':0},{'reps':9},{'seed':2**32},{'p':float('inf')}):
        try:
            experiment(**kwargs)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid experiment accepted")
    print("Actual repeated means ≈",pair[0][:6],"first samples:",pair[2])
    print("Finite-n Bernoulli means remain on a lattice, however many repetitions are drawn.")
    print("Classical iid CLT requires finite positive variance; Cauchy does not qualify.")


if __name__=='__main__':
    main()
