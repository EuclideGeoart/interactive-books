"""Independent mathematical sidecar for M10 Block C; never reads TypeScript.

Only stdlib is used. The primary method forms polynomial quantities and GD
updates as exact Fraction(str(input)). Box projections are exact; irrational
norms alone use Decimal(80) square roots, then return to Fraction arithmetic.
The second method uses Decimal(80) throughout, expanded quadratic coefficients,
affine GD recurrences, sorted box coordinates and scaled radial disk norms.
It does not call the primary evaluator, projector or trajectory method.

Schema: policy; projections:[{config:{point,constraint},expected}]; penalties:
{evaluations:[{config:{objective,point,a,center,lambda},expected}],
 minimizers:[{config:{a,center,lambda,constraint},expected}]};
traces:[{config,expected}]. Trace config keys are objective,a,center,start,eta,
iterations,constraint,lambda,gradientTolerance,lossTolerance,clip,divergenceLimit.
Defaults: quadratic,1,0,[2,1],.25,12,none,0,0,0,0,1e6 respectively.

Projection expected: status,point,correction,distance,inputNorm,projectedNorm,changed.
Evaluation expected: status,baseLoss,penaltyLoss,loss,gradient,hessian; loss is
J=L+lambda*||theta||^2. Minimizers also give point,unconstrainedPoint and
normalMultiplier (g+mu*normal=0; normal is signed x-axis or disk unit radius).
All quadratic constrained minima are unique global minima by strict convexity.
Trace expected: initial,steps,reason,acceptedSteps,final. Initial records the
requestedStart, explicitly projected point and projectionCorrection. A state
has point,evaluation,rawNorm. Each attempted step preserves currentPoint,
currentLoss,rawGradient,rawNorm,appliedGradient,appliedNorm,clipScale,
proposedUpdate,proposal,projectionCorrection,actualDisplacement,nextPoint,
nextLoss,lossChange,accepted,status,k. proposedUpdate=-eta*appliedGradient;
proposal=currentPoint+proposedUpdate; actualDisplacement=nextPoint-currentPoint.
A non-finite transition is attempted but not accepted. A finite transition to
an unrepresentable evaluation IS accepted and retains its failed next point.
No extra step is appended for a pre-step stop. Optional exactHistory contains
reduced num/den point,loss,gradient strings at every retained rational state.

Stop order: initial evaluation/norm must be finite; before each available step
check enabled raw-gradient norm <= tolerance, then exact zero gradient; guard
transition outputs before accepting; evaluate the retained next point; check
next-point norm > divergenceLimit; enabled absolute loss change <= tolerance;
iteration budget last. A zero budget evaluates/project-start but attempts no
step. Zero disables either tolerance or clipping. Stop reasons are mathematical
enums, intentionally independent of browser strings. No stop certifies
optimality. The three allowed polynomials have no restricted real domain.

Inputs: finite numeric options (bool/string rejected), eta>0, lambda>=0,
thresholds>=0, positive finite divergenceLimit, integer iterations 0..40;
a>0 and a,center have at most two decimal places. Point coordinates may be
non-finite only to exercise the initial/evaluation guard, and never enter JSON
fixtures. Defined outputs must fit finite binary64; invalid evaluations null
all evaluation quantities, failed transitions retain each finite quantity.
Fixture bounds: ordinary a=.01..4, |center|<=2, iterations<=12; short stable
radical trajectories plus explicit overflow/large-finite probes. Sensitive
long trajectories are excluded rather than weakening tolerance. Local values
use 8*ulp(max(1,abs(expected))); trajectories use 128*ulp(same scale), retaining
Block A=8 and Block B=128 unchanged. Status/null/zero/enum/count fields are exact.
--write generates the fixture; --check (default) compares exact UTF-8 bytes.
"""
import argparse
from decimal import Decimal, localcontext
from fractions import Fraction as F
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'fixtures/optimization_constraints.fixtures.json'
CONSTRAINTS = ('none', 'box', 'disk')
OBJECTIVES = ('quadratic', 'flat', 'saddle')
DEFAULTS = dict(objective='quadratic', a=1, center=0, start=[2, 1], eta=.25,
                iterations=12, constraint='none', **{'lambda': 0},
                gradientTolerance=0, lossTolerance=0, clip=0, divergenceLimit=1e6)
