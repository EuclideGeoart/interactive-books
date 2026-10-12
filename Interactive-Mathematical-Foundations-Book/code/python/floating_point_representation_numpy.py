"""NumPy native dtypes for ordinary inputs; BF16 remains explicitly software emulated."""
import numpy as np
from floating_point_representation import convert, exact
if __name__ == '__main__':
    for dtype, name in [(np.float64, 'binary64'), (np.float32, 'binary32'), (np.float16, 'fp16')]:
        a = np.array([0.1, -0.0, np.inf, np.nan], dtype=dtype)
        unsigned = {8: np.uint64, 4: np.uint32, 2: np.uint16}[a.dtype.itemsize]
        bits = a.view(unsigned)
        assert int(bits[0]) == convert('0.1', name)
        assert np.signbit(a[1]) and np.isinf(a[2]) and np.isnan(a[3])
        print(name, a, bits)
    print('BF16 software emulation:', exact(convert('0.1', 'bf16'), 'bf16'))
    # Decimal → low precision is handled by convert, not by a binary64 intermediate.
