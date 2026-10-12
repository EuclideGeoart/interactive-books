"""Exact normalization, then an explicit expected-surprise sum."""
from fractions import Fraction
from math import log, fsum
def entropy(weights,unit='nats'):
    if not 1<=len(weights)<=6 or any(type(w) is not int or not 0<=w<=1000000 for w in weights) or sum(weights)==0 or unit not in ('nats','bits'):
        raise ValueError('Nonnegative integer weights with positive total; nats or bits')
    masses=[Fraction(w,sum(weights)) for w in weights]
    terms=[0.0 if not p else float(p)*(log(p.denominator)-log(p.numerator))/(log(2) if unit=='bits' else 1) for p in masses]
    return masses,terms,fsum(terms)
if __name__=='__main__':
    assert entropy([1,0,0],'bits')[2]==0
    assert entropy([2,1,1],'bits')[2]==1.5
    assert entropy([1,1],'bits')[2]==1
    print(entropy([2,1,1],'bits'))