EVALUATION_FIELDS = ('baseLoss', 'penaltyLoss', 'loss', 'gradient', 'hessian')
POLICY = {
    'method': 'Independent exact Fraction polynomial/box GD, Decimal(80) radicals; independent Decimal(80) expanded-polynomial affine GD and scaled radial projection',
    'schema': {
        'projections': '[{config:{point:[x,y],constraint:none|box|disk},expected:{status,point,correction,distance,inputNorm,projectedNorm,changed}}]',
        'penalties': '{evaluations:[{config:{objective,point,a,center,lambda},expected:{status,baseLoss,penaltyLoss,loss,gradient,hessian}}],minimizers:[{config:{a,center,lambda,constraint},expected:{status,point,unconstrainedPoint,normalMultiplier,baseLoss,penaltyLoss,loss,gradient,hessian}}]}',
        'traces': '[{config,expected:{initial,steps,reason,acceptedSteps,final,exactHistory?}}]',
        'state': 'point,evaluation:{status,baseLoss,penaltyLoss,loss,gradient,hessian},rawNorm; initial also requestedStart,projectionCorrection',
        'step': 'k,status,accepted,currentPoint,currentLoss,rawGradient,rawNorm,appliedGradient,appliedNorm,clipScale,proposedUpdate,proposal,projectionCorrection,actualDisplacement,nextPoint,nextLoss,lossChange',
        'exactHistory': 'Optional exact rational states {k,point:[num/den,num/den],loss:num/den,gradient:[num/den,num/den]}; includes initial and each accepted state, only finite unclipped quadratic none/box traces',
        'config': 'objective,a,center,start,eta,iterations,constraint,lambda,gradientTolerance,lossTolerance,clip,divergenceLimit',
        'defaults': DEFAULTS,
    },
    'projection': 'Initial requested start is explicitly projected; none is identity, box is coordinate clamp to [-1,1], disk is z/max(1,||z||). Proposal is theta-eta*appliedGradient.',
    'penalty': 'J=a*(x-center)^2/2+2*y^2+lambda*(x^2+y^2), gradient=(a*(x-center)+2*lambda*x,(4+2*lambda)*y), Hessian=diag(a+2*lambda,4+2*lambda); flat replaces L by x^4+y^4; saddle by x^2-y^2.',
    'minimum': 'Quadratic unconstrained x*=a*center/(a+2*lambda),y*=0,J*=a*lambda*center^2/(a+2*lambda); box/disk clamp x* to [-1,1]. normalMultiplier is >=0 and satisfies stationarity with an outward unit normal.',
    'stopping': {
        'order': 'initial finite evaluation/norm; before each available step enabled raw norm threshold (<=), then zero gradient; transition finite guard; accept and retain next state; next evaluation finite guard; divergence norm (>); enabled absolute loss change (<=); budget last',
        'reasons': ['non-finite-initial', 'gradient-threshold', 'zero-gradient', 'non-finite-transition', 'non-finite-evaluation', 'divergence', 'loss-change', 'budget'],
        'disabled': 'gradientTolerance=0,lossTolerance=0,clip=0 disable their checks; iterations=0 evaluates the projected initial state then stops with budget',
        'clipping': 'Raw gradient remains available; scale=min(1,clip/rawNorm) if clip>0, otherwise 1; appliedGradient=scale*rawGradient',
        'notCertificate': 'A raw zero gradient, small gradient, small loss change or budget stop is not an optimality certificate, especially at a constrained boundary or flat critical point.',
        'retention': 'acceptedSteps counts finite transitions, including a next point whose evaluation fails. Non-finite transition attempts are included in steps but are not accepted.',
    },
    'domain': 'Quadratic, flat and saddle, all defined for real points. Invalid option/shape configuration raises ValueError. Non-finite coordinates give a non-finite evaluation/projection guard.',
    'bounds': 'a>0 and a,center at most two decimals; eta>0; lambda,gradientTolerance,lossTolerance,clip>=0; divergenceLimit finite >0; iterations integer 0..40. Fixtures use <=12, stable bounded radical paths and explicit overflow probes.',
    'finite': 'JSON NaN/Infinity forbidden. Unrepresentable evaluation nulls all evaluation fields. Transition fields null only when unrepresentable or not attempted; every retained defined number fits finite binary64.',
    'tolerance': {
        'evaluationUlps': 8, 'traceUlps': 128,
        'scale': 'max(1,abs(expected)); bound=ulps*ulp(scale)',
        'prior': 'Block A 8 ulps and Block B 128 ulps are unchanged; no generous fallback tolerance',
        'conditioning': 'Stable short radical trajectories only. For sensitive paths use an independent local transition at actual binary64 inputs, with the same bound; never widen a path tolerance.',
        'exact': 'Statuses, nulls, zero outputs, reasons, acceptance flags, step counts and rational histories',
    },
}


