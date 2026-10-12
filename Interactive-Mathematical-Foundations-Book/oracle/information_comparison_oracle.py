"""Fraction normalization and Decimal100 CE−H identity; oracle KL uses a different independent expression."""
import argparse,json
from decimal import Decimal,localcontext
from fractions import Fraction as F
from pathlib import Path
def d(x):return Decimal(x.numerator)/Decimal(x.denominator)
def enc(x):return float(x) if x.is_finite() else 'Infinity'
def compare(p,q,unit):
    p=[F(x) for x in p];q=[F(x) for x in q]
    if not 1<=len(p)<=6 or len(p)!=len(q) or any(x<0 for x in p+q) or sum(p)!=1 or sum(q)!=1 or unit not in ('nats','bits'):raise ValueError('Invalid distributions')
    with localcontext() as c:
        c.prec=100;scale=Decimal(2).ln() if unit=='bits' else Decimal(1)
        hterms=[-d(a)*d(a).ln()/scale if a else Decimal(0) for a in p]
        cross=[Decimal(0) if not a else Decimal('Infinity') if not b else -d(a)*d(b).ln()/scale for a,b in zip(p,q)]
        # Per-term log difference avoids the TypeScript ratio-log algorithm.
        kl=[Decimal(0) if not a else Decimal('Infinity') if not b else d(a)*(d(a).ln()-d(b).ln())/scale for a,b in zip(p,q)]
        h=sum(hterms);ce=sum(cross);value=ce-h
        return dict(entropy=enc(h),cross=enc(ce),kl=enc(value),crossTerms=[enc(x) for x in cross],klTerms=[enc(x) for x in kl])
def fixture():
    pairs=[(['1/2','1/4','1/4'],['1/4','1/2','1/4']),(['1/2','1/4','1/4'],['1/4','1/4','1/2']),(['1/2','1/4','1/4'],['1/3','1/3','1/3']),(['1','0'],['1/2','1/2']),(['0','1','0'],['1/2','1/4','1/4']),(['1','0'],['1','0']),(['1/2','1/2'],['0','1']),(['1/10','9/10'],['1/5','4/5']),(['1/5','4/5'],['3/10','7/10']),(['1/10','9/10'],['3/10','7/10']),(['1/1000001','1000000/1000001'],['2/1000001','999999/1000001'])]
    cases=[]
    for p,q in pairs:
        for a,b in [(p,q),(q,p)]:
            for unit in ['nats','bits']:
                i=dict(p=a,q=b,unit=unit);cases.append(dict(input=i,expected=compare(**i)))
    return dict(policy='Exact normalized Fraction source masses, Decimal100 log-difference terms and independent CE−H total. Binary64 budget 2e-12*max(1,abs(expected)); six logarithmic terms with bounded source normalization. Individual KL terms may be negative; small residuals are rounding, not a counterexample to the analytic inequality. Exact equality and infinity require exact policy matches.',cases=cases)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args();path=Path(__file__).resolve().parents[1]/'fixtures/information_comparison.fixtures.json';s=json.dumps(fixture(),indent=2,allow_nan=False)+'\n'
    if a.check:
        if not path.exists() or path.read_text()!=s:raise SystemExit('Stale information_comparison fixture')
        print('information_comparison fixtures fresh')
    else:path.write_text(s)
