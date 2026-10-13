"""III-01: observed targets train parameters; an unlabelled query only predicts."""
from copy import deepcopy
import json
from pathlib import Path
import sys
import numpy as np
from numeric import is_finite_number

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'code/python/p02'))
import linear_regression as reference

PIPELINE_CANONICAL = dict(regression=deepcopy(reference.CANONICAL_REGRESSION), mode='training', sampleId='s3', query=1.5)

def derive_pipeline(state):
    if state['mode'] not in ('training', 'inference') or not is_finite_number(state['query']) or abs(state['query']) > 5:
        raise ValueError('Choose training/inference and a finite query between -5 and 5')
    numerical = reference.derive_regression(state['regression'])
    r = state['regression']
    if abs(r['weight']) > 4 or abs(r['bias']) > 4 or r['learningRate'] < .001 or any(abs(s['x']) > 5 or abs(s['y']) > 5 for s in r['samples']):
        raise ValueError('Predictor or observations are outside the supported sheet range')
    row = next((row for row in numerical['rows'] if row['id'] == state['sampleId']), None)
    if row is None:
        raise ValueError('Select an existing sample ID')
    x = row['x'] if state['mode'] == 'training' else state['query']
    X = np.array([[x]], dtype=np.float64)
    W = np.array([[r['weight']]], dtype=np.float64)
    prediction = float((X @ W + r['bias'])[0, 0])
    training = state['mode'] == 'training'
    return dict(state=deepcopy(state), numerical=numerical, x=x, prediction=prediction,
                target=row['y'] if training else None, residual=row['residual'] if training else None,
                loss=numerical['mse'] if training else None,
                reason=None if training else 'The query has no observed target. Inference produces a prediction, without an error or parameter update.',
                inputShape=list(X.shape), batchShape=numerical['shapes']['X'], weightShape=list(W.shape))

def pipeline_update(state):
    if state['mode'] != 'training':
        raise ValueError('Inference does not update parameters')
    result = {**deepcopy(state), 'regression': reference.regression_step(state['regression'])}
    derive_pipeline(result)
    return result

def pipeline_trace(state):
    derive_pipeline(state)
    if state['mode'] == 'inference':
        explanations = ['1. Receive a query x; no target is observed.', '2. Represent x as a 1 × 1 feature column.', '3. Apply the learned predictor. Parameters remain fixed.']
        states = [state] * 3
    else:
        explanations = ['1. Observe the selected sample’s input and target.', '2. Represent its input as a feature column; samples occupy rows in the batch.', '3. Predict with the current shared weight and bias.', '4. Compare prediction with target; compute the batch loss and gradient.', '5. Subtract one old-state gradient from both parameters simultaneously.']
        states = [state] * 4 + [pipeline_update(state)]
    return [dict(index=i, state=deepcopy(item), explanation=explanations[i]) for i, item in enumerate(states)]

if __name__ == '__main__':
    print(json.dumps(dict(training=derive_pipeline(PIPELINE_CANONICAL), inference=derive_pipeline({**PIPELINE_CANONICAL, 'mode': 'inference'}), trace=pipeline_trace(PIPELINE_CANONICAL)), indent=2, allow_nan=False))
