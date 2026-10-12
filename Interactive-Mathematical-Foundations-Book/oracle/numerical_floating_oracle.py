"""Independent bit search against exact Fraction values, Decimal450 radical references.

Browser rounding scales a rational to a significand; this oracle instead binary
searches the ordered positive finite bit patterns and compares exact distances.
NumPy/struct are secondary ordinary-input cross-checks, never fixture owners.
All bits, classes and rational errors compare exactly. Decimal references have
450 significant digits; computed binary64 values allow 4 actual-value ulps for
platform sqrt (never a relative budget scaled to one).
"""
import argparse
from decimal import Decimal, localcontext
from fractions import Fraction as F
import json
from pathlib import Path
FORMATS={'binary64':(11,52,1023),'binary32':(8,23,127),'fp16':(5,10,15),'bf16':(8,7,127)}
FIXTURE=Path(__file__).resolve().parents[1]/'fixtures/numerical_floating.fixtures.json'
def dyadic(e):return F(2**e) if e>=0 else F(1,2**-e)
def decode(bits,fmt):
    e,p,b=FORMATS[fmt];sign=bits>>(e+p);exp=(bits>>p)&(2**e-1);frac=bits%(2**p)
    if exp==2**e-1:return {'kind':'infinity' if frac==0 else 'nan','exact':None,'sign':sign}
    kind='zero' if exp==0 and frac==0 else 'subnormal' if exp==0 else 'normal'
    value=F(frac+(2**p if exp else 0))*dyadic((exp-b if exp else 1-b)-p)*(-1 if sign else 1)
    return {'kind':kind,'exact':str(value),'sign':sign}
def encode(x,fmt,negative_zero=False):
    e,p,b=FORMATS[fmt];sign=2**(e+p) if x<0 or negative_zero else 0;x=abs(F(x))
    maximum=((2**e-2)<<p)+(2**p-1)
    threshold=dyadic(b+1)-dyadic(b-p-1)
    if x>=threshold:return sign|((2**e-1)<<p)
    low,high=0,maximum
    while low<=high:
        mid=(low+high)//2;v=F(decode(mid,fmt)['exact'])
        if v<=x:low=mid+1
        else:high=mid-1
    left=max(high,0)
    if left==maximum:return sign|left
    a=F(decode(left,fmt)['exact']);c=F(decode(left+1,fmt)['exact'])
    choice=left if x-a<c-x else left+1 if x-a>c-x else left+(left%2)
    return sign|choice

def payload():
    cases=[]
    for fmt,(e,p,b) in FORMATS.items():
        tiny=dyadic(1-b-p);normal=dyadic(1-b);threshold=dyadic(b+1)-dyadic(b-p-1)
        values=[F(0),F(1,10),F(1,5),F(3,10),F(9007199254740993),tiny/2,tiny*F(3,2),tiny,normal-tiny/2,normal-tiny,normal,threshold,threshold-tiny/2,threshold+tiny]
        for exponent in [1-b,-1,0,1,b]:
            scale=dyadic(exponent);step=dyadic(exponent-p)
            values.extend([scale+step/2,scale+step*F(3,2),scale+step/2+step/F(10**30)])
        for index,x in enumerate(values):
            for negative in [False,True]:
                x=-abs(x) if negative else abs(x);bits=encode(x,fmt,negative and x==0);decoded=decode(bits,fmt)
                cases.append({'format':fmt,'num':str(x.numerator),'den':str(x.denominator),'negativeZero':negative and x==0,'expected':{'bits':str(bits),**decoded}})
    radicals=[]
    with localcontext() as ctx:
        ctx.prec=450
        for text in ['0','1','2','1e8','1e16','1e32','1e100','1e300']:
            x=Decimal(text);value=1/((x+1).sqrt()+x.sqrt())
            radicals.append({'text':text,'reference':str(value),'num':str(F(value).numerator),'den':str(F(value).denominator)})
    sensitivity=[]
    for text,delta,kind in [('2','.01','square'),('0','1','square'),('1.000001','.000001','reciprocal'),('1','0','reciprocal'),('.999999','.000002','reciprocal')]:
        x=F(text);h=F(delta)
        f=lambda t:t*t if kind=='square' else None if t==1 else 1/(t-1)
        sensitivity.append({'text':text,'delta':delta,'kind':kind,'base':None if f(x) is None else str(f(x)),'changed':None if f(x+h) is None else str(f(x+h))})
    return {'policy':{'rounding':'Direct exact Fraction bit search; nearest, ties even. Bits/classes/rationals exact.','reference':'Decimal450 cancellation checked within rational enclosures.','binary64Ulps':4},'rounding':cases,'radicals':radicals,'sensitivity':sensitivity}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args()
    data=json.dumps(payload(),indent=2,allow_nan=False)+'\n'
    if args.write:FIXTURE.write_text(data,encoding='utf-8')
    elif FIXTURE.read_text(encoding='utf-8')!=data:raise SystemExit('stale numerical_floating.fixtures.json')
    print('numerical floating fixtures fresh')
if __name__=='__main__':main()
