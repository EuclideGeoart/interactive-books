"""Actual NumPy seeded generator replay is scoped to its named algorithm/version/state."""
import copy
import numpy as np
from reproducibility_seeds import generate
if __name__=='__main__':
    seed=42;rng=np.random.default_rng(seed)
    saved=copy.deepcopy(rng.bit_generator.state);samples=rng.random(6)
    # Explicitly seed a same-type generator, then restore the exact recorded state before drawing.
    replay=np.random.Generator(type(rng.bit_generator)(0));replay.bit_generator.state=saved
    np.testing.assert_array_equal(samples,replay.random(6))
    custom=np.array([float(row[3]) for row in generate(seed,6)])
    assert not np.array_equal(samples,custom)
    a,b,c=np.float64(1e16),np.float64(-1e16),np.float64(1)
    assert (a+b)+c==1 and a+(b+c)==0
    assert not np.isclose((a+b)+c,a+(b+c),rtol=1e-12,atol=1e-12)
    print('NumPy version',np.__version__,'algorithm',type(rng.bit_generator).__name__,'seed',seed,'state',saved,'samples',samples,'LCG samples',custom)
