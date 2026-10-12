"""Scores become positive exponentials and then normalized probabilities."""
from math import exp,fsum,isfinite,inf
def softmax(logits):
    if not 1<=len(logits)<=6 or any(not isfinite(z) and z!=-inf for z in logits):raise ValueError('Finite scores or explicit −infinity')
    m=max(logits)
    if m==-inf:raise ValueError('All excluded: normalization undefined')
    exponentials=[exp(z-m) for z in logits]
    denominator=fsum(exponentials)
    return exponentials,denominator,[e/denominator for e in exponentials]
if __name__=='__main__':
    assert softmax([0,0])[2]==[.5,.5]
    assert softmax([1,2,3])[2]==softmax([101,102,103])[2]
    assert softmax([1000,0,-1000])[2]==[1,0,0]
    print(softmax([2,1,0]))
