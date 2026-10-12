"""Exact sources and direction-sensitive KL; preserve signed contribution terms."""
from fractions import Fraction as F
from math import log,inf,fsum
def kl(p,q,unit='nats'):
    p=[F(str(x)) for x in p];q=[F(str(x)) for x in q]
    if not 1<=len(p)<=6 or len(p)!=len(q) or any(x<0 for x in p+q) or sum(p)!=1 or sum(q)!=1 or unit not in ('bits','nats'):raise ValueError('Same support; normalized distributions')
    terms=[]
    for a,b in zip(p,q):
        if not a:terms.append(0.0)
        elif not b:terms.append(inf)
        else:
            ratio=a/b
            terms.append(float(a)*(log(ratio.numerator)-log(ratio.denominator))/(log(2) if unit=='bits' else 1))
    return terms,fsum(terms)
if __name__=='__main__':
    assert kl([1,0],['1/2','1/2'],'bits')[1]==1
    assert kl(['1/2','1/2'],[1,0],'bits')[1]==inf
    assert kl(['1/2','1/2'],['1/2','1/2'])[1]==0
    print(kl(['1/2','1/4','1/4'],['1/4','1/2','1/4']))
