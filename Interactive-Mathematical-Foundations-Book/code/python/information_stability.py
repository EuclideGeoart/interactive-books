"""Expose every stable stage; retain centered log-softmax corrections."""
from math import exp,log,fsum,isfinite,inf
def pipeline(logits):
    if not 1<=len(logits)<=6 or any(not isfinite(z) and z!=-inf for z in logits):raise ValueError('Invalid logits')
    m=max(logits)
    if m==-inf:raise ValueError('All −infinity: no normalizable mass')
    shifted=[z-m for z in logits]
    exponentials=[exp(z) for z in shifted]
    denominator=fsum(exponentials);correction=log(denominator)
    log_probabilities=[z-correction for z in shifted]
    probabilities=[e/denominator for e in exponentials]
    return dict(max=m,shifted=shifted,exponentials=exponentials,denominator=denominator,logsumexp=m+correction,log_probabilities=log_probabilities,probabilities=probabilities)
if __name__=='__main__':
    d=pipeline([1000,0,-1000]);assert d['log_probabilities']==[0,-1000,-2000]
    assert d['probabilities']==[1,0,0]
    assert pipeline([1e308,1e308])['log_probabilities']==[-log(2),-log(2)]
    assert pipeline([0,-inf])['log_probabilities']==[0,-inf]
    print(pipeline([1000,0,-1000]))
