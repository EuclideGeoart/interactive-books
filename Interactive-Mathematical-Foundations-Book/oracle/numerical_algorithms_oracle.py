"""Independent Decimal1000 for small inputs, Decimal200 otherwise transcendental/radical references and Fraction row reduction.

No browser code is read. Primary stable expectations use real Decimal formulas,
not the browser's rescaling/series/compensation implementation. Exact sums,
scaling storage and matrix references use Fraction and ordered-bit search.
Ordinary computed transcendental outputs allow four ulps at their own magnitude;
zero and exceptional classifications, exact matrix quantities and ranks match
exactly. Solver forward error is measured, not constrained by a fake universal
accuracy claim for ill-conditioned systems.
"""
import argparse
from decimal import Decimal, localcontext
from fractions import Fraction as F
import json
import math
from pathlib import Path
from numerical_floating_oracle import encode,decode
FIXTURE=Path(__file__).resolve().parents[1]/'fixtures/numerical_algorithms.fixtures.json'
def scalar(value):
    if value==0 and math.copysign(1,value)<0:return '-0'
    if math.isnan(value):return 'NaN'
    if math.isinf(value):return '-Infinity' if value<0 else 'Infinity'
    return value

def algorithm(text,kind,power=16,fmt='fp16'):
    intended=list(map(F,text.split(',')));xs=list(map(float,intended));reference=None;probabilities=None;logs=None
    with localcontext() as ctx:
        ctx.prec=1000 if kind in ('log1p','expm1') else 200;ds=[Decimal(v.numerator)/Decimal(v.denominator) for v in intended]
        if kind=='hypot':reference=sum(v*v for v in ds).sqrt();stable=float(reference);naive=math.sqrt(xs[0]*xs[0]+xs[1]*xs[1])
        elif kind=='log1p':reference=(1+ds[0]).ln();stable=float(reference);naive=math.log(1+xs[0])
        elif kind=='expm1':reference=ds[0].exp()-1;stable=float(reference);naive=math.exp(xs[0])-1
        elif kind=='sum':
            reference=sum(intended,F(0));stable=float(reference);naive=0.0
            for value in xs:naive+=value
        elif kind=='softmax':
            # Primary reference forms arbitrary-range Decimal exponentials, without shifting.
            weights=[v.exp() for v in ds];total=sum(weights);lse=total.ln();stable=float(lse)
            probabilities=[float(v/total) for v in weights];logs=[float(v-lse) for v in ds]
            try:
                ordinary=sum(math.exp(v) for v in xs);naive=math.log(ordinary) if ordinary else -math.inf
            except OverflowError:naive=math.inf
        elif kind=='scaling':
            reference=intended[0];direct=decode(encode(reference,fmt),fmt);scaled=decode(encode(reference*2**power,fmt),fmt)
            naive=(-math.inf if direct['sign'] else math.inf) if direct['exact'] is None else (-0.0 if F(direct['exact'])==0 and direct['sign'] else float(F(direct['exact'])))
            stable=(-math.inf if scaled['sign'] else math.inf) if scaled['exact'] is None else (-0.0 if F(scaled['exact'])==0 and scaled['sign'] else float(F(scaled['exact'])/2**power))
        return {'naive':scalar(naive),'stable':scalar(stable),'reference':None if reference is None else {'num':str(F(reference).numerator),'den':str(F(reference).denominator)},'probabilities':probabilities,'logProbabilities':logs}

def row_solve(values,rhs):
    rows=[[values[2*i],values[2*i+1],rhs[i]] for i in range(2)];pivot=0
    for col in range(2):
        candidate=next((i for i in range(pivot,2) if rows[i][col]),None)
        if candidate is None:continue
        rows[pivot],rows[candidate]=rows[candidate],rows[pivot];divisor=rows[pivot][col];rows[pivot]=[v/divisor for v in rows[pivot]]
        for i in range(2):
            if i!=pivot:
                factor=rows[i][col];rows[i]=[a-factor*b for a,b in zip(rows[i],rows[pivot])]
        pivot+=1
    if any(row[0]==row[1]==0 and row[2]!=0 for row in rows):return {'kind':'none','solution':None}
    return {'kind':'unique' if pivot==2 else 'infinite','solution':[str(row[2]) for row in rows] if pivot==2 else None}

