"""III-03: target semantics and the intended goal decide the learning task."""
import json
import numpy as np

TASKS = [
    dict(id='price', name='Predict a price', goal='Predict sale price in euros from area and age.', features=[[40,10],[70,5],[100,1]], targets=[100000,180000,260000], kind='quantity', expected='regression'),
    dict(id='spam', name='Predict an email category', goal='Predict spam or ordinary mail from two counts.', features=[[0,2],[6,0],[1,4]], targets=['ordinary','spam','ordinary'], kind='category', expected='classification'),
    dict(id='binary-code', name='Predict a category coded 0/1', goal='Predict an observed category; 0 and 1 are identifiers, not amounts.', features=[[1,2],[3,0],[2,1]], targets=[0,1,0], kind='category', expected='classification'),
    dict(id='proportion', name='Predict a measured proportion', goal='Predict a measured fraction of time in sunlight, including intermediate values.', features=[[1,2],[3,0],[2,1]], targets=[0,.4,1], kind='quantity', expected='regression'),
    dict(id='customers', name='Group customers', goal='Find groups using spending and visit counts; no target is supplied.', features=[[2,1],[3,2],[12,9]], targets=None, kind='none', expected='unsupervised'),
    dict(id='ignore-label', name='Explore features without using labels', goal='Group observations by features; recorded labels are deliberately excluded from this goal.', features=[[1,1],[2,2],[9,8]], targets=['a','a','b'], kind='ignored', expected='unsupervised'),
]
TASK_CANONICAL = dict(scenario='price', choice='unsupervised')

def derive_task(state):
    scenario = next((row for row in TASKS if row['id'] == state['scenario']), None)
    if scenario is None or state['choice'] not in ('regression', 'classification', 'unsupervised'):
        raise ValueError('Choose a known scenario and learning task')
    uses = scenario['kind'] in ('quantity', 'category')
    expected = 'regression' if scenario['kind'] == 'quantity' else 'classification' if scenario['kind'] == 'category' else 'unsupervised'
    X = np.asarray(scenario['features'], dtype=np.float64)
    y = np.asarray(scenario['targets'], dtype=object).reshape(-1, 1) if uses else None
    reason = 'Labels exist, but this grouping goal does not use them.' if scenario['kind'] == 'ignored' else 'No target is observed; this goal explores feature structure.' if not uses else 'The target denotes a category, including when its code is numeric.' if scenario['kind'] == 'category' else 'The target is a numerical amount or measured proportion.'
    return dict(state=state.copy(), scenario=scenario, usesTarget=uses, correct=state['choice'] == expected, supervision='Supervised' if uses else 'Unsupervised', shapes=dict(X=list(X.shape), targets=None if y is None else list(y.shape)), reason=reason)

if __name__ == '__main__':
    print(json.dumps([derive_task(dict(scenario=row['id'], choice=row['expected'])) for row in TASKS], indent=2, allow_nan=False))
