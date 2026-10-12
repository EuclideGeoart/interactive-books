"""Independent M10 Block B oracle for VI.5--VI.8; never reads TypeScript.

Methods: exact Fraction quadratic GD closed form; momentum as an unrolled
weighted gradient sum, checked against the velocity recurrence; arbitrary-
precision integer LCG modulo 2**32; Adam moments as exact Fraction weighted
sums with exact bias correction and Decimal(80) square roots and updates.
Decimal Adam iterates are converted back to exact decimal Fractions before
forming the next quadratic gradient. This keeps rounding out of the moments.

Schema: policy plus stability, momentum, batches and adam lists. Every case
is {config, expected:[step,...]}. Config uses start:[x,y], eta and K (0..40),
quadratic a and center (defaults 1,0), beta for momentum; mode, batchSize,
seed for batches; b1,b2,eps,source for Adam. Adam source is 'quadratic' or
'sequence'; the latter supplies exactly K gradient vectors and has null loss
and nextLoss because there is no objective. All other losses are the full
objective, including at stochastic steps. Defaults are start:[2,1], eta:.25,
K:8; batches default to start:[0,0], eta:.1, seed:42; beta:.8, b1:.9,
b2:.999, eps:1e-8. Initial velocity and moments are zero.

Steps are transitions k=0..K-1: status, theta, loss, gradient, update,
nextTheta, nextLoss. Momentum also has velocity (before) and nextVelocity.
Batches also have rngBefore, rngAfter, indices and perExampleGradients;
gradient is their arithmetic mean, with replacement for sampled modes.
Adam adds t=k+1, m1,m2 (after this gradient), bias1,bias2 (1-b**t),
m1Hat,m2Hat and denominator=sqrt(m2Hat)+eps, component by component.

Computed quantities are exported as finite binary64 numbers only. Any
unrepresentable defined output, including an Adam moment, makes all
mathematical fields in that step null with status 'non-finite'; k, t, RNG
states and indices remain available. The failing step is included and ends
the trace. Invalid configuration raises ValueError. Quadratic a>0 and center
must be finite with at most two decimal places; eta,eps>0, beta,b1,b2 in
[0,1), seeds are uint32 integers and mini-batch sizes are integers 1..4.
--check (default) compares exact UTF-8 fixture bytes without rewriting them;
--write generates fixtures/optimization_dynamics.fixtures.json from Python.
"""
import argparse
from decimal import Decimal, localcontext
from fractions import Fraction as F
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'fixtures/optimization_dynamics.fixtures.json'
DATA = ((-1, -1), (0, 1), (1, 2), (2, 2))
UINT32 = 2 ** 32
POLICY = {
    'method': 'Independent Fraction GD closed form; unrolled momentum with recurrence assertion; integer LCG; Fraction Adam weighted moments and bias correction with Decimal(80) sqrt/updates',
    'schema': {
        'sections': 'stability, momentum, batches, adam; each is [{config,expected:[step,...]}]',
        'sharedStep': 'k,status,theta:[x,y]|null,loss:number|null,gradient:[gx,gy]|null,update:[dx,dy]|null,nextTheta:[x,y]|null,nextLoss:number|null',
        'momentumStep': 'velocity (before), nextVelocity; zero initial velocity',
        'batchStep': 'rngBefore,rngAfter,indices,perExampleGradients; gradient is the average of ordered per-example gradients',
        'adamStep': 't=k+1,m1,m2,bias1,bias2,m1Hat,m2Hat,denominator; m1,m2 are post-gradient moments, bias=1-b**t',
        'length': 'K transitions with k=0..K-1, or a prefix ending at the first non-finite step; 0<=K<=40',
    },
    'quadratic': 'a*(x-center)^2/2+2*y^2, gradient=(a*(x-center),4*y); a>0 and center finite with at most two decimal places',
    'gd': 'x_k=center+(x_0-center)*(1-eta*a)^k; y_k=y_0*(1-4*eta)^k',
    'momentum': 'v_next=sum(beta^(k-j)*g_j,j=0..k), checked against beta*v_prev+g_k; update=-eta*v_next',
    'data': [list(example) for example in DATA],
    'batchLoss': 'r=w*x+b-target; per-example loss=r^2/2, gradient=(r*x,r); full loss is the mean over all four examples',
    'batchSelection': 'full=[0,1,2,3] without RNG advance; stochastic draws one; mini draws batchSize=1..4 with replacement',
    'lcg': 'stateNext=(1664525*state+1013904223)%2^32; index=(4*stateNext)//2^32; seeds uint32 integers',
    'adam': 'm1=(1-b1)*sum(b1^(t-1-j)*g_j); m2=(1-b2)*sum(b2^(t-1-j)*g_j^2); hats divide by 1-b**t; update=-eta*m1Hat/(sqrt(m2Hat)+eps)',
    'adamSequence': 'source=sequence supplies exactly K gradients, independent of any objective; loss and nextLoss are null; source=quadratic evaluates gradients at Decimal(80) iterates',
    'invalid': 'Invalid configuration raises ValueError; computed non-finite outputs null every mathematical field and stop the trace; JSON NaN and Infinity are forbidden',
    'tolerance': {
        'ulps': 128,
        'scale': 'max(1,abs(expected)); bound=128*ulp(scale)',
        'rationale': 'Exact rational steps and Decimal(80) Adam values are rounded only on export; allow accumulated browser roundings over at most 40 updates and bias-correction cancellation',
        'zeroDecayTrajectory': 'Near zero with beta1=beta2=0, independently check each real transition at its actual binary64 inputs; an ideal-arithmetic trajectory is ill-conditioned there. The same 128-ulp allowance applies, without a widened path tolerance.',
        'exact': 'Statuses, nulls, zero outputs, step/time indices, RNG states and selected indices match exactly',
    },
}