def matrix_case(text,rhs):
    values=list(map(F,text.split(',')));b=list(map(F,rhs.split(',')));exact=row_solve(values,b);stored=row_solve([F.from_float(float(v)) for v in values],[F.from_float(float(v)) for v in b]);det=values[0]*values[3]-values[1]*values[2]
    condition=None
    if det:
        # Independently solve two identity right-hand sides instead of applying a 2×2 inverse formula.
        columns=[list(map(F,row_solve(values,col)['solution'])) for col in [[F(1),F(0)],[F(0),F(1)]]]
        inverse_norm=max(sum(abs(columns[j][i]) for j in range(2)) for i in range(2));a_norm=max(abs(values[0])+abs(values[1]),abs(values[2])+abs(values[3]));condition=str(a_norm*inverse_norm)
    return {'exact':exact,'stored':stored,'determinant':str(det),'condition':condition}

def payload():
    cases=[]
    for text in ['3,4','3e200,4e200','3e-200,4e-200','0,0','-3,-4','1,1','1e300,1e-300','1e-300,0']:
        cases.append({'text':text,'kind':'hypot','power':16,'format':'fp16','expected':algorithm(text,'hypot')})
    for kind in ['log1p','expm1']:
        for text in ['0','1e-16','-1e-16','0.1','-0.1','1e-8']:
            cases.append({'text':text,'kind':kind,'power':16,'format':'fp16','expected':algorithm(text,kind)})
    for text in ['1e16,1,-1e16','-1e16,1,1e16','1e16,1','0','1e-200,1e-200,-1e-200']:
        cases.append({'text':text,'kind':'sum','power':16,'format':'fp16','expected':algorithm(text,'sum')})
    for text in ['1000,1001,999','0,-1000','-1000,-1001','1.5,1.5','0','2000,-2000']:
        cases.append({'text':text,'kind':'softmax','power':16,'format':'fp16','expected':algorithm(text,'softmax')})
    for text,power,fmt in [('1e-8',16,'fp16'),('1e-8',0,'fp16'),('10000',16,'fp16'),('1e-40',16,'bf16'),('0',16,'fp16'),('-1e-8',16,'fp16'),('-10000',16,'fp16')]:
        cases.append({'text':text,'kind':'scaling','power':power,'format':fmt,'expected':algorithm(text,'scaling',power,fmt)})
    matrices=[]
    for text,rhs in [('3,1,1,2','4,3'),('0,1,1,1','1,2'),('1,1,1,1.000000000001','2,2.0000000000010001'),('1,2,2,4','3,6'),('1,2,2,4','3,7'),('1,1,1,1.0000000000000001','2,2.0000000000000001'),('2,0,0,3','4,9'),('0,0,0,0','0,1')]:
        matrices.append({'matrix':text,'rhs':rhs,'expected':matrix_case(text,rhs)})
    return {'policy':{'method':'Decimal1000 for small inputs, Decimal200 otherwise direct real formulas; exact Fraction sums; independent identity-column Fraction row reduction; ordered-bit-search low-precision storage.','ulps':4,'exact':'Zero/special classes, matrix ranks, determinant, condition and rational reference solutions.','scope':'No universal forward-accuracy bound for sensitive matrix solves.'},'algorithms':cases,'matrices':matrices}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args();data=json.dumps(payload(),indent=2,allow_nan=False)+'\n'
    if args.write:FIXTURE.write_text(data,encoding='utf-8')
    elif FIXTURE.read_text(encoding='utf-8')!=data:raise SystemExit('stale numerical_algorithms.fixtures.json')
    print('numerical algorithms fixtures fresh')
if __name__=='__main__':main()
