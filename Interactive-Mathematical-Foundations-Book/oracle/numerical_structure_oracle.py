"""Independent Fraction coordinate dictionaries, Cartesian indexing and integer RNG state.

Sparse expectations use a coordinate dictionary and row-index membership, not
browser CSR traversal. Tensor expectations use Cartesian products/dictionaries,
with optional NumPy cross-checks; fixture bytes are stdlib-only. RNG uses Python
arbitrary-precision modular integers. Discrete shapes/indices/states, rational
values, classifications and operation counts compare exactly. Specified native
binary64 associations and tolerance arithmetic are checked independently with
Python float/Fraction.from_float; finite outputs have exact parity here.
"""
import argparse
from fractions import Fraction as F
from itertools import product
import json
from math import prod
from pathlib import Path
FIXTURE=Path(__file__).resolve().parents[1]/'fixtures/numerical_structure.fixtures.json'
def sparse(s):
    rows,cols=s['rows'],s['cols'];raw=[];coords={};duplicates=0
    if type(rows) is not int or type(cols) is not int or not 1<=rows<=3 or not 1<=cols<=3:raise ValueError('bounded shape')
    for item in s['entries'].split(';') if s['entries'] else []:
        r,c,v=item.split(',');r,c=int(r),int(c);value=F(v)
        if not 0<=r<rows or not 0<=c<cols:raise ValueError('coordinate outside shape')
        duplicates+=(r,c) in coords;coords[r,c]=coords.get((r,c),F(0))+value;raw.append((r,c,value))
    if len(raw)>18:raise ValueError('too many entries')
    coords={key:value for key,value in coords.items() if value};canonical=sorted(coords.items());vector=list(map(F,s['vector'].split(',')))
    if len(vector)!=cols:raise ValueError('vector shape')
    dense=[[str(coords.get((r,c),F(0))) for c in range(cols)] for r in range(rows)]
    result=[str(sum((v*vector[c] for (row,c),v in coords.items() if row==r),F(0))) for r in range(rows)]
    nnz=len(coords);pointers=[sum(1 for (r,c) in coords if r<boundary) for boundary in range(rows+1)]
    return {'dense':dense,'data':[str(v) for key,v in canonical],'indices':[key[1] for key,v in canonical],'indptr':pointers,'result':result,'nnz':nnz,'duplicates':duplicates,'explicitZeros':sum(v==0 for r,c,v in raw),'nearZero':sum(abs(v)<=F(s['threshold']) for v in coords.values()),'costs':[8*rows*cols,16*nnz,12*nnz+4*(rows+1)]}
def tuple_shape(text):return tuple(int(d) for d in text.strip('()').split(',') if d)
def cartesian(shape):return list(product(*(range(d) for d in shape)))
def tensor(s):
    a_shape,b_shape=tuple_shape(s['left']),tuple_shape(s['right']);rank=max(len(a_shape),len(b_shape));a_pad=(1,)*(rank-len(a_shape))+a_shape;b_pad=(1,)*(rank-len(b_shape))+b_shape
    if any(a!=b and a!=1 and b!=1 for a,b in zip(a_pad,b_pad)):return {'kind':'incompatible','outShape':None,'values':[],'mappings':[],'reduction':None}
    shape=tuple(b if a==1 else a for a,b in zip(a_pad,b_pad))
    if prod(shape)>64:return {'kind':'bounded-out','outShape':list(shape),'values':[],'mappings':[],'reduction':None}
    a=dict(zip(cartesian(a_shape),range(s['aStart'],s['aStart']+prod(a_shape))));b=dict(zip(cartesian(b_shape),range(s['bStart'],s['bStart']+prod(b_shape))));mappings=[];values=[]
    for out in cartesian(shape):
        ai=tuple(0 if d==1 else out[rank-len(a_shape)+i] for i,d in enumerate(a_shape));bi=tuple(0 if d==1 else out[rank-len(b_shape)+i] for i,d in enumerate(b_shape));value=a[ai]+b[bi] if s['operation']=='add' else a[ai]*b[bi]
        mappings.append({'index':list(out),'aIndex':list(ai),'bIndex':list(bi),'a':str(a[ai]),'b':str(b[bi]),'value':str(value)});values.append(value)
    all_axes=s['axis']=='all';axis=None if all_axes else int(s['axis']);axis=axis+rank if axis is not None and axis<0 else axis
    if not all_axes and not 0<=axis<rank:reduction={'kind':'invalid'}
    else:
        reduced=() if all_axes else shape[:axis]+shape[axis+1:];groups={index:0 for index in cartesian(reduced)}
        for out,v in zip(cartesian(shape),values):groups[() if all_axes else out[:axis]+out[axis+1:]]+=v
        reduction={'kind':'valid','shape':list(reduced),'values':[str(v) for v in groups.values()]}
    return {'kind':'valid','outShape':list(shape),'values':list(map(str,values)),'mappings':mappings,'reduction':reduction}
