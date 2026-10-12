"""Cartesian index dictionaries expose trailing-axis broadcasting without a tensor backend."""
from itertools import product
from math import prod
def indices(shape):
    assert len(shape)<=4 and all(0<=d<=4 for d in shape) and prod(shape)<=64
    return list(product(*(range(d) for d in shape)))
def broadcast(a_shape,b_shape,a_start=1,b_start=10):
    rank=max(len(a_shape),len(b_shape));left=(1,)*(rank-len(a_shape))+a_shape;right=(1,)*(rank-len(b_shape))+b_shape
    if any(a!=b and a!=1 and b!=1 for a,b in zip(left,right)):
        raise ValueError('incompatible trailing dimensions')
    shape=tuple(b if a==1 else a for a,b in zip(left,right))
    assert prod(shape)<=64
    a=dict(zip(indices(a_shape),range(a_start,a_start+prod(a_shape))))
    b=dict(zip(indices(b_shape),range(b_start,b_start+prod(b_shape))))
    result={}
    for index in indices(shape):
        ai=tuple(0 if d==1 else index[rank-len(a_shape)+i] for i,d in enumerate(a_shape))
        bi=tuple(0 if d==1 else index[rank-len(b_shape)+i] for i,d in enumerate(b_shape))
        result[index]=a[ai]+b[bi]
        print('output',index,'left',ai,a[ai],'right',bi,b[bi],'value',result[index])
    return shape,result
if __name__=='__main__':
    shape,result=broadcast((2,3),(3,))
    assert shape==(2,3) and list(result.values())==[11,13,15,14,16,18]
    assert [sum(value for (row,col),value in result.items() if row==r) for r in range(2)]==[39,48]
    try:broadcast((2,3),(2,))
    except ValueError:pass
    else:raise AssertionError('an incompatible trailing dimension was accepted')
    assert broadcast((0,3),(1,3))[1]=={}
