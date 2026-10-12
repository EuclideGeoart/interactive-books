"""Fraction row reduction supplies a reference; floating partial pivoting computes the candidate."""
from fractions import Fraction as F
def exact_solve(values,rhs):
    rows=[[F(values[2*i]),F(values[2*i+1]),F(rhs[i])] for i in range(2)]
    for col in range(2):
        pivot=next((i for i in range(col,2) if rows[i][col]),None)
        if pivot is None:return None
        rows[col],rows[pivot]=rows[pivot],rows[col]
        scale=rows[col][col];rows[col]=[v/scale for v in rows[col]]
        for i in range(2):
            if i!=col:
                factor=rows[i][col];rows[i]=[a-factor*b for a,b in zip(rows[i],rows[col])]
    return [row[2] for row in rows]
def solve(values,rhs):
    a=list(map(float,values));b=list(map(float,rhs));rows=[[a[0],a[1],b[0]],[a[2],a[3],b[1]]]
    if abs(rows[1][0])>abs(rows[0][0]):rows.reverse()
    if rows[0][0]==0:return None
    factor=rows[1][0]/rows[0][0];pivot=rows[1][1]-factor*rows[0][1];r=rows[1][2]-factor*rows[0][2]
    if pivot==0:return None
    y=r/pivot;x=(rows[0][2]-rows[0][1]*y)/rows[0][0]
    return [x,y]
if __name__=='__main__':
    values=['1','1','1','1.000000000001'];rhs=['2','2.0000000000010001']
    reference=exact_solve(values,rhs);answer=solve(values,rhs)
    assert reference==[F(9999,10000),F(10001,10000)] and answer==[1,1]
    residual=[sum(F(values[2*i+j])*F.from_float(answer[j]) for j in range(2))-F(rhs[i]) for i in range(2)]
    assert max(map(abs,residual))==F(1,10**16)
    assert max(abs(F.from_float(v)-r) for v,r in zip(answer,reference))==F(1,10000)
    assert solve(['0','1','1','1'],['1','2'])==[1,1]
    assert exact_solve(['1','2','2','4'],['3','6']) is None
    print('reference',reference,'computed',answer,'exact intended residual',residual)
