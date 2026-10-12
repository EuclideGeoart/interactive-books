"""Independent finite-data oracle: pairwise variance and exact Fraction arithmetic."""
import argparse, json
from pathlib import Path
from fractions import Fraction as F
from collections import Counter
from itertools import product
import math

def f(x): return f'{x.numerator}/{x.denominator}'
def median(xs):
    xs=sorted(xs); n=len(xs)
    if not n: raise ValueError('empty median')
    return xs[n//2] if n%2 else (xs[n//2-1]+xs[n//2])/2

def summary(xs):
    if not 1<=len(xs)<=24: raise ValueError('count')
    a=[F(str(x)) for x in xs]
    if any(abs(x)>20 or (x*100).denominator!=1 for x in a): raise ValueError('domain')
    n=len(a); mean=sum(a)/n; med=median(a)
    # Pairwise distances independently recover variance: Σ_iΣ_j (xi-xj)^2/(2n²).
    variance=sum((x-y)**2 for x in a for y in a)/(2*n*n)
    counts=Counter(a); peak=max(counts.values()); modes=[] if peak==1 and len(counts)>1 else sorted(x for x,c in counts.items() if c==peak)
    return dict(mean=f(mean),median=f(med),mad=f(median([abs(x-med) for x in a])),variance=f(variance),sampleVariance=f(variance*n/(n-1)) if n>1 else None,modes=[f(x) for x in modes],ordered=[f(x) for x in sorted(a)])

def sampling(seed,n,repetitions,biased,offset):
    if type(seed)!=int or not 0<=seed<2**32 or type(n)!=int or not 1<=n<=32 or type(repetitions)!=int or not 1<=repetitions<=64 or type(biased)!=bool: raise ValueError('domain')
    shift=F(str(offset))
    if abs(shift)>5 or (shift*100).denominator!=1: raise ValueError('offset')
    population=[0,1,2,3,6,7,8,9]; pool=population[4:] if biased else population
    state=seed; samples=[]
    for _ in range(repetitions):
        row=[]
        for _ in range(n):
            state=(1664525*state+1013904223)%2**32
            row.append(pool[(state*len(pool))//2**32])
        samples.append(row)
    estimates=[F(sum(row),n)+shift for row in samples]; target=F(9,2); mean=sum(estimates)/repetitions
    variance=sum(x*x for x in estimates)/repetitions-mean*mean
    mse=sum((x-target)**2 for x in estimates)/repetitions
    source_mean=F(sum(pool),len(pool)); source_variance=sum((F(x)-source_mean)**2 for x in pool)/len(pool)
    return dict(samples=samples,estimates=[f(x) for x in estimates],empiricalMean=f(mean),bias=f(mean-target),empiricalVariance=f(variance),mse=f(mse),theoreticalBias=f(source_mean+shift-target),theoreticalVariance=f(source_variance/n),theoreticalMse=f(source_variance/n+(source_mean+shift-target)**2))

def fixture():
    data=[[1,2,2,3,7],[1,2,2,3,20],[4],[1,1,3,3],[1,2,3,4],[-2.5,0,1.25],[0,0,0],[-20,20]]
    inputs=[dict(seed=s,n=n,repetitions=r,biased=b,offset=c) for s,n,r in [(42,4,24),(0,1,1),(2**32-1,32,64),(7,2,12)] for b,c in [(False,0),(True,0),(False,1),(True,-3)]]
    return dict(policy='Exact reduced rational strings; pairwise variance. Same bounded LCG, integer index calculation. No adjusted samples.',summaries=[dict(values=x,expected=summary(x)) for x in data],sampling=[dict(input=x,expected=sampling(**x)) for x in inputs])
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    path=Path(__file__).resolve().parents[1]/'fixtures/statistics_data.fixtures.json'; output=json.dumps(fixture(),indent=2,allow_nan=False)+'\n'
    if args.check:
        if not path.exists() or path.read_text()!=output: raise SystemExit('Stale statistics_data fixture')
        print('statistics_data fixtures fresh')
    else: path.write_text(output)