def number(value, name):
    if type(value) not in (int, float, F):
        raise ValueError(f'{name} must be a finite number')
    try:
        if not math.isfinite(value):
            raise ValueError(f'{name} must be finite')
    except OverflowError:
        raise ValueError(f'{name} must fit finite binary64') from None
    return F(str(value))


def coordinates(values, name='point'):
    if not isinstance(values, (tuple, list)) or len(values) != 2:
        raise ValueError(f'{name} must contain two numbers')
    if any(type(value) not in (int, float, F) for value in values):
        raise ValueError(f'{name} coordinates must be numbers')
    try:
        if not all(math.isfinite(value) for value in values):
            return None
    except OverflowError:
        return None
    return tuple(F(str(value)) for value in values)


def parameters(config, allowed):
    if not isinstance(config, dict) or set(config) - set(allowed):
        raise ValueError('unknown configuration fields')
    a, center = number(config.get('a', 1), 'a'), number(config.get('center', 0), 'center')
    penalty = number(config.get('lambda', 0), 'lambda')
    if a <= 0 or any((100 * value).denominator != 1 for value in (a, center)):
        raise ValueError('a must be positive; a and center allow at most two decimals')
    if penalty < 0:
        raise ValueError('lambda must be nonnegative')
    return a, center, penalty


def constraint_option(value):
    if value not in CONSTRAINTS:
        raise ValueError('constraint must be none, box or disk')
    return value


def trace_config(config):
    a, center, penalty = parameters(config, DEFAULTS)
    c = dict(DEFAULTS, **config)
    if c['objective'] not in OBJECTIVES:
        raise ValueError('objective must be quadratic, flat or saddle')
    constraint_option(c['constraint'])
    c['start'] = coordinates(c['start'], 'start')
    if type(c['iterations']) is not int or not 0 <= c['iterations'] <= 40:
        raise ValueError('iterations must be an integer in [0,40]')
    for key in ('eta', 'gradientTolerance', 'lossTolerance', 'clip', 'divergenceLimit'):
        c[key] = number(c[key], key)
        if c[key] < 0 or (key in ('eta', 'divergenceLimit') and c[key] == 0):
            raise ValueError(f'{key} is outside its allowed range')
    c.update(a=a, center=center, **{'lambda': penalty})
    return c


def decimal(value):
    return Decimal(value.numerator) / Decimal(value.denominator) if isinstance(value, F) else Decimal(value)


def fraction_norm(point):
    """Exact for rational square roots; only genuine radicals round at 80 digits."""
    squared = sum(value * value for value in point)
    numerator, denominator = math.isqrt(squared.numerator), math.isqrt(squared.denominator)
    if numerator ** 2 == squared.numerator and denominator ** 2 == squared.denominator:
        return F(numerator, denominator)
    with localcontext() as context:
        context.prec = 80
        return F(decimal(squared).sqrt())


def decimal_norm(point):
    scale = max(abs(value) for value in point)
    if scale == 0:
        return Decimal(0)
    return scale * sum((value / scale) ** 2 for value in point).sqrt()


def fraction_projection(point, constraint):
    if constraint == 'none':
        return point
    if constraint == 'box':
        return tuple(max(F(-1), min(F(1), value)) for value in point)
    norm = fraction_norm(point)
    return tuple(value / max(F(1), norm) for value in point)


def decimal_projection(point, constraint):
    if constraint == 'none':
        return point
    if constraint == 'box':
        return tuple(sorted((Decimal(-1), value, Decimal(1)))[1] for value in point)
    radius = decimal_norm(point)
    if radius <= 1:
        return point
    return tuple(value / radius for value in point)


