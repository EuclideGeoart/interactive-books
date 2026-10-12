import numpy as np
from math import fsum
from decimal import Decimal,localcontext
if __name__ == '__main__':
    a=np.array([3e200,4e200]);m=np.max(np.abs(a))
    with np.errstate(over='ignore',under='ignore',invalid='ignore'):
        naive=np.sqrt(np.sum(a*a));scaled=m*np.sqrt(np.sum((a/m)**2))
        assert np.isinf(naive) and np.isfinite(scaled)
        x=np.array([1e-16,-1e-16]);assert np.all(np.log1p(x)!=0)
        z=np.array([1000.,1001.,999.]);shifted=z-z.max();weights=np.exp(shifted);p=weights/weights.sum();lp=shifted-np.log(weights.sum())
        assert abs(p.sum()-1)<1e-15
        g=np.float16(1e-8);scaled_g=np.float16(1e-8*2**16)
        assert g==0 and scaled_g!=0
    with localcontext() as ctx:
        ctx.prec=100
        for value,result in zip(x,np.log1p(x)):
            v=Decimal.from_float(float(value));reference=(1+v).ln()
            assert abs(Decimal.from_float(float(result))/reference-1)<Decimal('1e-15')
    print('norm',scaled,'compensated stdlib sum',fsum([1e16,1.,-1e16]),'probabilities',p,'logs',lp,'actual NumPy FP16 scaled/unscaled',scaled_g,float(scaled_g)/2**16)
