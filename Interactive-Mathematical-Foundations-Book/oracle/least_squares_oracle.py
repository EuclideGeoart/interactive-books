"""Independent Fraction normal equations; browser uses Gram–Schmidt projection first."""
from fractions import Fraction as F
from pathlib import Path
from elimination_oracle import solve
import json
import random
import sys
FIXTURE=Path(__file__).resolve().parents[1]/'fixtures/least_squares.fixtures.json'
def fit(a,b):
    a=[[F(str(x)) for x in row] for row in a];b=[F(str(x)) for x in b]
    m,n=len(a),len(a[0])
    gram=[[sum(a[k][i]*a[k][j] for k in range(m)) for j in range(n)] for i in range(n)]
    rhs=[sum(a[k][i]*b[k] for k in range(m)) for i in range(n)]
    result=solve(gram,rhs)
    x=[F(v) for v in result['particular']]
    projection=[sum(c*v for c,v in zip(row,x)) for row in a]
    residual=[v-p for v,p in zip(b,projection)]
    assert all(sum(a[k][j]*residual[k] for k in range(m))==0 for j in range(n))
    return dict(rank=result['rank'],unique=result['rank']==n,x=list(map(str,x)),nullspace=result['nullspace'],projected=list(map(str,projection)),residual=list(map(str,residual)),objective=str(sum(r*r for r in residual)))
def cases():
    inputs=[([[1,-1],[1,0],[1,1]],[0,2,2]),([[1,-1],[1,0],[1,1]],[0,1,2]),([[1,1],[1,1],[1,1]],[0,2,2]),([[1,1],[1,0]],[2,1]),([[1,2],[1,2]],[0,2]),([[0,1],[0,0]],[0,2]),([[0,0],[0,0]],[1,2]),([[1,1],[1,1.01],[1,1.02]],[0,2,2])]
    rng=random.Random(618)
    for _ in range(40):
        m,n=rng.randint(2,4),rng.randint(1,3)
        inputs.append(([[rng.randint(-8,8)/4 for _ in range(n)] for _ in range(m)],[rng.randint(-4,4) for _ in range(m)]))
    return [dict(a=a,b=b,expected=fit(a,b)) for a,b in inputs]
def main():
    text=json.dumps(dict(method='Fraction normal equations + literal residual orthogonality; not TS-generated',cases=cases()),indent=2)+'\n'
    if '--check' in sys.argv:
        if not FIXTURE.exists() or FIXTURE.read_text()!=text:raise SystemExit('least_squares fixture stale')
        print('least squares: 48 exact projection/minimizer cases fresh')
    else:FIXTURE.write_text(text)
if __name__=='__main__':main()
