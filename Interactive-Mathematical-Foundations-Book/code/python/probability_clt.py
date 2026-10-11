"""Bounded repeated means, honest fixed-window density, and an iid counterexample."""
from math import erfc
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
    if type(n) is not int or not 1<=n<=100 or type(reps) is not int or not 10<=reps<=1000:
        raise ValueError("Require n in [1,100] and repetitions in [10,1000]")
    if type(dependent) is not bool:
        raise ValueError("Dependent flag must be boolean")
    mu,variance,draw=population(source,p)
    rng=uniforms(seed)
    means,sums,first=[],[],[]
    for rep in range(reps):
        if dependent:
            sample=[draw(next(rng))]*n
        else:
            sample=[draw(next(rng)) for _ in range(n)]
        if rep<3:
            first.append(sample)
        total=sum(sample)
        sums.append(total)
        means.append(total/n)
    if variance==0:
        return means,sums,first,None,None,None,None,variance
    z=[sqrt(n)*(x-mu)/sqrt(variance) for x in means]
    counts=[0]*24
    under=over=0
    for value in z:
        if value < -4:
            under+=1
        elif value >= 4:
            over+=1
        else:
            counts[min(23,int((value+4)*3))]+=1
    width=1/3
    density=[count/(reps*width) for count in counts]
    assert sum(counts)+under+over==reps
    assert abs(sum(density)*width-sum(counts)/reps)<1e-14
    actual_mean_variance=variance if dependent else variance/n
    return means,sums,first,z,counts,density,(under,over),actual_mean_variance


def main():
    r=experiment(n=1,reps=10,source='bernoulli')
    assert r[2]==[[1.],[1.],[0.]] and r[3][:3]==[1.,1.,-1.]
    assert r==experiment(n=1,reps=10,source='bernoulli')
    paired=experiment(n=2,reps=10,source='bernoulli')
    assert paired[2][0]==[1.,1.] and paired[2][1]==[0.,1.]
    assert experiment(p=0,source='bernoulli')[3] is None
    assert experiment(p=100,source='bernoulli')[4] is None
    dependent=experiment(n=10,reps=10,source='bernoulli',dependent=True)
    assert all(len(set(sample))==1 for sample in dependent[2])
    assert dependent[-1]==.25  # Not .25/10: the entries are perfectly dependent.
    assert 2*(1-.5*erfc(-4/sqrt(2)))>0  # Normal tails are small but nonzero.
    for source in ('bernoulli','uniform','exponential'):
        for n in (1,100):
            r=experiment(source,n=n,reps=1000)
            assert len(r[0])==1000 and len(r[2][0])==n
            assert sum(r[4])+sum(r[6])==1000
    for kwargs in ({'n':0},{'n':101},{'reps':9},{'reps':1001},{'seed':-1}):
        try:
            experiment(**kwargs)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid experiment accepted")
    print("First actual samples:",paired[2],"means:",paired[0][:3])
    print("Bin density = count/(all repetitions × width); omitted tails stay visible.")
    print("Increase n to study CLT shape; repetitions reduce histogram noise.")
    print("Zero variance: no standardization. Dependent blocks: no iid CLT claim.")


if __name__=='__main__':
    main()
