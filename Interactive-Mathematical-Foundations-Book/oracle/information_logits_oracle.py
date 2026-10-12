"""Decimal400 raw exponentials and direct normalization; extreme equal/dominant cases use analytic identities."""
import argparse,json,math
from decimal import Decimal,localcontext
from pathlib import Path
def enc(x):
    y=float(x)
    return y if math.isfinite(y) else 'Infinity' if y>0 else '-Infinity'
def parse(z):return -math.inf if z=='-Infinity' else math.inf if z=='Infinity' else math.nan if z=='NaN' else z
def pipeline(logits):
    z=[parse(x) for x in logits]
    if not 1<=len(z)<=6 or any(math.isnan(x) or x==math.inf for x in z):return dict(status='invalid')
    if all(x==-math.inf for x in z):return dict(status='undefined')
    with localcontext() as c:
        c.prec=400
        finite=[x for x in z if x!=-math.inf];m=max(finite);dm=Decimal.from_float(float(m));n=len(finite)
        if max(abs(x) for x in finite)<=10000:
            raw=[Decimal(0) if x==-math.inf else Decimal.from_float(float(x)).exp() for x in z]
            total=sum(raw);lse=total.ln();probs=[x/total for x in raw]
            logs=[Decimal('-Infinity') if x==-math.inf else Decimal.from_float(float(x))-lse for x in z]
            shifted_exp=[x/dm.exp() for x in raw];den=total/dm.exp()
        elif all(x==m for x in finite):
            lse=dm+Decimal(n).ln();probs=[Decimal(0) if x==-math.inf else Decimal(1)/n for x in z]
            logs=[Decimal('-Infinity') if x==-math.inf else -Decimal(n).ln() for x in z]
            shifted_exp=[Decimal(0) if x==-math.inf else Decimal(1) for x in z];den=Decimal(n)
        else:
            # shortcut: enormous fixtures have one dominant logit and gaps >10000; add a reference method if broader enormous vectors are taught.
            if finite.count(m)!=1 or any(m-x<10000 for x in finite if x!=m):raise ValueError('No analytic reference for this enormous vector')
            lse=dm;probs=[Decimal(1) if x==m else Decimal(0) for x in z]
            logs=[Decimal('-Infinity') if x==-math.inf else Decimal.from_float(float(x))-dm for x in z]
            shifted_exp=probs;den=Decimal(1)
        return dict(status='valid',max=m,denominator=enc(den),logsumexp=enc(lse),shiftedExponentials=[enc(x) for x in shifted_exp],probabilities=[enc(x) for x in probs],logProbabilities=[enc(x) for x in logs])
def sequence(positions):
    if not 1<=len(positions)<=4:raise ValueError('Sequence size')
    losses=[];terms=[]
    for p in positions:
        if len(p['logits'])!=4 or type(p['target']) is not int or not 0<=p['target']<4 or type(p['ignored']) is not bool:raise ValueError('Token position')
        d=pipeline(p['logits'])
        if d['status']!='valid':raise ValueError('Undefined token prediction')
        loss=math.inf if d['logProbabilities'][p['target']]=='-Infinity' else -d['logProbabilities'][p['target']]
        losses.append(loss);terms.append([loss if i==p['target'] else 0 for i in range(4)])
    used=[loss for loss,p in zip(losses,positions) if not p['ignored']];total=sum(used)
    return dict(losses=[enc(x) for x in losses],oneHotTerms=[[enc(x) for x in row] for row in terms],count=len(used),total=enc(total),mean=enc(total/len(used)) if used else None)
def fixture():
    logits=[[0],[0,0],[1,2,3],[1000,1001,1002],[-1000,-1001,-1002],[1000,0,-1000],[0,-745,-746],[-10000,0,10000],[0,'-Infinity',1],['-Infinity','-Infinity'],[],['NaN',0],['Infinity',0],[1e308,1e308],[1.7976931348623157e308,-1.7976931348623157e308],[.1,.2,.3,.4],[-1.25,2.5,0,-3.75]]
    positions=[dict(logits=[0,0,0,0],target=2,ignored=False),dict(logits=[1000,0,-1000,-1000],target=3,ignored=False)]
    seq=[positions,[dict(**{**p,'ignored':i==1}) for i,p in enumerate(positions)],[dict(**{**p,'ignored':True}) for p in positions],[dict(logits=[0,'-Infinity',0,0],target=1,ignored=False)],[dict(logits=[0,'-Infinity',0,0],target=1,ignored=True),dict(logits=[0,0,0,0],target=0,ignored=False)], [dict(logits=[2,0,-1,-2],target=0,ignored=False),dict(logits=[-1,2,0,-2],target=1,ignored=False),dict(logits=[-1,0,2,1],target=2,ignored=False),dict(logits=[-2,-1,0,2],target=3,ignored=False)]]
    return dict(policy='Independent Decimal400 raw exp sum and log(total), with analytic equal/dominant enormous cases. Exact binary64 inputs via Decimal.from_float. Log/denominator budget 2e-12*max(1,abs(expected)); probability absolute budget 2e-14 (underflow rounds to zero or subnormal). Normalization budget 32*epsilon*6=4.2633e-14 for at most six nonnegative terms. NaN/+Infinity/empty rejected; all −Infinity undefined; isolated −Infinity excludes a class. Finite-logit range overflow is numerical, not excluded support. Masked mean denominator is the number of contributing positions.',logits=[dict(input=z,expected=pipeline(z)) for z in logits],sequences=[dict(input=p,expected=sequence(p)) for p in seq])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args();path=Path(__file__).resolve().parents[1]/'fixtures/information_logits.fixtures.json';s=json.dumps(fixture(),indent=2,allow_nan=False)+'\n'
    if a.check:
        if not path.exists() or path.read_text()!=s:raise SystemExit('Stale information_logits fixture')
        print('information_logits fixtures fresh')
    else:path.write_text(s)
