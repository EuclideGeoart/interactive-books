"""III-02: sample rows, feature columns and semantically typed target columns."""
from copy import deepcopy
import json
import math
import numpy as np

FEATURE_COLUMNS = [dict(name='Study time', unit='hours', integer=False, max=12), dict(name='Practice tasks', unit='count', integer=True, max=20), dict(name='Sleep time', unit='hours', integer=False, max=12)]
FEATURE_CANONICAL = dict(samples=[dict(id=f'r{i+1}', values=values, target=target) for i, (values, target) in enumerate([([0,0,6],1), ([1,2,8],3), ([2,3,7],5), ([3,4,8],7), ([4,5,6],9), ([5,8,7],11)])], sampleCount=4, featureCount=2, targetKind='quantity')

def derive_features(state):
    n, d = state['sampleCount'], state['featureCount']
    if type(n) is not int or type(d) is not int or not 1 <= n <= 6 or not 1 <= d <= 3 or len(state['samples']) != 6 or state['targetKind'] not in ('quantity', 'category', 'none'):
        raise ValueError('Require 1–6 active samples, 1–3 features and a supported target kind')
    ids = set()
    for row in state['samples']:
        if not isinstance(row['id'], str) or not row['id'].strip() or row['id'] in ids or len(row['values']) != 3:
            raise ValueError('Unique nonempty IDs and rectangular feature rows are required')
        ids.add(row['id'])
        for value, column in zip(row['values'], FEATURE_COLUMNS):
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= column['max'] or (column['integer'] and value != int(value)):
                raise ValueError('Feature type, finite value or unit range is invalid')
        kind, target = state['targetKind'], row['target']
        if kind == 'quantity' and (isinstance(target, bool) or not isinstance(target, (int, float)) or not math.isfinite(target) or not 0 <= target <= 20):
            raise ValueError('Quantity target must be a finite score from 0 to 20')
        if kind == 'category' and target not in ('ready', 'practice'):
            raise ValueError('Category target must be ready or practice')
        if kind == 'none' and target is not None:
            raise ValueError('Unlabelled schema has no target')
    rows = state['samples'][:n]
    X = np.array([row['values'][:d] for row in rows], dtype=np.float64)
    y = None if state['targetKind'] == 'none' else np.array([[row['target']] for row in rows], dtype=np.float64 if state['targetKind'] == 'quantity' else str)
    return dict(state=deepcopy(state), rows=deepcopy(rows), columns=FEATURE_COLUMNS[:d], X=X.tolist(), y=None if y is None else y.tolist(),
                shapes=dict(X=list(X.shape), weights=[d,1], targets=None if y is None else list(y.shape)),
                targetReason='No observed target column; an unsupervised goal must be specified separately.' if y is None else None)

def feature_target_kind(state, kind):
    result = deepcopy(state)
    result['targetKind'] = kind
    for i, row in enumerate(result['samples']):
        row['target'] = None if kind == 'none' else ('ready' if FEATURE_CANONICAL['samples'][i]['target'] >= 7 else 'practice') if kind == 'category' else FEATURE_CANONICAL['samples'][i]['target']
    return result

if __name__ == '__main__':
    print(json.dumps({kind: derive_features(feature_target_kind(FEATURE_CANONICAL, kind)) for kind in ('quantity', 'category', 'none')}, indent=2, allow_nan=False))
