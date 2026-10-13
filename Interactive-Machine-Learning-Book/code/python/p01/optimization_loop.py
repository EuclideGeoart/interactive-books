"""III-05: reuse the frozen affine loss/gradient/update contract, without another optimizer."""
from copy import deepcopy
import json
from pipeline import reference

CANONICAL = deepcopy(reference.CANONICAL_REGRESSION)

def optimization_loop(state=CANONICAL, steps=3):
    # Every frame is a full state; both parameter changes use the same old gradient.
    return [dict(**frame, derived=reference.derive_regression(frame['state'])) for frame in reference.regression_trace(state, steps)]

if __name__ == '__main__':
    print(json.dumps(optimization_loop(), indent=2, allow_nan=False))
