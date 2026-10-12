"""Exact intended range probes; all four conversions are software emulated."""
from fractions import Fraction
from floating_point_representation import FORMATS,convert,exact
if __name__ == '__main__':
    for text in ['1', '1e-7', '1e-50', '1e40', '1e400', '0', '-0']:
        for name,(e,p,b) in FORMATS.items():
            bits=convert(text,name);exp=(bits>>p)&(2**e-1);fraction=bits%(2**p)
            kind='infinity' if exp==2**e-1 else 'normal' if exp else 'subnormal' if fraction else 'zero'
            print(text,name,kind,exact(bits,name))
    assert convert('65520','fp16')==0x7c00
    assert convert('0.0000000298023223876953125','fp16')==0
    assert exact(convert('0.000000059604644775390625','fp16'),'fp16')==Fraction(1,2**24)
