"""Normalize weights openly; mask zeros before logarithms, never 0 × infinity."""
import numpy as np
def entropy(weights,unit='nats'):
    w=np.asarray(weights,dtype=float)
    if w.ndim!=1 or not 1<=w.size<=6 or not np.all(np.isfinite(w)) or np.any((w<0)|(w>1000000)|(w!=np.floor(w))) or w.sum()==0 or unit not in ('nats','bits'):raise ValueError('Invalid weights or unit')
    p=w/w.sum();positive=p>0;terms=np.zeros_like(p)
    terms[positive]=-p[positive]*np.log(p[positive])/(np.log(2) if unit=='bits' else 1)
    return p,terms,float(terms.sum())
if __name__=='__main__':
    assert entropy([1,0,0],'bits')[2]==0
    assert entropy([2,1,1],'bits')[2]==1.5
    print(entropy([2,1,1],'bits'))
