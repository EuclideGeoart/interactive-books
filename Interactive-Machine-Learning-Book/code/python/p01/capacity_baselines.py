"""III-06: one active split, polynomial capacity and a training-only mean baseline."""
from copy import deepcopy
import json
import math
import numpy as np
from seed import lcg
from numeric import is_finite_number
from split_generalization import assign_split, derive_split, seed_split, PARTITIONS

CAPACITY_CANONICAL = dict(seed=42, degree=2, noise=.5, splitSeed=42, source='interleaved')
RANK_THRESHOLD = 1e-12
RANK_REASON = 'The polynomial design is numerically rank deficient: a reorthogonalized QR column norm is ≤ 1e−12 times the design Frobenius norm.'

def observations(state):
    if type(state['degree']) is not int or not 0 <= state['degree'] <= 8 or not is_finite_number(state['noise']) or not 0 <= state['noise'] <= 2:
        raise ValueError('Integer degree 0–8 and finite noise 0–2 are required')
    random = lcg(state['seed'])
    rows = []
    for i in range(17):
        x = -1+i/8
        truth = 1+2*x-x*x
        noise = state['noise']*(int(next(random)*5)-2)/2
        rows.append(dict(id=f'p{i+1}', group=f'p{i+1}', x=x, y=truth+noise, truth=truth))
    return rows

def capacity_split(state):
    samples = observations(state)
    source = state.get('source','interleaved')
    if source not in ('interleaved','seeded','manual','distribution-shift'):
        raise ValueError('Unknown capacity assignment provenance')
    split = dict(samples=samples, seed=state.get('splitSeed',42), keepGroups=False,
                 assignments=state.get('assignments', {row['id']:'train' if i%2 == 0 else 'validation' for i,row in enumerate(samples)}),
                 source='manual' if source == 'interleaved' else source)
    derive_split(split)
    return split

def capacity_data(state):
    split = capacity_split(state)
    return [dict(id=row['id'],x=row['x'],y=row['y'],truth=row['truth'],partition=split['assignments'][row['id']]) for row in observations(state)]

def assign_capacity(state, identifier, partition):
    split = assign_split(capacity_split(state),identifier,partition)
    return {**deepcopy(state),'assignments':split['assignments'],'source':'manual'}

def preset_capacity_split(state, source, split_seed=None):
    if source not in ('interleaved','seeded','distribution-shift'):
        raise ValueError('Unknown assignment preset')
    split_seed = state.get('splitSeed',42) if split_seed is None else split_seed
    if type(split_seed) is not int or not 0 <= split_seed <= 0xffffffff:
        raise ValueError('Unsigned split seed required')
    samples = observations(state)
    assignments = seed_split(samples,split_seed,False)['assignments'] if source == 'seeded' else {
        row['id']:('train' if i%2 == 0 else 'validation') if source == 'interleaved' else 'train' if row['x'] <= 0 else 'validation' if row['x'] <= .5 else 'test'
        for i,row in enumerate(samples)}
    result = {**deepcopy(state),'assignments':assignments,'source':source,'splitSeed':split_seed}
    capacity_split(result)
    return result

def polynomial_prediction(x, coefficients):
    if not coefficients or len(coefficients) > 9 or not is_finite_number(x) or not all(is_finite_number(value) for value in coefficients):
        raise ValueError('Finite input and 1–9 coefficients required')
    value = 0.0
    for coefficient in reversed(coefficients):
        value = value*x+coefficient
        if not math.isfinite(value):
            raise ValueError('Polynomial evaluation overflowed')
    return value

