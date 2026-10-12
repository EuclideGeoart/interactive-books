"""Python-owned Fraction sources and Decimal100 log(exact product), independently of TS factor-log sums."""
import argparse,json,math,sys
sys.set_int_max_str_digits(20000)
from decimal import Decimal, localcontext
from fractions import Fraction as F
from pathlib import Path
def text(p):return f'{p.numerator}/{p.denominator}'
def encode(x):return float(x) if x.is_finite() else 'Infinity' if x>0 else '-Infinity'
def decimal(p):return Decimal(p.numerator)/Decimal(p.denominator)
def information(p,unit):
    p=F(p)
    if p<0 or p>1 or unit not in ('nats','bits'):raise ValueError('Probability or unit')
    with localcontext() as c:
        c.prec=100
        return -decimal(p).ln()/(Decimal(2).ln() if unit=='bits' else 1) if p else Decimal('Infinity')
def product(probabilities,repeat):
    if not 1<=len(probabilities)<=6 or type(repeat) is not int or not 1<=repeat<=1200:raise ValueError('Shape')
    ps=[F(str(x)) for x in probabilities]
    if any(x<0 or x>1 for x in ps):raise ValueError('Probability')
    exact=math.prod(ps)**repeat
    with localcontext() as c:
        c.prec=100
        ll=decimal(exact).ln() if exact else Decimal('-Infinity')
    return dict(exact=text(exact),logLikelihood=encode(ll),status='impossible' if not exact else 'positive')
def entropy(weights,unit):
    if not 1<=len(weights)<=6 or any(type(w) is not int or not 0<=w<=1000000 for w in weights) or not sum(weights):raise ValueError('Weights')
    ps=[F(w,sum(weights)) for w in weights]
    with localcontext() as c:
        c.prec=100
        surprise=[information(p,unit) for p in ps]
        terms=[decimal(p)*i if p else Decimal(0) for p,i in zip(ps,surprise)]
        return dict(masses=[text(p) for p in ps],information=[encode(x) for x in surprise],terms=[float(x) for x in terms],value=float(sum(terms)))
def fixture():
    products=[dict(probabilities=p,repeat=r) for p,r in [([.5,.25,.8],1),([.5,.5,.5],400),([.01,.99],1200),([0,.5],1),([1,1],1200),([.99],1200),([.1,.2,.3],5)]]
    surprises=[dict(p=p,unit=u) for p in ['0','1','1/4','1/2','1/100','99/100','1/3'] for u in ['nats','bits']]
    entropies=[dict(weights=w,unit=u) for w in [[1],[1,0,0],[1,1],[1,1,1],[2,1,1],[99,1,0],[0,1,0],[1,2,3,4,5,6],[1000000,1]] for u in ['nats','bits']]
    return dict(policy='Exact Fraction masses/products; Decimal100 natural logarithms. Binary64 absolute/relative budget 2e-12*max(1,abs(expected)): up to six log terms, scaled across at most 1200 repetitions; no bound is used for exact fractions or signed infinity. Direct products intentionally expose underflow and are not repaired.',products=[dict(input=i,expected=product(**i)) for i in products],surprises=[dict(input=i,expected=encode(information(**i))) for i in surprises],entropies=[dict(input=i,expected=entropy(**i)) for i in entropies])
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');a=parser.parse_args();p=Path(__file__).resolve().parents[1]/'fixtures/information_probability.fixtures.json';s=json.dumps(fixture(),indent=2,allow_nan=False)+'\n'
    if a.check:
        if not p.exists() or p.read_text()!=s:raise SystemExit('Stale information_probability fixtures')
        print('information_probability fixtures fresh')
    else:p.write_text(s)
