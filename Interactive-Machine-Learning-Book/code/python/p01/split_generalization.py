"""III-04: seeded group partitions, honest baseline evaluation and preprocessing leakage."""
from copy import deepcopy
import json
from decimal import Decimal
import numpy as np
from seed import lcg
from numeric import is_finite_number

PARTITIONS = ('train', 'validation', 'test')

def _number_text(value):
    # Presentation only: duplicate identity is numeric-pair equality, never decimal spelling.
    value = float(value)
    if value == 0:
        return '0'
    text = repr(value)
    if 'e' not in text:
        return text.removesuffix('.0')
    mantissa, exponent = text.split('e')
    exponent = int(exponent)
    if -6 <= exponent < 21:
        return format(Decimal(text),'f')
    return f"{mantissa.removesuffix('.0')}e{exponent:+d}"

SPLIT_SAMPLES = [dict(id=f'g{i+1}-{copy}', group=f'g{i+1}', x=x, y=2*x+1) for i, x in enumerate([0,1,2,3,4,10]) for copy in ('a','b')]

def samples_valid(samples):
    if not 3 <= len(samples) <= 64:
        raise ValueError('Require 3–64 split samples')
    ids = set()
    for row in samples:
        if not isinstance(row['id'], str) or not row['id'].strip() or row['id'] in ids or not isinstance(row['group'], str) or not row['group'].strip() or not is_finite_number(row['x']) or not is_finite_number(row['y']) or abs(row['x']) > 20 or abs(row['y']) > 50:
            raise ValueError('Invalid sample ID, group, finite value or range')
        ids.add(row['id'])

def seed_split(samples, seed, keep_groups):
    samples_valid(samples)
    if type(keep_groups) is not bool:
        raise ValueError('Group preservation must be boolean')
    random = lcg(seed)
    # Trigger seed validation even if an input fails before the first draw.
    if type(seed) is not int or not 0 <= seed <= 0xffffffff:
        raise ValueError('Seed must be unsigned 32-bit')
    units = sorted({row['group'] if keep_groups else row['id'] for row in samples}, key=lambda text: text.encode('utf-16-be', 'surrogatepass'))
    if len(units) < 3:
        raise ValueError('Need at least three independent split units')
    for i in range(len(units)-1, 0, -1):
        j = int(next(random) * (i+1))
        units[i], units[j] = units[j], units[i]
    n_train, n_validation = max(1, int(len(units)*.6)), max(1, int(len(units)*.2))
    membership = {unit: 'train' if i < n_train else 'validation' if i < n_train+n_validation else 'test' for i, unit in enumerate(units)}
    return dict(samples=sorted(deepcopy(samples), key=lambda row: row['id'].encode('utf-16-be', 'surrogatepass')), seed=seed, keepGroups=keep_groups,
                assignments={row['id']: membership[row['group'] if keep_groups else row['id']] for row in sorted(samples, key=lambda row: row['id'].encode('utf-16-be', 'surrogatepass'))}, source='seeded')

SPLIT_CANONICAL = seed_split(SPLIT_SAMPLES, 42, True)

