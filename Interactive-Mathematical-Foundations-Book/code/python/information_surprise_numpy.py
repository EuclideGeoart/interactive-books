"""Array surprise in nats or bits, with an explicit infinite boundary."""
import numpy as np
def surprise(p,unit='nats'):
    p=np.asarray(p,dtype=float)
    if not np.all(np.isfinite(p)) or np.any((p<0)|(p>1)) or unit not in ('nats','bits'):raise ValueError('Invalid probability or unit')
    with np.errstate(divide='ignore'):return -np.log(p)/(np.log(2) if unit=='bits' else 1)
if __name__=='__main__':
    assert np.array_equal(surprise([.25,1,0],'bits'),[2,0,np.inf])
    print(surprise([.25,1,0]))
