from decimal import Decimal, localcontext
from fractions import Fraction
from math import exp,expm1,fsum,hypot,log,log1p,sqrt
from floating_point_representation import convert,exact
if __name__ == '__main__':
    x,y=3e200,4e200;m=max(abs(x),abs(y))
    scaled=m*sqrt((x/m)**2+(y/m)**2)
    assert abs(scaled/5e200-1)<1e-15
    assert x*x==float('inf')
    values=[1e16,1.,-1e16]
    naive_sum=0.0
    for value in values:naive_sum+=value
    assert naive_sum==0 and fsum(values)==1
    assert log(1+1e-16)==0 and log1p(1e-16)>0
    assert exp(1e-16)-1==0 and expm1(1e-16)>0
    z=[1000.,1001.,999.];maximum=max(z);weights=[exp(v-maximum) for v in z];total=fsum(weights)
    probabilities=[v/total for v in weights];logs=[v-maximum-log(total) for v in z]
    assert abs(fsum(probabilities)-1)<1e-15
    with localcontext() as ctx:
        ctx.prec=100;x=Decimal('1e-16')
        assert abs(Decimal.from_float(log1p(float(x)))/(1+x).ln()-1)<Decimal('1e-15')
        assert abs(Decimal.from_float(expm1(float(x)))/(x.exp()-1)-1)<Decimal('1e-15')
    gradient=Fraction('1e-8');scale=2**16
    direct=exact(convert('1e-8','fp16'),'fp16')
    scaled_input=gradient*scale
    scaled_text=str(Decimal(scaled_input.numerator)/Decimal(scaled_input.denominator))
    stored=exact(convert(scaled_text,'fp16'),'fp16')
    assert direct==0 and stored>0
    assert convert('655360000','fp16')==0x7c00
    print('norm',scaled,'sum',fsum(values),'probabilities',probabilities,'log probabilities',logs,'emulated scaled gradient',stored/scale)
