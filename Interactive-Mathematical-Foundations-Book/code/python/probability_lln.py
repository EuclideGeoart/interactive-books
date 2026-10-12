"""Seeded observations and actual prefix means; a finite path is not a proof."""
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


def experiment(source='bernoulli', p=25, seed=42, trials=200):
    if type(trials) is not int or not 1<=trials<=4000:
        raise ValueError("Trials must be an integer in [1,4000]")
    mean,variance,draw=population(source,p)
    rng=uniforms(seed)
    observations=[]
    means=[]
    scales=[]
    total=0.
    for m in range(1,trials+1):
        value=draw(next(rng))
        observations.append(value)
        total+=value
        means.append(total/m)
        scales.append(sqrt(variance/m))
    return observations,means,scales,mean,variance


def main():
    rng=uniforms(42)
    assert [next(rng)*4294967296 for _ in range(3)] == [1083814273,378494188,2479403867]
    result=experiment(p=50,trials=3)
    assert result[0]==[1.,1.,0.] and result[1]==[1.,1.,2/3]
    assert result == experiment(p=50,trials=3)
    assert experiment(p=0,trials=4)[1]==[0.]*4
    assert experiment(p=100,trials=4)[1]==[1.]*4
    values=[1,0,1,1]
    prefix=[sum(values[:m])/m for m in range(1,5)]
    assert prefix==[1,.5,2/3,.75]
    assert abs(prefix[2]-.5)>abs(prefix[1]-.5)  # LLN does not promise monotone error.
    for source in ('bernoulli','uniform','exponential'):
        observations,means,scales,mean,variance=experiment(source,trials=4000)
        assert len(observations)==len(means)==len(scales)==4000
        assert abs(means[-1]-sum(observations)/4000)<1e-14
        assert abs(scales[-1]**2-variance/4000)<1e-14
    for kwargs in ({'trials':0},{'trials':4001},{'seed':-1},{'source':'cauchy'},{'p':100.01}):
        try:
            experiment(**kwargs)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid experiment accepted")
    print("First observations and means:",result[:2])
    print("σ/√m is a theoretical repeated-mean scale, not a guaranteed error bound.")
    print("The iid finite-mean LLN is an asymptotic theorem; an LCG run illustrates it.")


if __name__=='__main__':
    main()
