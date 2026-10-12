"""NumPy binary64 multiplication versus log-space accumulation; zeros stay impossible."""
import numpy as np
def product(probabilities, repeat=1):
    p = np.asarray(probabilities, dtype=float)
    if p.ndim != 1 or not 1 <= p.size <= 6 or not np.all(np.isfinite(p)) or np.any((p<0)|(p>1)) or type(repeat) is not int or not 1<=repeat<=1200:
        raise ValueError('Finite probabilities in [0,1]; bounded repetition')
    with np.errstate(divide='ignore', under='ignore'):
        return float(np.prod(np.tile(p,repeat))), float(repeat*np.log(p).sum())
if __name__ == '__main__':
    assert np.isclose(product([.5,.25,.8])[0],.1)
    direct,ll=product([.5,.5,.5],400)
    assert direct==0 and np.isfinite(ll)
    assert product([0,.5])[1]==-np.inf
    print(product([.5,.25,.8]))
