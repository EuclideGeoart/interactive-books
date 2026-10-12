"""Explicit uint32 algorithm and recorded state; no unseeded source."""
from fractions import Fraction as F
def generate(state,count):
    assert type(state) is int and 0<=state<2**32 and 1<=count<=16
    output=[]
    for index in range(count):
        before=state;state=(1664525*state+1013904223)%2**32
        output.append((index,before,state,F(state,2**32)))
    return output
if __name__=='__main__':
    records=generate(42,6)
    assert [row[2] for row in records]==[1083814273,378494188,2479403867,955863294,1613448261,110225632]
    assert [r[2] for r in generate(records[1][2],4)]==[r[2] for r in records[2:]]
    assert records==generate(42,6)
    a,b,c=1e16,-1e16,1.;left=(a+b)+c;right=a+(b+c)
    assert left==1 and right==0 and F.from_float(a)+F.from_float(b)+F.from_float(c)==1
    budget=1e-12+1e-12*max(abs(left),abs(right))
    assert abs(left-right)>budget
    print('recorded state and sequence',records,'controlled associations',left,right,'budget',budget)