def fraction_evaluation(point, objective, a, center, penalty):
    x, y = point
    if objective == 'quadratic':
        base = a * (x - center) ** 2 / 2 + 2 * y ** 2
        gradient, hessian = (a * (x - center), 4 * y), ((a, F(0)), (F(0), F(4)))
    elif objective == 'flat':
        base = x ** 4 + y ** 4
        gradient, hessian = (4 * x ** 3, 4 * y ** 3), ((12 * x ** 2, F(0)), (F(0), 12 * y ** 2))
    else:
        base = x ** 2 - y ** 2
        gradient, hessian = (2 * x, -2 * y), ((F(2), F(0)), (F(0), F(-2)))
    regularizer = penalty * (x ** 2 + y ** 2)
    return dict(baseLoss=base, penaltyLoss=regularizer, loss=base + regularizer,
                gradient=tuple(gradient[i] + 2 * penalty * point[i] for i in (0, 1)),
                hessian=((hessian[0][0] + 2 * penalty, F(0)), (F(0), hessian[1][1] + 2 * penalty)))


def decimal_evaluation(point, objective, a, center, penalty):
    x, y = point
    if objective == 'quadratic':
        hx, hy, linear, constant = a + 2 * penalty, 4 + 2 * penalty, -a * center, a * center * center / 2
        base = (a * x / 2 - a * center) * x + 2 * y * y + constant
        loss = (hx * x / 2 + linear) * x + hy * y * y / 2 + constant
        gradient, hessian = (hx * x + linear, hy * y), ((hx, Decimal(0)), (Decimal(0), hy))
    elif objective == 'flat':
        xx, yy = x * x, y * y
        base = xx * xx + yy * yy
        loss = xx * (xx + penalty) + yy * (yy + penalty)
        gradient = (x * (4 * xx + 2 * penalty), y * (4 * yy + 2 * penalty))
        hessian = ((12 * xx + 2 * penalty, Decimal(0)), (Decimal(0), 12 * yy + 2 * penalty))
    else:
        hx, hy = 2 * (1 + penalty), 2 * (penalty - 1)
        base = x * x - y * y
        loss = hx * x * x / 2 + hy * y * y / 2
        gradient, hessian = (hx * x, hy * y), ((hx, Decimal(0)), (Decimal(0), hy))
    return dict(baseLoss=base, penaltyLoss=penalty * (x * x + y * y), loss=loss,
                gradient=gradient, hessian=hessian)


def exported(value):
    if isinstance(value, (F, Decimal, float)):
        result = float(value)
        if not math.isfinite(result):
            raise OverflowError('defined output does not fit finite binary64')
        return 0.0 if result == 0 else result
    if isinstance(value, (tuple, list)):
        return [exported(item) for item in value]
    if isinstance(value, dict):
        return {key: exported(item) for key, item in value.items()}
    return value


def or_null(value):
    try:
        return exported(value)
    except OverflowError:
        return None


def is_finite(value):
    try:
        exported(value)
        return True
    except OverflowError:
        return False


def evaluation_result(values):
    if values is None or not is_finite(values):
        return dict(status='non-finite', **{key: None for key in EVALUATION_FIELDS})
    return dict(status='finite', **exported(values))


def project(point, constraint='none', method='fraction'):
    constraint_option(constraint)
    theta = coordinates(point)
    if method not in ('fraction', 'decimal'):
        raise ValueError('method must be fraction or decimal')
    fields = ('point', 'correction', 'distance', 'inputNorm', 'projectedNorm')
    if theta is None:
        return dict(status='non-finite', changed=None, **{key: None for key in fields})
    with localcontext() as context:
        context.prec = 80
        if method == 'fraction':
            projected = fraction_projection(theta, constraint)
            norm = fraction_norm
        else:
            theta = tuple(decimal(value) for value in theta)
            projected = decimal_projection(theta, constraint)
            norm = decimal_norm
        correction = tuple(projected[i] - theta[i] for i in (0, 1))
        values = dict(point=projected, correction=correction, distance=norm(correction),
                      inputNorm=norm(theta), projectedNorm=norm(projected))
        if not is_finite(values):
            return dict(status='non-finite', changed=None, **{key: None for key in fields})
        return dict(status='finite', changed=projected != theta, **exported(values))


