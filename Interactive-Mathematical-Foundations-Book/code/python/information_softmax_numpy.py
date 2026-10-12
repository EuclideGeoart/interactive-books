"""NumPy score normalization with max-shifting and declared input policies."""
import numpy as np
def softmax(logits):
    z=np.asarray(logits,dtype=float)
    if z.ndim!=1 or not 1<=z.size<=6 or np.any(np.isnan(z)) or np.any(z==np.inf):raise ValueError('Invalid logits')
    if np.all(z==-np.inf):raise ValueError('All excluded: normalization undefined')
    with np.errstate(under='ignore',over='ignore'):e=np.exp(z-z.max())
    return e,float(e.sum()),e/e.sum()
if __name__=='__main__':
    assert np.array_equal(softmax([0,0])[2],[.5,.5])
    assert np.allclose(softmax([1,2,3])[2],softmax([1001,1002,1003])[2])
    print(softmax([2,1,0]))
