"""Independent exact arithmetic: no imports from canonical code and no NumPy."""
from fractions import Fraction as F

def lcg_integer(seed, draw):
    # Closed-form affine recurrence, independent of the iterative canonical RNG.
    a,c,m = 1664525,1013904223,2**32
    return (pow(a,draw)*seed+c*sum(pow(a,k) for k in range(draw)))%m

def partition(samples,seed,groups):
    units = sorted({row['group'] if groups else row['id'] for row in samples},key=lambda s:s.encode('utf-16-be','surrogatepass'))
    order = list(units)
    for draw,i in enumerate(range(len(order)-1,0,-1),1):
        j = lcg_integer(seed,draw)*(i+1)//2**32
        order[i],order[j] = order[j],order[i]
    nt,nv = max(1,len(units)*3//5),max(1,len(units)//5)
    sets = [set(order[:nt]),set(order[nt:nt+nv]),set(order[nt+nv:])]
    assert not (sets[0]&sets[1] or sets[1]&sets[2] or sets[0]&sets[2])
    assert set.union(*sets) == set(units)
    return {row['id']:next(name for name,subset in zip(('train','validation','test'),sets) if (row['group'] if groups else row['id']) in subset)
            for row in sorted(samples,key=lambda r:r['id'].encode('utf-16-be','surrogatepass'))}

def mse(predictions,targets):
    assert len(predictions) == len(targets) > 0
    return sum((F(p)-F(y))**2 for p,y in zip(predictions,targets))/len(targets)

def baseline(targets):
    return sum(map(F,targets))/len(targets) if targets else None

def affine(rows,w,b):
    w,b = F(w),F(b)
    residual = [w*F(row['x'])+b-F(row['y']) for row in rows]
    n = len(rows)
    return dict(mse=sum(r*r for r in residual)/n,
                dw=2*sum(r*F(row['x']) for r,row in zip(residual,rows))/n,db=2*sum(residual)/n)

def polynomial(rows,degree):
    """Solve exact moment equations by elimination; unrelated to canonical QR."""
    if not rows or len({F(row['x']) for row in rows}) < degree+1:
        return None
    d = degree+1
    augmented = [[sum(F(row['x'])**(j+k) for row in rows) for k in range(d)]+
                 [sum(F(row['y'])*F(row['x'])**j for row in rows)] for j in range(d)]
    for j in range(d):
        pivot = next(k for k in range(j,d) if augmented[k][j])
        augmented[j],augmented[pivot] = augmented[pivot],augmented[j]
        scale = augmented[j][j]
        augmented[j] = [v/scale for v in augmented[j]]
        for k in range(d):
            if k != j:
                scale = augmented[k][j]
                augmented[k] = [a-scale*b for a,b in zip(augmented[k],augmented[j])]
    return [row[-1] for row in augmented]

def qr_rank_rejected(rows,degree):
    """Exact orthogonal projections without normalized square roots."""
    columns = [[F(row['x'])**j for row in rows] for j in range(degree+1)]
    cutoff_squared = F(1,10**24)*sum(v*v for col in columns for v in col)
    basis = []
    for column in columns:
        residual = column[:]
        for q in basis:
            factor = sum(a*b for a,b in zip(residual,q))/sum(a*a for a in q)
            residual = [a-factor*b for a,b in zip(residual,q)]
        if sum(a*a for a in residual) <= cutoff_squared:
            return True
        basis.append(residual)
    return False

def predict(x,coefficients):
    return sum(F(c)*F(x)**j for j,c in enumerate(coefficients))

def capacity_rows(seed,noise):
    noise = F(str(noise))
    rows = []
    for i in range(17):
        x = F(-1)+F(i,8)
        truth = 1+2*x-x*x
        perturb = noise*(lcg_integer(seed,i+1)*5//2**32-2)/2
        rows.append(dict(id=f'p{i+1}',x=x,y=truth+perturb))
    return rows

def self_test():
    assert [lcg_integer(42,k) for k in (1,2,3)] == [1083814273,378494188,2479403867]
    rows = [dict(x=x,y=y) for x,y in zip([-2,-1,0,1,2],[-3,-1,1,3,4])]
    before = affine(rows,F(1,2),0)
    assert before == dict(mse=F(41,10),dw=F(-26,5),db=F(-8,5))
    w,b = F(1,2)-F(1,10)*before['dw'],-F(1,10)*before['db']
    assert (w,b) == (F(51,50),F(4,25))
    assert affine(rows,w,b)['mse'] == F(2133,1250)
    assert baseline([1,3,5]) == 3 and mse([3,3,3],[1,3,5]) == F(8,3)
    exact = polynomial([dict(x=x,y=1+2*x-x*x) for x in (-1,0,1)],2)
    assert exact == [1,2,-1]
    near = [dict(x=x,y=2*x+1) for x in (.5-1.3e-12,.5,.5+1.3e-12)]
    assert qr_rank_rejected(near,1)
    assert mse([9],[9]) == 0 and mse([6],[9]) == 9
    assert mse([0],[9]) == 81 and mse([3],[9]) == 36

if __name__ == '__main__':
    self_test()
    print('arithmetic oracle: 9 literal assertions passed')