def rng(seed,count):
    state=seed;records=[]
    for index in range(count):
        before=state;state=(1664525*state+1013904223)%2**32;records.append({'index':index,'before':before,'after':state,'exact':str(F(state,2**32))})
    return records
def replay(s):
    values=list(map(F,s['values'].split(',')));a,b,c=map(float,values);left=(a+b)+c;right=a+(b+c);reference=sum(values,F(0));atol=float(F(s['absoluteTolerance']));rtol=float(F(s['relativeTolerance']));budget=atol+rtol*max(abs(left),abs(right))
    return {'records':rng(s['seed'],s['count']),'left':left,'right':right,'reference':str(reference),'withinBudget':abs(left-right)<=budget,'difference':abs(left-right),'budget':budget,'leftError':str(F.from_float(left)-reference),'rightError':str(F.from_float(right)-reference)}
def payload():
    base={'rows':3,'cols':3,'entries':'0,0,2;1,1,3;2,2,4','vector':'1,2,3','threshold':'1e-6'}
    sparse_cases=[base,{**base,'entries':'0,0,2;0,0,-2;1,2,3;2,2,0'},{**base,'entries':'0,0,2;2,2,4'},{**base,'entries':''},{**base,'entries':'0,0,1e-8;1,1,3'},{**base,'rows':2,'cols':3,'entries':'0,2,2;1,0,-1','vector':'1,2,3'},{**base,'rows':1,'cols':1,'entries':'0,0,0.1;0,0,0.2','vector':'0.5'},{**base,'entries':';'.join(f'{r},{c},1' for r in range(3) for c in range(3))}]
    tensors=[];t={'left':'(2,3)','right':'(3,)','axis':'1','operation':'add','aStart':1,'bStart':10}
    for left,right,axis in [('(2,3)','(3,)','1'),('(2,3)','(3,)','0'),('(2,3)','(2,)','1'),('()','(3,)','all'),('(2,1,3)','(1,4,1)','-1'),('(0,3)','(1,3)','0'),('(0,3)','(1,3)','1'),('()','()','all'),('()','()','0'),('(4,1,4,1)','(1,4,1,4)','all'),('(2,2,2,2)','()','-2')]:
        for operation in ['add','multiply']:
            s={**t,'left':left,'right':right,'axis':axis,'operation':operation};tensors.append({'input':s,'expected':tensor(s)})
    r={'seed':42,'count':6,'values':'1e16,-1e16,1','absoluteTolerance':'1e-12','relativeTolerance':'1e-12'};replays=[]
    for seed,count,values,atol,rtol in [(42,6,r['values'],'1e-12','1e-12'),(7,6,r['values'],'0','0'),(0,16,'1,2,3','0','0'),(4294967295,1,'1,-1,0','1e-12','1e-12'),(378494188,4,r['values'],'1','0'),(42,3,'0.1,0.2,0.3','1e-12','1e-12')]:
        s={**r,'seed':seed,'count':count,'values':values,'absoluteTolerance':atol,'relativeTolerance':rtol};replays.append({'input':s,'expected':replay(s)})
    return {'policy':{'method':'Exact coordinate dictionaries, Cartesian products, arbitrary-precision modular integers; optional NumPy is cross-check only.','exact':'Structure, shapes, indices, counts, RNG states, all rationals and specified native binary64 association results.','bounds':'Matrices 1..3 each axis; ≤18 COO inputs; tensors ≤4 axes of size0..4 with ≤64 elements; streams ≤16 draws.'},'sparse':[{'input':s,'expected':sparse(s)} for s in sparse_cases],'tensors':tensors,'replays':replays}
def main():
    p=argparse.ArgumentParser();p.add_argument('--write',action='store_true');p.add_argument('--check',action='store_true');args=p.parse_args();data=json.dumps(payload(),indent=2,allow_nan=False)+'\n'
    if args.write:FIXTURE.write_text(data,encoding='utf-8')
    elif FIXTURE.read_text(encoding='utf-8')!=data:raise SystemExit('stale numerical_structure.fixtures.json')
    print('numerical structure fixtures fresh')
if __name__=='__main__':main()
