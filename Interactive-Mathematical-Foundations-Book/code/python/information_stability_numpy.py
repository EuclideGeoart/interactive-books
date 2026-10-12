"""Stable logsumexp and logsoftmax; logs do not take log of rounded probabilities."""
import numpy as np
def pipeline(logits):
    z=np.asarray(logits,dtype=float)
    if z.ndim!=1 or not 1<=z.size<=6 or np.any(np.isnan(z)) or np.any(z==np.inf):raise ValueError('Invalid logits')
    m=z.max()
    if m==-np.inf:raise ValueError('All excluded: normalization undefined')
    with np.errstate(over='ignore',under='ignore'):shifted=z-m;e=np.exp(shifted)
    denominator=e.sum();correction=np.log(denominator)
    return m+correction,shifted-correction,e/denominator
if __name__=='__main__':
    lse,lp,p=pipeline([1000,0,-1000]);assert np.array_equal(lp,[0,-1000,-2000]);assert np.array_equal(p,[1,0,0])
    assert np.array_equal(pipeline([1e308,1e308])[1],[-np.log(2),-np.log(2)])
    print(pipeline([1000,0,-1000]))