def evaluate(config, method='fraction'):
    a, center, penalty = parameters(config, ('objective', 'point', 'a', 'center', 'lambda'))
    objective = config.get('objective', 'quadratic')
    if objective not in OBJECTIVES or method not in ('fraction', 'decimal'):
        raise ValueError('unknown objective or method')
    theta = coordinates(config.get('point', [2, 1]))
    if theta is None:
        return evaluation_result(None)
    if method == 'fraction':
        return evaluation_result(fraction_evaluation(theta, objective, a, center, penalty))
    with localcontext() as context:
        context.prec = 80
        return evaluation_result(decimal_evaluation(tuple(decimal(v) for v in theta), objective,
                                                    decimal(a), decimal(center), decimal(penalty)))


def minimizer(config, method='fraction'):
    a, center, penalty = parameters(config, ('a', 'center', 'lambda', 'constraint'))
    constraint = constraint_option(config.get('constraint', 'none'))
    if method not in ('fraction', 'decimal'):
        raise ValueError('unknown method')
    with localcontext() as context:
        context.prec = 80
        if method == 'fraction':
            unconstrained = a * center / (a + 2 * penalty), F(0)
            point = fraction_projection(unconstrained, constraint)
            values = fraction_evaluation(point, 'quadratic', a, center, penalty)
            # Completing the square independently verifies the minimum loss.
            floor = a * penalty * center ** 2 / (a + 2 * penalty)
            assert values['loss'] == floor + (a + 2 * penalty) * (point[0] - unconstrained[0]) ** 2 / 2
        else:
            a, center, penalty = decimal(a), decimal(center), decimal(penalty)
            hx, linear = a + 2 * penalty, -a * center
            unconstrained = -linear / hx, Decimal(0)
            point = decimal_projection(unconstrained, constraint)
            values = decimal_evaluation(point, 'quadratic', a, center, penalty)
        multiplier = abs(values['gradient'][0]) if point != unconstrained else 0
        result = evaluation_result(values)
        if result['status'] == 'non-finite' or not is_finite((point, unconstrained, multiplier)):
            return dict(evaluation_result(None), point=None, unconstrainedPoint=None, normalMultiplier=None)
        return dict(result, point=exported(point), unconstrainedPoint=exported(unconstrained),
                    normalMultiplier=exported(multiplier))


def state(point, values, norm):
    return dict(point=or_null(point), evaluation=evaluation_result(values), rawNorm=or_null(norm))


def transition(k, theta, values, raw_norm, applied, applied_norm, scale, update, proposal, next_point):
    correction = None if next_point is None else tuple(next_point[i] - proposal[i] for i in (0, 1))
    displacement = None if next_point is None else tuple(next_point[i] - theta[i] for i in (0, 1))
    accepted = next_point is not None and is_finite((update, proposal, next_point, correction, displacement))
    row = dict(k=k, status='finite' if accepted else 'non-finite-transition', accepted=accepted,
               currentPoint=theta, currentLoss=values['loss'], rawGradient=values['gradient'], rawNorm=raw_norm,
               appliedGradient=applied, appliedNorm=applied_norm, clipScale=scale,
               proposedUpdate=update, proposal=proposal, projectionCorrection=correction,
               actualDisplacement=displacement, nextPoint=next_point if accepted else None,
               nextLoss=None, lossChange=None)
    return {key: or_null(value) for key, value in row.items()}


def finish(initial, rows, reason, theta, values, norm, accepted):
    return dict(initial=initial, steps=rows, reason=reason, acceptedSteps=accepted,
                final=state(theta, values, norm))