def number(value, name):
    if type(value) not in (int, float, F):
        raise ValueError(f'{name} must be a finite number')
    try:
        if not math.isfinite(value):
            raise ValueError(f'{name} must be finite')
    except OverflowError:
        raise ValueError(f'{name} must be finite') from None
    return F(str(value))


def integer(value, low, high, name):
    if type(value) is not int or not low <= value <= high:
        raise ValueError(f'{name} must be an integer in [{low},{high}]')
    return value


def point(values, name='start'):
    if not isinstance(values, (tuple, list)) or len(values) != 2:
        raise ValueError(f'{name} must have exactly two coordinates')
    return tuple(number(value, name) for value in values)


def positive(value, name):
    value = number(value, name)
    if value <= 0:
        raise ValueError(f'{name} must be positive')
    return value


def decay(value, name):
    value = number(value, name)
    if not 0 <= value < 1:
        raise ValueError(f'{name} must be in [0,1)')
    return value


def quadratic_parameters(a, center):
    a, center = positive(a, 'a'), number(center, 'center')
    if any((100 * value).denominator != 1 for value in (a, center)):
        raise ValueError('quadratic options allow at most two decimal places')
    return a, center


def quadratic(theta, a, center):
    x, y = theta
    return a * (x - center) ** 2 / 2 + 2 * y ** 2, (a * (x - center), 4 * y)


def decimal(value):
    return Decimal(value.numerator) / Decimal(value.denominator) if isinstance(value, F) else Decimal(value)


def exported(value):
    if isinstance(value, (F, Decimal)):
        result = float(value)
        if not math.isfinite(result):
            raise OverflowError('defined output is not finite binary64')
        return result
    if isinstance(value, (tuple, list)):
        return [exported(component) for component in value]
    return value


def step(k, quantities, **metadata):
    row = dict(k=k, status='finite', **metadata)
    try:
        row.update({name: exported(value) for name, value in quantities.items()})
    except OverflowError:
        row['status'] = 'non-finite'
        row.update({name: None for name in quantities})
    return row


