import numpy as np
if __name__=='__main__':
    a=np.arange(1,7).reshape(2,3);b=np.arange(10,13)
    result=a+b
    np.testing.assert_array_equal(result,[[11,13,15],[14,16,18]])
    np.testing.assert_array_equal(result.sum(axis=1),[39,48])
    np.testing.assert_array_equal(result.sum(axis=0),[25,29,33])
    assert result.sum()==87
    batched=np.arange(1,7).reshape(2,1,3)+np.arange(10,14).reshape(1,4,1)
    assert batched.shape==(2,4,3)
    np.testing.assert_array_equal(batched.sum(axis=-1),[[36,39,42,45],[45,48,51,54]])
    empty=np.empty((0,3),dtype=np.int64)+np.arange(3).reshape(1,3)
    np.testing.assert_array_equal(empty.sum(axis=0),[0,0,0])
    try:a+np.arange(2)
    except ValueError:pass
    else:raise AssertionError('invalid pair broadcasted')
    print('matrix output',result,'batch shape',batched.shape,'empty shape',empty.shape)
