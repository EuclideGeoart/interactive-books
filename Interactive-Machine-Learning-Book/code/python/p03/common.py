"""Part III boundary checks. Numbers are quantities, never bools or numeric strings."""
import math
import numpy as np

def number(value, name, lower=None, upper=None, integer=False):
    try:
        valid = isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))
    except (OverflowError, TypeError):
        valid = False
    normalized = float(value) if valid else 0
    if not valid or (lower is not None and normalized < lower) or (upper is not None and normalized > upper) or (integer and normalized != math.floor(normalized)):
        raise ValueError(f"{name} must be a finite {'integer' if integer else 'number'} in its supported range.")
    return int(normalized) if integer else normalized

def power_for(metric, p):
    number(p, "Minkowski power", 1, 8)
    if metric not in ("L1", "L2", "Lp"):
        raise ValueError("Choose L1, L2 or Lp.")
    return 1 if metric == "L1" else 2 if metric == "L2" else p

_UNIT_SCALES = object()

def distance(a, b, metric="L2", p=2, scales=_UNIT_SCALES):
    """Column-vector norm; rescale before powers. Scales carry the feature units."""
    if not isinstance(a, (list, tuple)) or not isinstance(b, (list, tuple)) or not 1 <= len(a) <= 32 or len(a) != len(b):
        raise ValueError("Distance needs matching vectors of 1 to 32 components.")
    if scales is not _UNIT_SCALES and (not isinstance(scales, (list, tuple)) or len(scales) != len(a)):
        raise ValueError("Distance needs a matching scale vector.")
    q = power_for(metric, p)
    differences = []
    for j, (left, right) in enumerate(zip(a, b)):
        left = number(left, "First component"); right = number(right, "Second component")
        scale = 1 if scales is _UNIT_SCALES else number(scales[j], "Scale")
        if scale <= 0:
            raise ValueError("Scales must be positive.")
        delta = number(left-right, "Coordinate difference")
        differences.append(number(abs(delta)/scale, "Scaled difference"))
    column = np.asarray(differences, dtype=np.float64).reshape(-1, 1)
    largest = float(np.max(column))
    if largest == 0:
        return 0.0
    result = largest * float(np.sum((column/largest)**q))**(1/q)
    return float(number(result, "Distance arithmetic"))

def id_key(value):
    return value.encode("utf-16-be", errors="surrogatepass")

def lcg(seed):
    number(seed, "Seed", 0, 2**32-1, True)
    state = int(seed)
    while True:
        state = (1664525*state+1013904223) % 2**32
        yield state/2**32
