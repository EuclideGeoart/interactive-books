"""Array token NLL from centered log-softmax; select contributing rows before summing."""
import numpy as np
VOCABULARY=('the','cat','sat','<eos>')
def mean_loss(logits,targets,ignored):
    z=np.asarray(logits,dtype=float);y=np.asarray(targets);mask=np.asarray(ignored)
    if z.ndim!=2 or z.shape[1]!=4 or not 1<=z.shape[0]<=4 or y.shape!=(z.shape[0],) or mask.shape!=y.shape or mask.dtype!=bool or not np.issubdtype(y.dtype,np.integer) or np.any((y<0)|(y>=4)) or np.any(np.isnan(z)) or np.any(z==np.inf) or np.any(np.isfinite(z)&(np.abs(z)>1000)):raise ValueError('Invalid token batch')
    maxima=z.max(axis=1,keepdims=True)
    if np.any(maxima==-np.inf):raise ValueError('All-excluded position')
    with np.errstate(over='ignore',under='ignore'):shifted=z-maxima;e=np.exp(shifted)
    logp=shifted-np.log(e.sum(axis=1,keepdims=True));losses=-logp[np.arange(y.size),y]
    used=losses[~mask];count=used.size
    return losses,count,float(used.sum()/count) if count else None
if __name__=='__main__':
    losses,count,mean=mean_loss([[0,0,0,0],[1000,0,-1000,-1000]],[2,3],[False,True])
    assert np.array_equal(losses,[np.log(4),2000]) and count==1 and mean==np.log(4)
    assert mean_loss([[0,0,0,0]],[0],[True])[2] is None
    print(losses,count,mean)
