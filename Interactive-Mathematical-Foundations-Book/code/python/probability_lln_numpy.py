"""Vectorized prefix sums with the book's explicit uint32 seed contract."""
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


def experiment(source='bernoulli',p=25,seed=42,trials=200):
    if type(trials) is not int or not 1<=trials<=4000:
        raise ValueError("Trials must be an integer in [1,4000]")
    mean,variance,_=population(source,p)
    u=np.fromiter(uniforms(seed),dtype=float,count=trials)
    x=(u<p/100).astype(float) if source=='bernoulli' else u if source=='uniform' else -np.log1p(-u)
    m=np.arange(1,trials+1)
    return x,np.cumsum(x)/m,np.sqrt(variance/m),mean,variance


def main():
    x,means,scales,mu,variance=experiment(p=50,trials=3)
    np.testing.assert_array_equal(x,[1,1,0])
    np.testing.assert_allclose(means,[1,1,2/3],rtol=0,atol=1e-14)
    np.testing.assert_array_equal(experiment(p=50,trials=3)[0],x)
    for p in (0,100):
        np.testing.assert_array_equal(experiment(p=p,trials=4)[1],np.full(4,p/100))
    for source in ('bernoulli','uniform','exponential'):
        x,means,scales,mu,variance=experiment(source,trials=4000)
        np.testing.assert_allclose(means[-1],x.mean(),rtol=0,atol=1e-13)
        np.testing.assert_allclose(scales[-1]**2,variance/4000,rtol=0,atol=1e-14)
    path=np.cumsum([1,0,1,1])/np.arange(1,5)
    assert abs(path[2]-.5)>abs(path[1]-.5)
    for kwargs in ({'trials':0},{'seed':2**32},{'source':'invalid'},{'p':float('nan')}):
        try:
            experiment(**kwargs)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid experiment accepted")
    print("Actual prefix means ≈",means[:6])
    print("cumsum exposes the path; no favorable-run selection or monotone-error guarantee.")
    print("A Cauchy source lacks the finite expectation required by this LLN version.")


if __name__=='__main__':
    main()
