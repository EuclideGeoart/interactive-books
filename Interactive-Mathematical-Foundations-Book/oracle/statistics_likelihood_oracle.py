"""Independent Bernoulli likelihood products, analytic optimizer and math.lgamma Beta normalization."""
import argparse,json,math
from fractions import Fraction as F
from pathlib import Path

def f(x):return f'{x.numerator}/{x.denominator}'
def finite(x):return x if math.isfinite(x) else 'Infinity' if x>0 else '-Infinity'
def density(p,a,b,lb):
    if p in [0,1]:
        exponent=a-1 if p==0 else b-1
        if exponent<0:return dict(kind='divergent',value=None,log='Infinity')
        if exponent>0:return dict(kind='zero',value=0,log='-Infinity')
        return dict(kind='finite',value=math.exp(-lb),log=-lb)
    v=(a-1)*math.log(p)+(b-1)*math.log1p(-p)-lb
    return dict(kind='finite',value=math.exp(v),log=v)
def mode(a,b):
    if a>1 and b>1:return dict(kind='interior',modes=[f((F(str(a))-1)/(F(str(a))+F(str(b))-2))])
    if a==b==1:return dict(kind='uniform',modes=[])
    if a<1 and b<1:return dict(kind='two-boundary-limits',modes=['0/1','1/1'])
    endpoint=0 if a<=1 and b>=1 else 1
    return dict(kind='boundary-limit' if min(a,b)<1 else 'boundary',modes=[f(F(endpoint))])
def inference(data,theta,alpha,beta):
    if not isinstance(data,list) or len(data)>32 or any(type(x)!=int or x not in [0,1] for x in data):raise ValueError('Bernoulli data')
    if not math.isfinite(theta) or not 0<=theta<=1 or (F(str(theta))*100).denominator!=1:raise ValueError('theta')
    if any(not math.isfinite(x) or not .5<=x<=5 or int(2*x)!=2*x for x in [alpha,beta]):raise ValueError('prior')
    n=len(data);k=sum(data);p=F(str(theta));likelihood=F(1)
    for x in data:likelihood*=p if x else 1-p
    log=math.log(float(likelihood)) if likelihood else -math.inf
    mle=F(k,n) if n else None;maximum=F(1)
    if mle is not None:
        for x in data:maximum*=mle if x else 1-mle
    maxlog=math.log(float(maximum))
    a=alpha+k;b=beta+n-k;priorlb=math.lgamma(alpha)+math.lgamma(beta)-math.lgamma(alpha+beta);postlb=math.lgamma(a)+math.lgamma(b)-math.lgamma(a+b)
    return dict(n=n,k=k,likelihood=f(likelihood),logLikelihood=finite(log),mle=f(mle) if mle is not None else None,maxLikelihood=f(maximum),maxLogLikelihood=maxlog,logGap=finite(maxlog-log),a=a,b=b,mode=mode(a,b),prior=density(theta,alpha,beta,priorlb),posterior=density(theta,a,b,postlb),unnormalized=density(theta,a,b,priorlb),evidence=math.exp(postlb-priorlb),posteriorMean=f(F(str(a))/F(str(a+b))))
def fixture():
    specs=[([1,0,1,1,0],p,2,2) for p in [0,.01,.4,.5,.6,.99,1]]
    specs += [(d,p,a,b) for d,p,a,b in [([],0,1,1),([],1,.5,.5),([],0,.5,.5),([],0,1,2),([],1,2,1),([],0,.5,2),([],1,2,.5),([1],0,.5,.5),([0],1,.5,.5),([1,1,1],1,1,1),([0,0,0],0,1,1),([1,0],.5,1,1),([1]*32,.99,5,.5),([0]*32,.01,.5,5),([1]+[0]*31,.03,3.5,2.5),([0],.2,1,1),([1],.8,1,1),([],0,2,2)]]
    inputs=[dict(data=d,theta=p,alpha=a,beta=b) for d,p,a,b in specs]
    return dict(policy='Exact observed-sequence product; independent log(product) versus TS sum(log factors); beta normalization from math.lgamma versus TS half-integer recurrence. Numerical relative/absolute tolerance 2e-12; explicit signed infinities, no NaN JSON. Endpoint MAP denotes density limits, not atoms.',cases=[dict(input=i,expected=inference(**i)) for i in inputs])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args();path=Path(__file__).resolve().parents[1]/'fixtures/statistics_likelihood.fixtures.json';out=json.dumps(fixture(),indent=2,allow_nan=False)+'\n'
    if a.check:
        if not path.exists() or path.read_text()!=out:raise SystemExit('Stale statistics_likelihood fixture')
        print('statistics_likelihood fixtures fresh')
    else:path.write_text(out)
