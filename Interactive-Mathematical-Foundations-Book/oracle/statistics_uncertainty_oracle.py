"""Independent normal coverage, pairwise covariance and two-variable normal equations."""
import argparse, json, math
from pathlib import Path
from fractions import Fraction as F
from statistics import NormalDist

def f(x): return f'{x.numerator}/{x.denominator}'
def intervals(mu,sigma,n,repetitions,seed,confidence):
    if not math.isfinite(mu) or abs(mu)>10 or not .5<=sigma<=5 or confidence not in [90,95,99] or type(n)!=int or not 1<=n<=64 or type(repetitions)!=int or not 1<=repetitions<=80 or type(seed)!=int or not 0<=seed<2**32: raise ValueError('domain')
    if any((F(str(x))*100).denominator!=1 for x in [mu,sigma]): raise ValueError('precision')
    state=seed
    def u():
        nonlocal state
        state=(1664525*state+1013904223)%2**32
        return state/2**32
    critical=NormalDist().inv_cdf((1+confidence/100)/2);se=sigma/math.sqrt(n);h=critical*se;runs=[]
    for _ in range(repetitions):
        sample=[mu+sigma*math.sqrt(-2*math.log(1-u()))*math.cos(2*math.pi*u()) for _ in range(n)]
        mean=sum(sample)/n;lo=mean-h;hi=mean+h
        runs.append(dict(sample=sample,mean=mean,lower=lo,upper=hi,contains=lo<=mu<=hi))
    covered=sum(row['contains'] for row in runs)
    return dict(critical=critical,standardError=se,width=2*h,runs=runs,covered=covered,analyticCoverage=2*NormalDist().cdf(critical)-1)

def scatter(xs,ys,weights,weighted=True):
    if not 1<=len(xs)<=12 or len(xs)!=len(ys) or len(xs)!=len(weights) or any(type(w)!=int or not 0<=w<=9 for w in weights): raise ValueError('shape/weights')
    x=[F(str(v)) for v in xs];y=[F(str(v)) for v in ys]
    if any(abs(v)>8 or (v*100).denominator!=1 for v in x+y): raise ValueError('coordinates')
    w=weights if weighted else [1]*len(x);total=sum(w)
    if not total: raise ValueError('zero weight')
    mx=sum(v*k for v,k in zip(x,w))/total;my=sum(v*k for v,k in zip(y,w))/total
    vx=sum(w[i]*w[j]*(x[i]-x[j])**2 for i in range(len(x)) for j in range(len(x)))/(2*total**2)
    vy=sum(w[i]*w[j]*(y[i]-y[j])**2 for i in range(len(x)) for j in range(len(x)))/(2*total**2)
    cov=sum(w[i]*w[j]*(x[i]-x[j])*(y[i]-y[j]) for i in range(len(x)) for j in range(len(x)))/(2*total**2)
    det=vx*vy-cov*cov;trace=vx+vy;gap=math.sqrt(float((vx-vy)**2+4*cov**2));outer=(float(trace)+gap)/2
    eigen=[outer, float(det)/outer if outer else 0.]
    return dict(meanX=f(mx),meanY=f(my),varX=f(vx),varY=f(vy),covariance=f(cov),determinant=f(det),eigenvalues=eigen,rank=0 if vx==vy==0 else 1 if det==0 else 2,repeated=vx==vy and cov==0)

def regression(xs,ys,weights):
    scatter(xs,ys,weights,False)
    x=list(map(lambda v:F(str(v)),xs));y=list(map(lambda v:F(str(v)),ys));n=len(x);sx=sum(x);sy=sum(y);xx=sum(v*v for v in x);xy=sum(a*b for a,b in zip(x,y));det=n*xx-sx*sx
    b=(n*xy-sx*sy)/det if det else None;a=(sy*xx-sx*xy)/det if det else None
    predicted=[a+b*v for v in x] if det else [sy/n]*n;residual=[v-p for v,p in zip(y,predicted)];rss=sum(v*v for v in residual)
    return dict(slope=f(b) if b is not None else None,intercept=f(a) if a is not None else None,predicted=[f(v) for v in predicted],residuals=[f(v) for v in residual],rss=f(rss),residualSum=f(sum(residual)),orthogonality=f(sum(v*r for v,r in zip(x,residual))))

def fixture():
    ci=[dict(mu=2,sigma=s,n=n,repetitions=r,seed=seed,confidence=c) for s,n,r,seed in [(1.5,8,24,42),(.5,1,4,0),(5,64,8,2**32-1),(2,4,10,7)] for c in [90,95,99]]
    pairs=[dict(xs=x,ys=y,weights=w) for x,y,w in [([-3,-1,0,1,3],[-1,0,1,2,3],[1]*5),([-3,-1,0,1,3],[-1,0,1,2,3],[1,2,1,2,1]),([-2,0,2],[-2,0,2],[1,1,1]),([2,2],[3,3],[1,1]),([-1,1,0,0],[0,0,-1,1],[1]*4),([2,2,2],[1,2,4],[1]*3),([-.25,1.75],[2.5,-1.5],[0,2]),([0],[0],[1])]]
    return dict(policy='Exact pairwise weighted covariance, exact 2x2 normal equations; critical values independently from Python NormalDist. Binary64 values: absolute/relative 2e-12; analytic CDF coverage 2e-9. Counts and containment match exactly; never adjust runs.',intervals=[dict(input=i,expected=intervals(**i)) for i in ci],scatter=[dict(input=i,expected=scatter(**i),regression=regression(**i)) for i in pairs])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();path=Path(__file__).resolve().parents[1]/'fixtures/statistics_uncertainty.fixtures.json';out=json.dumps(fixture(),indent=2,allow_nan=False)+'\n'
    if args.check:
        if not path.exists() or path.read_text()!=out:raise SystemExit('Stale statistics_uncertainty fixture')
        print('statistics_uncertainty fixtures fresh')
    else:path.write_text(out)
