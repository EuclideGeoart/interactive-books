import numpy as np
from floating_point_representation import convert,exact
if __name__ == '__main__':
    with np.errstate(over='ignore',under='ignore',invalid='ignore'):
        for dtype in (np.float16,np.float32,np.float64):
            values=np.array(['1e-7','1e-50','1e40','0','-0'],dtype=dtype)
            print(dtype.__name__,values,'finite',np.isfinite(values),'zero',values==0,'sign',np.signbit(values))
        assert np.float16('1e-50')==0 and np.isinf(np.float32('1e40'))
        assert np.float64('1e-50')!=0 and np.isfinite(np.float64('1e40'))
    print('BF16 emulated:',exact(convert('1e-50','bf16'),'bf16'))
