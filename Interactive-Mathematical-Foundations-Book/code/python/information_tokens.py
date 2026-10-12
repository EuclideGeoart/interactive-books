"""Four supplied vocabulary logits per position; explicit observed target and ignore mask."""
from math import exp,log,fsum,isfinite,inf
VOCABULARY=('the','cat','sat','<eos>')
def mean_loss(positions):
    if not 1<=len(positions)<=4:raise ValueError('Use 1–4 positions')
    losses=[];contributing=[]
    for logits,target,ignored in positions:
        if len(logits)!=4 or type(target) is not int or not 0<=target<4 or type(ignored) is not bool or any((not isfinite(z) and z!=-inf) or (isfinite(z) and abs(z)>1000) for z in logits):raise ValueError('Invalid position')
        m=max(logits)
        if m==-inf:raise ValueError('No normalizable scores')
        shifted=[z-m for z in logits]
        log_denominator=log(fsum(exp(z) for z in shifted))
        loss=log_denominator-shifted[target]
        losses.append(loss)
        if not ignored:contributing.append(loss)
    count=len(contributing);total=fsum(contributing)
    return losses,count,total/count if count else None
if __name__=='__main__':
    p=[([0,0,0,0],2,False),([1000,0,-1000,-1000],3,True)]
    assert mean_loss(p)==([log(4),2000],1,log(4))
    assert mean_loss([(z,y,True) for z,y,_ in p])[2] is None
    print(mean_loss(p))