def trace(config=None):
    """Fraction reference: exact gradients, comparisons and updates; 80-digit radicals."""
    c = trace_config({} if config is None else config)
    requested = c['start']
    theta = None if requested is None else fraction_projection(requested, c['constraint'])
    values = None if theta is None else fraction_evaluation(theta, c['objective'], c['a'], c['center'], c['lambda'])
    norm = None if values is None or not is_finite(values) else fraction_norm(values['gradient'])
    initial = dict(state(theta, values, norm), requestedStart=or_null(requested),
                   projectionCorrection=or_null(None if theta is None else tuple(theta[i] - requested[i] for i in (0, 1))))
    rows, accepted = [], 0
    if values is None or not is_finite((values, norm)):
        return finish(initial, rows, 'non-finite-initial', theta, values, norm, accepted)
    for k in range(c['iterations']):
        gradient = values['gradient']
        squared = sum(value ** 2 for value in gradient)
        if c['gradientTolerance'] > 0 and squared <= c['gradientTolerance'] ** 2:
            return finish(initial, rows, 'gradient-threshold', theta, values, norm, accepted)
        if squared == 0:
            return finish(initial, rows, 'zero-gradient', theta, values, norm, accepted)
        scale = c['clip'] / norm if c['clip'] > 0 and squared > c['clip'] ** 2 else F(1)
        applied = tuple(scale * value for value in gradient)
        applied_norm = fraction_norm(applied)
        update = tuple(-c['eta'] * value for value in applied)
        proposal = tuple(theta[i] + update[i] for i in (0, 1))
        next_point = fraction_projection(proposal, c['constraint']) if is_finite((update, proposal, applied_norm)) else None
        row = transition(k, theta, values, norm, applied, applied_norm, scale, update, proposal, next_point)
        rows.append(row)
        if not row['accepted']:
            return finish(initial, rows, 'non-finite-transition', theta, values, norm, accepted)
        next_values = fraction_evaluation(next_point, c['objective'], c['a'], c['center'], c['lambda'])
        next_norm = fraction_norm(next_values['gradient']) if is_finite(next_values) else None
        previous_loss = values['loss']
        theta, values, norm = next_point, next_values, next_norm
        accepted += 1
        if not is_finite((values, norm)):
            row['status'] = 'non-finite-evaluation'
            return finish(initial, rows, 'non-finite-evaluation', theta, values, norm, accepted)
        change = abs(values['loss'] - previous_loss)
        row.update(nextLoss=exported(values['loss']), lossChange=exported(change))
        if sum(value ** 2 for value in theta) > c['divergenceLimit'] ** 2:
            return finish(initial, rows, 'divergence', theta, values, norm, accepted)
        if c['lossTolerance'] > 0 and change <= c['lossTolerance']:
            return finish(initial, rows, 'loss-change', theta, values, norm, accepted)
    return finish(initial, rows, 'budget', theta, values, norm, accepted)


def decimal_trace(config=None):
    """Second reference: independent expanded losses and affine/flat recurrences."""
    c = trace_config({} if config is None else config)
    with localcontext() as context:
        context.prec = 80
        for key in ('a', 'center', 'lambda', 'eta', 'gradientTolerance', 'lossTolerance', 'clip', 'divergenceLimit'):
            c[key] = decimal(c[key])
        requested = None if c['start'] is None else tuple(decimal(v) for v in c['start'])
        theta = None if requested is None else decimal_projection(requested, c['constraint'])
        values = None if theta is None else decimal_evaluation(theta, c['objective'], c['a'], c['center'], c['lambda'])
        norm = None if values is None or not is_finite(values) else decimal_norm(values['gradient'])
        initial = dict(state(theta, values, norm), requestedStart=or_null(requested),
                       projectionCorrection=or_null(None if theta is None else tuple(theta[i] - requested[i] for i in (0, 1))))
        rows, accepted = [], 0
        if values is None or not is_finite((values, norm)):
            return finish(initial, rows, 'non-finite-initial', theta, values, norm, accepted)
        for k in range(c['iterations']):
            gradient = values['gradient']
            if c['gradientTolerance'] > 0 and norm <= c['gradientTolerance']:
                return finish(initial, rows, 'gradient-threshold', theta, values, norm, accepted)
            if all(value == 0 for value in gradient):
                return finish(initial, rows, 'zero-gradient', theta, values, norm, accepted)
            scale = min(Decimal(1), c['clip'] / norm) if c['clip'] > 0 else Decimal(1)
            applied = tuple(value * scale for value in gradient)
            applied_norm = decimal_norm(applied)
            update = tuple(-c['eta'] * value for value in applied)
            alpha = c['eta'] * scale
            if c['objective'] == 'quadratic':
                proposal = ((1 - alpha * (c['a'] + 2 * c['lambda'])) * theta[0] + alpha * c['a'] * c['center'],
                            (1 - alpha * (4 + 2 * c['lambda'])) * theta[1])
            elif c['objective'] == 'flat':
                proposal = tuple(value * (1 - alpha * (4 * value * value + 2 * c['lambda'])) for value in theta)
            else:
                proposal = ((1 - 2 * alpha * (1 + c['lambda'])) * theta[0],
                            (1 - 2 * alpha * (c['lambda'] - 1)) * theta[1])
            next_point = decimal_projection(proposal, c['constraint']) if is_finite((update, proposal, applied_norm)) else None
            row = transition(k, theta, values, norm, applied, applied_norm, scale, update, proposal, next_point)
            rows.append(row)
            if not row['accepted']:
                return finish(initial, rows, 'non-finite-transition', theta, values, norm, accepted)
            new_values = decimal_evaluation(next_point, c['objective'], c['a'], c['center'], c['lambda'])
            new_norm = decimal_norm(new_values['gradient']) if is_finite(new_values) else None
            previous_loss = values['loss']
            theta, values, norm = next_point, new_values, new_norm
            accepted += 1
            if not is_finite((values, norm)):
                row['status'] = 'non-finite-evaluation'
                return finish(initial, rows, 'non-finite-evaluation', theta, values, norm, accepted)
            change = abs(previous_loss - values['loss'])
            row.update(nextLoss=exported(values['loss']), lossChange=exported(change))
            if decimal_norm(theta) > c['divergenceLimit']:
                return finish(initial, rows, 'divergence', theta, values, norm, accepted)
            if c['lossTolerance'] > 0 and change <= c['lossTolerance']:
                return finish(initial, rows, 'loss-change', theta, values, norm, accepted)
        return finish(initial, rows, 'budget', theta, values, norm, accepted)


