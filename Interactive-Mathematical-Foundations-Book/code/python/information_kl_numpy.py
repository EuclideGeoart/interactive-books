"""NumPy KL without ever evaluating zero divided by zero."""
import numpy as np
def kl(p,q,unit='nats'):
    p=np.asarray(p,dtype=float);q=np.asarray(q,dtype=float)
    if p.ndim!=1 or not 1<=p.size<=6 or p.shape!=q.shape or not np.all(np.isfinite(p)) or not np.all(np.isfinite(q)) or np.any(p<0) or np.any(q<0) or abs(p.sum()-1)>1e-12 or abs(q.sum()-1)>1e-12 or unit not in ('bits','nats'):raise ValueError('Normalized finite distributions')
    terms=np.zeros_like(p);positive=p>0
    with np.errstate(divide='ignore'):terms[positive]=p[positive]*(np.log(p[positive])-np.log(q[positive]))/(np.log(2) if unit=='bits' else 1)
    return terms,float(terms.sum())
if __name__=='__main__':
    assert kl([1,0],[.5,.5],'bits')[1]==1
    assert kl([.5,.5],[1,0])[1]==np.inf
    assert kl([.5,.5],[.5,.5])[1]==0
    print(kl([.5,.25,.25],[.25,.5,.25]))
