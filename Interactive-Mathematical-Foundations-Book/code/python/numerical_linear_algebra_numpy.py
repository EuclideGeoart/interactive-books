import numpy as np
from fractions import Fraction as F
from numerical_linear_algebra import exact_solve
if __name__=='__main__':
    text=['1','1','1','1.000000000001'];rhs=['2','2.0000000000010001']
    a=np.array(text,dtype=np.float64).reshape(2,2);b=np.array(rhs,dtype=np.float64)
    answer=np.linalg.solve(a,b);inverse_answer=np.linalg.inv(a)@b;reference=exact_solve(text,rhs)
    residual=np.linalg.norm(a@answer-b,ord=np.inf)
    forward=max(abs(F.from_float(float(v))-r) for v,r in zip(answer,reference))
    assert residual==0 and forward==F(1,10000)
    well=np.array([[3.,1.],[1.,2.]]);well_b=np.array([4.,3.])
    np.testing.assert_allclose(np.linalg.solve(well,well_b),[1.,1.],rtol=0,atol=4*np.finfo(float).eps)
    assert np.linalg.matrix_rank(np.array([[1.,2.],[2.,4.]]))==1
    print('solve',answer,'explicit inverse',inverse_answer,'stored residual',residual,'intended forward error',forward,'stored-array condition',np.linalg.cond(a,np.inf))