def fraction_text(value):
    return f'{value.numerator}/{value.denominator}'


def rational_history(config, accepted):
    """Independent affine recurrence; only for unclipped quadratic none/box paths."""
    c = trace_config(config)
    if c['objective'] != 'quadratic' or c['constraint'] == 'disk' or c['clip'] != 0 or c['start'] is None:
        raise ValueError('history requires a rational unclipped quadratic path')
    x, y = fraction_projection(c['start'], c['constraint'])
    hx, hy = c['a'] + 2 * c['lambda'], 4 + 2 * c['lambda']
    xstar = c['a'] * c['center'] / hx
    history = []
    for k in range(accepted + 1):
        # Completing the square avoids the primary loss expression.
        loss = hx * (x - xstar) ** 2 / 2 + hy * y ** 2 / 2 + c['a'] * c['lambda'] * c['center'] ** 2 / hx
        gradient = hx * (x - xstar), hy * y
        history.append(dict(k=k, point=[fraction_text(x), fraction_text(y)],
                            loss=fraction_text(loss), gradient=[fraction_text(v) for v in gradient]))
        if k < accepted:
            proposal = (1 - c['eta'] * hx) * x + c['eta'] * c['a'] * c['center'], (1 - c['eta'] * hy) * y
            x, y = fraction_projection(proposal, c['constraint'])
    return history