def stability(start=(2, 1), eta=0.25, K=8, a=1, center=0):
    initial, eta = point(start), positive(eta, 'eta')
    K = integer(K, 0, 40, 'K')
    a, center = quadratic_parameters(a, center)
    factors = 1 - eta * a, 1 - 4 * eta
    rows = []
    for k in range(K):
        theta = center + (initial[0] - center) * factors[0] ** k, initial[1] * factors[1] ** k
        next_theta = center + (initial[0] - center) * factors[0] ** (k + 1), initial[1] * factors[1] ** (k + 1)
        loss, gradient = quadratic(theta, a, center)
        next_loss, _ = quadratic(next_theta, a, center)
        row = step(k, dict(theta=theta, loss=loss, gradient=gradient,
                           update=tuple(-eta * g for g in gradient),
                           nextTheta=next_theta, nextLoss=next_loss))
        rows.append(row)
        if row['status'] != 'finite':
            break
    return rows


def momentum(start=(2, 1), eta=0.25, K=8, a=1, center=0, beta=0.8):
    theta, eta = point(start), positive(eta, 'eta')
    K = integer(K, 0, 40, 'K')
    a, center = quadratic_parameters(a, center)
    beta = decay(beta, 'beta')
    history, rows = [], []
    velocity = F(0), F(0)
    for k in range(K):
        loss, gradient = quadratic(theta, a, center)
        history.append(gradient)
        next_velocity = tuple(sum(beta ** (k - j) * g[axis] for j, g in enumerate(history)) for axis in (0, 1))
        assert next_velocity == tuple(beta * velocity[axis] + gradient[axis] for axis in (0, 1)), 'momentum sum and recurrence disagree'
        update = tuple(-eta * value for value in next_velocity)
        next_theta = tuple(theta[axis] + update[axis] for axis in (0, 1))
        next_loss, _ = quadratic(next_theta, a, center)
        row = step(k, dict(theta=theta, loss=loss, gradient=gradient,
                           velocity=velocity, nextVelocity=next_velocity,
                           update=update, nextTheta=next_theta, nextLoss=next_loss))
        rows.append(row)
        if row['status'] != 'finite':
            break
        theta, velocity = next_theta, next_velocity
    return rows


def lcg_next(state):
    state = integer(state, 0, UINT32 - 1, 'seed/state')
    return (1664525 * state + 1013904223) % UINT32


