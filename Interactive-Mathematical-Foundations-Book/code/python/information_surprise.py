"""Surprise: the negative log of one exact event probability."""
from fractions import Fraction
from math import log, inf
def surprise(p, unit='nats'):
    p=Fraction(str(p))
    if p<0 or p>1 or unit not in ('nats','bits'): raise ValueError('Probability in [0,1]; nats or bits')
    if p==0:return inf
    return (log(p.denominator)-log(p.numerator))/(log(2) if unit=='bits' else 1)
if __name__=='__main__':
    assert surprise('1/4','bits')==2
    assert surprise(1)==0 and surprise(0)==inf
    print(surprise('1/4'),surprise('1/4','bits'))