def build_fixture():
    projection_configs = [dict(point=list(point), constraint=constraint) for constraint, points in (
        ('none', [(0, 0), (.25, -.75), (1, 0), (3, 4), (1e200, -1e200)]),
        ('box', [(0, 0), (.5, -.75), (1, -1), (2, -3), (-2, 3), (1, .25), (-1.0001, .25), (1e200, -1e200)]),
        ('disk', [(0, 0), (.25, .25), (1, 0), (0, -1), (.6, .8), (2, -3), (3, 4), (-5, 12), (1e200, -1e200)]),
    ) for point in points]
    evaluation_configs = [dict(objective=objective, point=point, a=a, center=center, **{'lambda': penalty})
                          for objective, point, a, center, penalty in [
        ('quadratic', [0, 1], 1, 2, 0), ('quadratic', [0, 1], 1, 2, 1),
        ('quadratic', [.2, .4], 1, 2, 1), ('quadratic', [2, 0], 1, 2, 1),
        ('quadratic', [1, -1], 1, 2, .5), ('quadratic', [1.5, -.25], .25, -.5, .75),
        ('quadratic', [1, .5], 4, 1, 0), ('quadratic', [.02, .03], .01, -.01, .01),
        ('quadratic', [0, 0], 1, 0, 2), ('flat', [1, -2], 1, 0, .5),
        ('flat', [0, 0], 1, 0, 0), ('flat', [.5, -.25], 1, 0, 1),
        ('quadratic', [1e154, 0], 1, 0, 0), ('flat', [1e80, 0], 1, 0, 0),
        ('quadratic', [1e154, 0], 1, 0, 2), ('saddle', [1, -2], 1, 0, 0),
    ]]
    minimum_configs = [dict(a=a, center=center, **{'lambda': penalty}, constraint=constraint)
                       for a, center, penalty, constraint in [
        (1, 2, 0, 'none'), (1, 2, 1, 'none'), (1, 2, .5, 'none'),
        (.5, -1, .25, 'none'), (4, 1, 2, 'none'), (1, 2, 0, 'box'),
        (1, -2, 0, 'box'), (1, 2, 1, 'disk'), (1, 2, 0, 'disk'),
    ]]
    overrides = [
        dict(start=[0, 1], center=2, eta=1, constraint='box'),
        dict(start=[0, 1], center=2, eta=1, constraint='disk', iterations=1),
        dict(start=[0, 1], center=2, eta=.1, **{'lambda': 1}, iterations=8),
        dict(start=[2, -3], center=2, constraint='box', iterations=4),
        dict(start=[3, 4], eta=.1, constraint='disk', iterations=4),
        dict(start=[2, -3], iterations=4),
        dict(start=[-.5, .75], a=2, center=.25, **{'lambda': .5}, eta=.125, constraint='box', iterations=6),
        dict(start=[0, 1], center=2, eta=.125, clip=1, constraint='disk', iterations=4),
        dict(objective='flat', start=[.5, -.25], iterations=4),
        dict(objective='flat', start=[0, 0]),
        dict(objective='saddle', start=[0, 0]),
        dict(start=[0, 0]),
        dict(gradientTolerance=.1),
        dict(lossTolerance=.5),
        dict(iterations=2),
        dict(clip=1, iterations=4),
        dict(clip=10, iterations=2),
        dict(start=[2, 0], clip=2, iterations=2),
        dict(),
        dict(start=[2, 0], gradientTolerance=2),
        dict(start=[2, 0], lossTolerance=.875),
        dict(gradientTolerance=10, lossTolerance=1, clip=1),
        dict(eta=2, divergenceLimit=5, lossTolerance=100),
        dict(eta=2),
        dict(objective='flat', start=[3, 1], eta=2, divergenceLimit=1e300),
        dict(start=[1e150, 0], eta=1e200, divergenceLimit=1e300),
        dict(objective='flat', start=[1e80, 0], divergenceLimit=1e300),
        dict(objective='flat', start=[1e80, 0], eta=.125, constraint='box', iterations=2),
        dict(iterations=0),
        dict(start=[1, 0], center=2, constraint='box', lossTolerance=.01),
    ]
    traces = []
    for override in overrides:
        config = dict(DEFAULTS, **override)
        result = trace(config)
        if (config['objective'] == 'quadratic' and config['constraint'] != 'disk' and config['clip'] == 0
                and result['reason'] not in ('non-finite-initial', 'non-finite-transition', 'non-finite-evaluation')):
            result['exactHistory'] = rational_history(config, result['acceptedSteps'])
        traces.append(dict(config=config, expected=result))
    return dict(policy=POLICY,
                projections=[dict(config=c, expected=project(**c)) for c in projection_configs],
                penalties=dict(evaluations=[dict(config=c, expected=evaluate(c)) for c in evaluation_configs],
                               minimizers=[dict(config=c, expected=minimizer(c)) for c in minimum_configs]),
                traces=traces)


def render(data):
    return json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write', action='store_true', help='generate the fixture from independent Python mathematics')
    mode.add_argument('--check', action='store_true', help='check exact byte freshness without writing (default)')
    args = parser.parse_args(argv)
    data = build_fixture()
    expected = render(data).encode('utf-8')
    if args.write:
        FIXTURE.write_bytes(expected)
    elif not FIXTURE.exists() or FIXTURE.read_bytes() != expected:
        print('optimization_constraints fixture stale or missing; run python oracle/optimization_constraints_oracle.py --write', file=sys.stderr)
        return 1
    counts = (len(data['projections']), len(data['penalties']['evaluations']),
              len(data['penalties']['minimizers']), len(data['traces']))
    print(f'optimization_constraints: {counts[0]} projections, {counts[1]} penalty evaluations, '
          f'{counts[2]} minimizers, {counts[3]} traces; fixture {"written" if args.write else "fresh"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