def select_batch(mode, batchSize, state):
    integer(state, 0, UINT32 - 1, 'seed/state')
    integer(batchSize, 1, 4, 'batchSize')
    if mode == 'full':
        return list(range(4)), state
    if mode not in ('stochastic', 'mini'):
        raise ValueError('mode must be full, stochastic, or mini')
    indices = []
    for _ in range(1 if mode == 'stochastic' else batchSize):
        state = lcg_next(state)
        indices.append((4 * state) // UINT32)
    return indices, state


def batch_gradient(theta, indices):
    if not isinstance(indices, (list, tuple)) or not indices:
        raise ValueError('batch must be nonempty')
    for index in indices:
        integer(index, 0, 3, 'example index')
    w, b = (F(str(value)) for value in theta)
    gradients = []
    for index in indices:
        x, target = DATA[index]
        residual = w * x + b - target
        gradients.append((residual * x, residual))
    mean = tuple(sum(gradient[axis] for gradient in gradients) / len(indices) for axis in (0, 1))
    return gradients, mean


def full_loss(theta):
    w, b = (F(str(value)) for value in theta)
    return sum((w * x + b - target) ** 2 for x, target in DATA) / 8


def batches(start=(0, 0), eta=0.1, K=8, mode='mini', batchSize=2, seed=42):
    theta, eta = point(start), positive(eta, 'eta')
    K = integer(K, 0, 40, 'K')
    state = integer(seed, 0, UINT32 - 1, 'seed')
    # Validate selection configuration even for K=0, without consuming the stream.
    select_batch(mode, batchSize, state)
    rows = []
    for k in range(K):
        before = state
        indices, state = select_batch(mode, batchSize, state)
        gradients, gradient = batch_gradient(theta, indices)
        update = tuple(-eta * value for value in gradient)
        next_theta = tuple(theta[axis] + update[axis] for axis in (0, 1))
        row = step(k, dict(theta=theta, loss=full_loss(theta),
                           perExampleGradients=gradients, gradient=gradient,
                           update=update, nextTheta=next_theta, nextLoss=full_loss(next_theta)),
                   rngBefore=before, rngAfter=state, indices=indices)
        rows.append(row)
        if row['status'] != 'finite':
            break
        theta = next_theta
    return rows


def adam_moments(history, b1=0.9, b2=0.999):
    """Unrolled exact moments and hats, independent of any objective trajectory."""
    b1, b2 = decay(b1, 'b1'), decay(b2, 'b2')
    if not history:
        raise ValueError('gradient history must be nonempty')
    if any(not isinstance(g, (tuple, list)) or len(g) != 2 for g in history):
        raise ValueError('each gradient must have exactly two coordinates')
    history = [tuple(value if type(value) is F else number(value, 'gradient') for value in g) for g in history]
    t = len(history)
    m1 = tuple((1 - b1) * sum(b1 ** (t - 1 - j) * g[axis] for j, g in enumerate(history)) for axis in (0, 1))
    m2 = tuple((1 - b2) * sum(b2 ** (t - 1 - j) * g[axis] ** 2 for j, g in enumerate(history)) for axis in (0, 1))
    return m1, m2, tuple(value / (1 - b1 ** t) for value in m1), tuple(value / (1 - b2 ** t) for value in m2)


def adam(start=(2, 1), eta=0.25, K=8, a=1, center=0, b1=0.9, b2=0.999,
         eps=1e-8, source='quadratic', gradients=None):
    theta, eta = point(start), positive(eta, 'eta')
    K = integer(K, 0, 40, 'K')
    a, center = quadratic_parameters(a, center)
    b1, b2, eps = decay(b1, 'b1'), decay(b2, 'b2'), positive(eps, 'eps')
    if source not in ('quadratic', 'sequence'):
        raise ValueError('Adam source must be quadratic or sequence')
    if source == 'sequence':
        if not isinstance(gradients, (list, tuple)) or len(gradients) != K:
            raise ValueError('sequence must supply exactly K gradients')
        gradients = [point(gradient, 'gradient') for gradient in gradients]
    elif gradients is not None:
        raise ValueError('quadratic Adam does not accept a gradient sequence')
    rows, history = [], []
    with localcontext() as context:
        context.prec = 80
        theta = tuple(decimal(value) for value in theta)
        for k in range(K):
            rational_theta = tuple(F(value) for value in theta)
            loss, objective_gradient = quadratic(rational_theta, a, center)
            gradient = gradients[k] if source == 'sequence' else objective_gradient
            history.append(gradient)
            m1, m2, m1hat, m2hat = adam_moments(history, b1, b2)
            denominator = tuple(decimal(value).sqrt() + decimal(eps) for value in m2hat)
            update = tuple(-decimal(eta) * decimal(m1hat[axis]) / denominator[axis] for axis in (0, 1))
            next_theta = tuple(theta[axis] + update[axis] for axis in (0, 1))
            next_loss, _ = quadratic(tuple(F(value) for value in next_theta), a, center)
            row = step(k, dict(theta=theta, loss=loss if source == 'quadratic' else None,
                               gradient=gradient, m1=m1, m2=m2,
                               bias1=1 - b1 ** (k + 1), bias2=1 - b2 ** (k + 1),
                               m1Hat=m1hat, m2Hat=m2hat, denominator=denominator,
                               update=update, nextTheta=next_theta,
                               nextLoss=next_loss if source == 'quadratic' else None), t=k + 1)
            rows.append(row)
            if row['status'] != 'finite':
                break
            theta = next_theta
    return rows


def build_fixture():
    rate_configs = [dict(start=[2, 1], eta=eta, K=K, a=1, center=0)
                    for eta, K in [(0.25, 8), (0.05, 12), (0.1, 12), (0.4, 12),
                                   (0.5, 8), (0.55, 8), (1, 8), (2, 6), (2.25, 4)]]
    rate_configs += [
        dict(start=[2, 1], eta=0.1, K=40, a=0.25, center=-0.5),
        dict(start=[2, 1], eta=0.25, K=6, a=4, center=1),
        dict(start=[0.5, -0.5], eta=0.2, K=10, a=2, center=-0.25),
        dict(start=[0, 0], eta=0.25, K=3, a=1, center=0),
        dict(start=[2, 1], eta=0.25, K=0, a=1, center=0),
        dict(start=[1e154, 0], eta=2.5, K=40, a=1, center=0),
    ]
    momentum_configs = [dict(start=[2, 1], eta=eta, K=K, a=1, center=0, beta=beta)
                        for beta, eta, K in [(0, 0.25, 8), (0.5, 0.25, 8), (0.8, 0.25, 8),
                                             (0.9, 0.25, 8), (0.8, 0.05, 12), (0.8, 0.5, 8),
                                             (0.8, 1, 6), (0.95, 0.1, 40)]]
    momentum_configs += [
        dict(start=[2, 1], eta=0.2, K=8, a=2, center=0.25, beta=0.8),
        dict(start=[0, 0], eta=0.25, K=3, a=1, center=0, beta=0.8),
        dict(start=[2, 1], eta=0.25, K=0, a=1, center=0, beta=0.8),
        dict(start=[1e153, 1e153], eta=10, K=40, a=1, center=0, beta=0.8),
    ]
    batch_configs = [dict(start=[0, 0], eta=0.1, K=8, mode=mode, batchSize=size, seed=seed)
                     for seed in (0, 7, 42, UINT32 - 1)
                     for mode, size in [('full', 4), ('stochastic', 1), ('mini', 2)]]
    batch_configs += [dict(start=[0, 0], eta=0.1, K=8, mode='mini', batchSize=size, seed=seed)
                      for seed in (7, 42) for size in (1, 3, 4)]
    batch_configs += [
        dict(start=[0, 0], eta=0.1, K=0, mode='full', batchSize=4, seed=42),
        dict(start=[0.5, -0.25], eta=0.1, K=12, mode='full', batchSize=4, seed=7),
        dict(start=[0, 0], eta=0.5, K=12, mode='mini', batchSize=4, seed=42),
        dict(start=[2e154, 2e154], eta=0.1, K=40, mode='full', batchSize=4, seed=42),
    ]
    adam_configs = [dict(start=start, eta=eta, K=K, a=a, center=center,
                         b1=b1, b2=b2, eps=eps, source='quadratic')
                    for start, eta, K, a, center, b1, b2, eps in [
                        ([2, 1], 0.25, 8, 1, 0, 0.9, 0.999, 1e-8),
                        ([2, 1], 0.1, 12, 2, -0.5, 0.9, 0.999, 1e-8),
                        ([2, 1], 0.25, 6, 1, 0, 0, 0, 1e-8),
                        ([2, 1], 0.25, 6, 1, 0, 0.5, 0.9, 0.001),
                        ([0, 0], 0.25, 4, 1, 0, 0.9, 0.999, 1e-8),
                        ([2, 1], 0.25, 0, 1, 0, 0.9, 0.999, 1e-8),
                        ([1e200, 0], 0.25, 40, 1, 0, 0.9, 0.999, 1e-8),
                    ]]
    for gradients, b1, b2, eps in [
        ([[0, 0]] * 3, 0.9, 0.999, 1e-8),
        ([[2, 4]] * 4, 0.9, 0.999, 1e-8),
        ([[2, 4], [0, 0], [-2, -4]], 0.9, 0.999, 1e-8),
        ([[1, -1], [-1, 1], [1, -1], [-1, 1]], 0.9, 0.999, 1e-8),
        ([[0, 2], [0, 0], [0, -2]], 0.9, 0.999, 1e-8),
        ([[-2, -4]] * 2, 0.9, 0.999, 1e-8),
        ([[1, -1], [0, 0], [-1, 1]], 0, 0, 1e-8),
        ([[1, 1], [0, -1]], 0.9, 0.999, 0.5),
        ([[1e200, 0]], 0.9, 0.999, 1e-8),
        ([[0.25, -0.5], [-0.25, 0.5]] * 20, 0.9, 0.999, 1e-8),
    ]:
        adam_configs.append(dict(start=[0, 0], eta=0.1, K=len(gradients), a=1, center=0,
                                 b1=b1, b2=b2, eps=eps, source='sequence', gradients=gradients))
    return dict(policy=POLICY,
                stability=[dict(config=c, expected=stability(**c)) for c in rate_configs],
                momentum=[dict(config=c, expected=momentum(**c)) for c in momentum_configs],
                batches=[dict(config=c, expected=batches(**c)) for c in batch_configs],
                adam=[dict(config=c, expected=adam(**c)) for c in adam_configs])


def binary64_adam_transitions(cases):
    """High-precision transitions at actual binary64 inputs, avoiding trajectory conditioning."""
    rows = []
    with localcontext() as context:
        context.prec = 80
        for case in cases:
            c, state = case['config'], case['state']
            q = lambda value: F(float(value))
            theta = tuple(q(v) for v in state['point'])
            a, center = q(c['a']), q(c['center'])
            loss, gradient = quadratic(theta, a, center)
            b1, b2, eta, eps = (q(c[key]) for key in ('b1', 'b2', 'eta', 'eps'))
            t = state['adam']['time']
            previous = state['adam']['previous']
            m = tuple(b1 * q(previous['m'][i]) + (1-b1) * gradient[i] for i in (0, 1))
            v = tuple(b2 * q(previous['v'][i]) + (1-b2) * gradient[i]**2 for i in (0, 1))
            mh, vh = tuple(value/(1-b1**t) for value in m), tuple(value/(1-b2**t) for value in v)
            denominator = tuple(decimal(value).sqrt()+decimal(eps) for value in vh)
            update = tuple(-decimal(eta)*decimal(mh[i])/denominator[i] for i in (0, 1))
            nxt = tuple(decimal(theta[i])+update[i] for i in (0, 1))
            rows.append({key:exported(value) for key,value in dict(point=theta,loss=loss,gradient=gradient,m=m,v=v,mhat=mh,vhat=vh,denominator=denominator,update=update,next=nxt).items()})
    return rows


def render(data):
    return json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--transitions', action='store_true', help='check Decimal transitions at supplied binary64 inputs on stdin')
    mode.add_argument('--write', action='store_true', help='generate the fixture from Python')
    mode.add_argument('--check', action='store_true', help='check freshness without writing (default)')
    args = parser.parse_args(argv)
    if args.transitions:
        print(json.dumps(binary64_adam_transitions(json.load(sys.stdin)), allow_nan=False))
        return 0
    data = build_fixture()
    expected = render(data)
    if args.write:
        with FIXTURE.open('w', encoding='utf-8', newline='\n') as handle:
            handle.write(expected)
    elif not FIXTURE.exists() or FIXTURE.read_bytes() != expected.encode('utf-8'):
        print('optimization_dynamics fixture stale or missing; run python oracle/optimization_dynamics_oracle.py --write', file=sys.stderr)
        return 1
    counts = ', '.join(f'{len(data[name])} {name}' for name in ('stability', 'momentum', 'batches', 'adam'))
    print(f'optimization_dynamics: {counts}; fixture {"written" if args.write else "fresh"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
