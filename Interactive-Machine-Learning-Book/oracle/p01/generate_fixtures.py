"""Generate/check P01 goldens only after independent arithmetic, partition and SVD checks."""
from copy import deepcopy
from fractions import Fraction as F
import argparse
import json
from pathlib import Path
import sys
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'code/python/p01'))
import pipeline as p
import samples_features as f
import learning_problems as t
import split_generalization as s
import capacity_baselines as c
import optimization_loop as o
import arithmetic_oracle as a

GOLDEN = ROOT/'fixtures/p01/foundations.json'

def close(actual,expected,tolerance=1e-11):
    assert abs(actual-float(expected)) <= tolerance*(1+abs(float(expected))), (actual,expected)

def verify_capacity(state):
    derived = c.derive_capacity(state)
    independent = {row['id']:row for row in a.capacity_rows(state['seed'],state['noise'])}
    for row in derived['samples']:
        close(row['x'],independent[row['id']]['x'])
        close(row['y'],independent[row['id']]['y'])
    training = [independent[row['id']] for row in derived['samples'] if row['partition']=='train']
    close(derived['baselineMean'],a.baseline([row['y'] for row in training]))
    exact = a.polynomial(training,state['degree'])
    X = np.vander([float(row['x']) for row in training],N=state['degree']+1,increasing=True)
    svd,_,rank,_ = np.linalg.lstsq(X,np.array([float(row['y']) for row in training]),rcond=1e-12)
    assert rank == state['degree']+1
    assert not a.qr_rank_rejected(training,state['degree'])
    # Error bounds reflect extrapolation conditioning on the shifted half-grid, not failure masking.
    for actual,rational,stable in zip(derived['coefficients'],exact,svd):
        close(actual,rational,1e-8); close(actual,stable,1e-8)
    for row in derived['rows']:
        close(row['prediction'],a.predict(independent[row['id']]['x'],exact),1e-8)
    for error in derived['errors']:
        subset = [independent[row['id']] for row in derived['samples'] if row['partition']==error['partition']]
        if subset:
            close(error['mse'],a.mse([a.predict(row['x'],exact) for row in subset],[row['y'] for row in subset]),1e-8)
        else:
            assert error['mse'] is None
    return derived

def build():
    a.self_test()
    before = p.derive_pipeline(p.PIPELINE_CANONICAL)
    exact = a.affine(before['numerical']['rows'],F(1,2),0)
    for name,key in [('mse','mse'),('dw','weight'),('db','bias')]:
        close(before['numerical']['mse'] if name=='mse' else before['numerical']['gradients'][key],exact[name])
    after_state = p.pipeline_update(p.PIPELINE_CANONICAL)
    close(after_state['regression']['weight'],F(51,50)); close(after_state['regression']['bias'],F(4,25))
    split_states = [s.seed_split(s.SPLIT_SAMPLES,seed,groups) for seed,groups in [(0,True),(42,True),(0xffffffff,True),(42,False)]]
    for state in split_states:
        assert state['assignments'] == a.partition(state['samples'],state['seed'],state['keepGroups'])
    split_states += [s.assign_split(split_states[1],'g1-a','validation'),s.shift_split(split_states[1])]
    states = [{**c.CAPACITY_CANONICAL,'degree':degree} for degree in (0,1,2,8)]
    states += [c.preset_capacity_split({**c.CAPACITY_CANONICAL,'degree':4},'seeded',42),
               c.preset_capacity_split({**c.CAPACITY_CANONICAL,'degree':2},'distribution-shift')]
    states += [{**c.CAPACITY_CANONICAL,'seed':0,'degree':degree} for degree in (2,8)]
    manual = c.assign_capacity(c.CAPACITY_CANONICAL,'p1','validation')
    states.append(manual)
    capacity = [dict(state=state,derived=verify_capacity(state),selection=c.capacity_candidates(state)) for state in states]
    near = [dict(id=str(i),x=x,y=2*x+1) for i,x in enumerate((.5-1.3e-12,.5,.5+1.3e-12))]
    near_fit = c.fit_capacity(near,1)
    assert near_fit['coefficients'] is None and near_fit['reason'] == c.RANK_REASON
    assert a.qr_rank_rejected(near,1)
    singular = np.linalg.svd(np.vander([row['x'] for row in near],N=2,increasing=True),compute_uv=False)
    assert singular[-1] <= singular[0]*1e-12
    return dict(schema=1,provenance='Explicit hand-authored toy datasets; seeded noise and memberships are separately identified.',
                tolerances=dict(arithmetic=1e-11,capacity=1e-8),
                pipeline=dict(before=before,after=p.derive_pipeline(after_state),trace=p.pipeline_trace(p.PIPELINE_CANONICAL),inference=p.derive_pipeline({**p.PIPELINE_CANONICAL,'mode':'inference'})),
                features=[f.derive_features(f.feature_target_kind(f.FEATURE_CANONICAL,kind)) for kind in ('quantity','category','none')],
                tasks=[t.derive_task(dict(scenario=row['id'],choice=row['expected'])) for row in t.TASKS],
                splits=[s.derive_split(state) for state in split_states],splitTrace=s.split_trace(s.SPLIT_CANONICAL),leakage=[s.leakage_example(42,10),s.leakage_example(0,13)],
                optimization=o.optimization_loop(),capacity=capacity,capacityTrace=c.capacity_trace(c.CAPACITY_CANONICAL),
                nearRank=dict(samples=near,degree=1,fit=near_fit,svdSingularValues=singular.tolist()))

def serialized():
    return json.dumps(build(),indent=2,ensure_ascii=False,allow_nan=False)+'\n'

def check(path=GOLDEN):
    expected = serialized()
    if not path.is_file() or path.read_text(encoding='utf-8') != expected:
        raise ValueError(f'Missing or stale fixture: {path}')
    return expected

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true')
    args = parser.parse_args()
    if args.check:
        check(); print('P01 golden check: foundations.json current')
    else:
        GOLDEN.parent.mkdir(parents=True,exist_ok=True)
        GOLDEN.write_text(serialized(),encoding='utf-8'); print('Generated fixtures/p01/foundations.json')