def derive_split(state):
    samples_valid(state['samples'])
    if type(state['seed']) is not int or not 0 <= state['seed'] <= 0xffffffff or type(state['keepGroups']) is not bool or state['source'] not in ('seeded','manual','distribution-shift') or set(state['assignments']) != {row['id'] for row in state['samples']} or any(value not in PARTITIONS for value in state['assignments'].values()):
        raise ValueError('Every sample needs exactly one valid partition')
    groups = sorted({row['group'] for row in state['samples']}, key=lambda text: text.encode('utf-16-be', 'surrogatepass'))
    group_leaks = [group for group in groups if len({state['assignments'][row['id']] for row in state['samples'] if row['group'] == group}) > 1]
    if state['keepGroups'] and group_leaks:
        raise ValueError('A group must stay in one partition')
    rows = [dict(**row, partition=state['assignments'][row['id']]) for row in state['samples']]
    training = [row for row in rows if row['partition'] == 'train']
    mean = float(np.mean([row['y'] for row in training])) if training else None
    pair_partitions = {}
    for row in rows:
        pair_partitions.setdefault((row['x'],row['y']),set()).add(row['partition'])
    duplicates = [f'{_number_text(x)}|{_number_text(y)}' for (x,y),partitions in pair_partitions.items() if len(partitions)>1]
    subsets = []
    for partition in PARTITIONS:
        data = [row for row in rows if row['partition'] == partition]
        predictions = [] if mean is None else [dict(id=row['id'], prediction=mean, residual=mean-row['y']) for row in data]
        residual = np.array([[row['residual']] for row in predictions], dtype=np.float64)
        mse = float(np.mean(residual**2)) if mean is not None and data else None
        reason = 'The training set is empty: its baseline mean is undefined.' if mean is None else f'No {partition} samples: MSE is undefined.' if not data else None
        outside = [row['id'] for row in data if row['x'] < min(item['x'] for item in training) or row['x'] > max(item['x'] for item in training)] if training else []
        subsets.append(dict(partition=partition, rows=data, count=len(data), shape=[len(data),1], predictions=predictions, mse=mse, reason=reason, outOfRange=outside))
    return dict(state=deepcopy(state), rows=rows, groups=groups, groupLeaks=group_leaks, duplicateLeaks=duplicates, baselineMean=mean, subsets=subsets, partitionCount=len(rows), provenance='Hand-authored toy rows; paired IDs represent repeated observations from one group. The seed chooses assignments, not data values.')

def assign_split(state, identifier, partition):
    derive_split(state)
    selected = next((row for row in state['samples'] if row['id'] == identifier), None)
    if selected is None or partition not in PARTITIONS:
        raise ValueError('Unknown sample or destination')
    return {**deepcopy(state), 'source':'manual', 'assignments':{row['id']: partition if row['id'] == identifier or (state['keepGroups'] and row['group'] == selected['group']) else state['assignments'][row['id']] for row in state['samples']}}

def shift_split(state):
    derive_split(state)
    return {**deepcopy(state), 'source':'distribution-shift', 'assignments':{row['id']:'train' if row['x'] <= 3 else 'validation' if row['x'] <= 4 else 'test' for row in state['samples']}}

def split_trace(state):
    derive_split(state)
    return [dict(index=i,state=deepcopy(state) if i==0 else seed_split(state['samples'],(state['seed']+i)&0xffffffff,state['keepGroups']),
                 explanation='Starting assignments; no sample data changes.' if i==0 else f"Repartition with unsigned seed {(state['seed']+i)&0xffffffff}; preserve all sample IDs and data.") for i in range(4)]

def leakage_example(seed, distance=10):
    if not is_finite_number(distance) or not 6 <= distance <= 20:
        raise ValueError('Held-out distance must be finite and 6–20')
    offset = int(next(lcg(seed))*4)
    X_train = np.array([[offset],[offset+2]], dtype=np.float64)
    X_validation = np.array([[offset+distance]], dtype=np.float64)
    target = distance-1
    train_mean = float(X_train.mean())
    whole_mean = float(np.concatenate((X_train, X_validation)).mean())
    honest = float((X_validation-train_mean)[0,0])
    leaked = float((X_validation-whole_mean)[0,0])
    return dict(seed=seed, distance=distance, offset=offset, trainX=X_train[:,0].tolist(), trainY=[-1,1], validationX=offset+distance, validationTarget=target,
                trainingMean=train_mean, wholeMean=whole_mean, honestPrediction=honest, leakedPrediction=leaked, honestMSE=(honest-target)**2, leakedMSE=(leaked-target)**2,
                targetCentering=dict(trainingMean=0, wholeMean=target/3, honestMSE=target**2, leakedMSE=(target/3-target)**2),
                reason='Whole-dataset feature centering reads held-out x before evaluation. Here it worsens validation error; leakage is invalid regardless of its direction. Whole-target centering also reads held-out y and makes the constant baseline look better.')

if __name__ == '__main__':
    print(json.dumps(dict(split=derive_split(SPLIT_CANONICAL), leakage=leakage_example(42)), indent=2, allow_nan=False))
