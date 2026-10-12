"""Bounded COO aggregation and actual CSR matvec; exact reference values use Fraction."""
from fractions import Fraction as F
def sparse(rows,cols,entries,vector):
    assert 1<=rows<=3 and 1<=cols<=3 and len(vector)==cols and len(entries)<=18
    coordinates={}
    for row,col,value in entries:
        assert 0<=row<rows and 0<=col<cols
        coordinates[row,col]=coordinates.get((row,col),F(0))+F(str(value))
    canonical=[(row,col,value) for (row,col),value in sorted(coordinates.items()) if value]
    data=[];indices=[];indptr=[0]
    for row in range(rows):
        for r,col,value in canonical:
            if r==row:data.append(value);indices.append(col)
        indptr.append(len(data))
    result=[]
    for row in range(rows):
        accumulator=F(0)
        for position in range(indptr[row],indptr[row+1]):
            term=data[position]*F(str(vector[indices[position]]))
            accumulator+=term
            print('row',row,'column',indices[position],'product',term,'accumulator',accumulator)
        result.append(accumulator)
    return canonical,data,indices,indptr,result
if __name__=='__main__':
    c,data,indices,ptr,result=sparse(3,3,[(0,0,'2'),(0,0,'-2'),(1,2,'3'),(2,2,'0')],[1,2,3])
    assert c==[(1,2,F(3))] and ptr==[0,0,1,1] and result==[0,9,0]
    assert sparse(3,3,[],[1,2,3])[-1]==[0,0,0]
    assert 8*3*3==72 and 16*3==48 and 12*3+4*4==52
    print('CSR',data,indices,ptr,'result',result)
