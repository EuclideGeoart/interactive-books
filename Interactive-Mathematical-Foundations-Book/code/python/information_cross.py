"""P weights the observations; Q supplies their predicted probabilities."""
from fractions import Fraction as F
from math import log, inf, fsum
def cross_entropy(p,q,unit='nats'):
    p=[F(str(x)) for x in p];q=[F(str(x)) for x in q]
    if not 1<=len(p)<=6 or len(p)!=len(q) or any(x<0 for x in p+q) or sum(p)!=1 or sum(q)!=1 or unit not in ('bits','nats'):raise ValueError('Same support; normalized distributions')
    scale=log(2) if unit=='bits' else 1
    terms=[0.0 if not a else inf if not b else -float(a)*(log(b.numerator)-log(b.denominator))/scale for a,b in zip(p,q)]
    return terms,fsum(terms)
if __name__=='__main__':
    assert cross_entropy([0,1,0],['1/2','1/4','1/4'],'bits')[1]==2
    assert cross_entropy([1,0],[0,1])[1]==inf
    assert cross_entropy([1,0],[1,0])[1]==0
    print(cross_entropy(['1/2','1/2'],['1/4','3/4']))