def fit_capacity(samples, degree):
    if type(degree) is not int or not 0 <= degree <= 8 or len(samples) > 64 or any(not is_finite_number(row['x']) or not is_finite_number(row['y']) or abs(row['x']) > 1 or abs(row['y']) > 10 for row in samples):
        raise ValueError('Invalid bounded polynomial data or degree')
    if len({row['id'] for row in samples}) != len(samples) or any(not isinstance(row['id'],str) or not row['id'].strip() for row in samples):
        raise ValueError('Unique nonempty sample IDs required')
    if not samples:
        return dict(coefficients=None, reason='The training set is empty: coefficients and baseline are undefined.')
    d = degree+1
    if len({row['x'] for row in samples}) < d:
        return dict(coefficients=None,reason='Too few distinct training inputs for a unique polynomial coefficient vector.')
    # NumPy holds the column matrix; the same explicit reorthogonalized QR policy runs in the browser.
    X = np.vander(np.array([row['x'] for row in samples]), N=d, increasing=True)
    y = np.array([[row['y']] for row in samples],dtype=np.float64)
    cutoff = RANK_THRESHOLD*math.hypot(*X.T.flat)
    Q, R = [], np.zeros((d,d),dtype=np.float64)
    for j in range(d):
        v = X[:,j].copy()
        for _ in range(2):
            for k in range(j):
                projection = sum(float(Q[k][i])*float(v[i]) for i in range(len(samples)))
                R[k,j] += projection
                for i in range(len(samples)):
                    v[i] -= projection*Q[k][i]
        norm = math.hypot(*v)
        if not math.isfinite(norm) or norm <= cutoff:
            return dict(coefficients=None,reason=RANK_REASON)
        R[j,j] = norm
        Q.append(v/norm)
    projected = [sum(float(column[i])*float(y[i,0]) for i in range(len(samples))) for column in Q]
    coefficients = np.zeros(d,dtype=np.float64)
    for j in range(d-1,-1,-1):
        value = projected[j]
        for k in range(j+1,d):
            value -= R[j,k]*coefficients[k]
        coefficients[j] = value/R[j,j]
    if not np.isfinite(coefficients).all():
        raise ValueError('Polynomial fit is non-finite')
    return dict(coefficients=coefficients.tolist(),reason=None)

def derive_capacity(state):
    samples = capacity_data(state)
    split = derive_split(capacity_split(state))
    training = [row for row in samples if row['partition'] == 'train']
    fit, mean = fit_capacity(training,state['degree']), split['baselineMean']
    rows = []
    for row in samples:
        prediction = polynomial_prediction(row['x'],fit['coefficients']) if fit['coefficients'] is not None else None
        rows.append(dict(**row,prediction=prediction,residual=None if prediction is None else prediction-row['y'],
                         squaredError=None if prediction is None else (prediction-row['y'])**2,baseline=mean,
                         baselineSquaredError=None if mean is None else (mean-row['y'])**2))
    errors = []
    for partition in PARTITIONS:
        data = [row for row in rows if row['partition'] == partition]
        errors.append(dict(partition=partition,count=len(data),
                           mse=float(np.mean([row['squaredError'] for row in data])) if fit['coefficients'] is not None and data else None,
                           baselineMSE=float(np.mean([row['baselineSquaredError'] for row in data])) if mean is not None and data else None,
                           reason=f'No {partition} samples: MSE is undefined.' if not data else fit['reason']))
    curve = [dict(x=-1+i/40,prediction=polynomial_prediction(-1+i/40,fit['coefficients']) if fit['coefficients'] is not None else None,
                  truth=1+2*(-1+i/40)-(-1+i/40)**2,baseline=mean) for i in range(81)]
    provenance = f"Hand-authored x grid and quadratic signal; bounded synthetic noise uses seed {state['seed']}. Assignments: {state.get('source','interleaved')}. Interleaved reset trains even grid indices (p1, p3, …); validates odd indices (p2, p4, …). Split seed {state.get('splitSeed',42)} is used only by seeded repartitioning."
    return dict(state=deepcopy(state),samples=samples,rows=rows,coefficients=fit['coefficients'],reason=fit['reason'],baselineMean=mean,errors=errors,curve=curve,
                trainingIds=[row['id'] for row in training],split=split,
                shapes=dict(X=[len(training),state['degree']+1],weights=[state['degree']+1,1],targets=[len(training),1]),provenance=provenance)

def capacity_candidates(state):
    candidates = []
    for degree in range(9):
        result = derive_capacity({**deepcopy(state),'degree':degree})
        candidates.append(dict(degree=degree,trainingMSE=result['errors'][0]['mse'],validationMSE=result['errors'][1]['mse']))
    finite = [row for row in candidates if row['validationMSE'] is not None]
    best = finite[0] if finite else None
    for row in finite[1:]:
        if row['validationMSE'] < best['validationMSE']-1e-12:
            best = row
    return dict(candidates=candidates,selectedDegree=None if best is None else best['degree'],
                reason=None if best else 'No defined validation losses: capacity selection is undefined.')

def capacity_trace(state):
    active = derive_capacity(state)
    return [dict(index=i,state={**deepcopy(state),'degree':degree},
                 explanation=f"Degree {degree}: fit only training IDs {', '.join(active['trainingIds']) or '(empty)'}; preserve the displayed observations and memberships.")
            for i,degree in enumerate((0,2,8))]

if __name__ == '__main__':
    print(json.dumps(dict(fit=derive_capacity(CAPACITY_CANONICAL),selection=capacity_candidates(CAPACITY_CANONICAL)),indent=2,allow_nan=False))
