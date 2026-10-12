"""Independent seeded Block C oracle. Default --check compares deterministic fixtures.

Numerical comparison tolerance is distinct from statistical sampling error:
finite realizations illustrate laws, never establish convergence or normality.
"""
import argparse
from fractions import Fraction as F
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'fixtures/probability_sampling.fixtures.json'
WIDTH = 8/24
POLICY = {
    'generator': 'uint32 LCG: state=(1664525*state+1013904223)%2**32; u=state/2**32; return updated state first',
    'sources': 'Bernoulli u<p/100, uniform u in [0,1), exponential -log1p(-u); p has at most two decimal places',
    'moments': 'Population mean/variance exact Fraction strings; empirical variance uses denominator repetitions',
    'lln': '1..4000 trials, actual ordered prefix sums; errorIncreases counts strict increases of absolute error',
    'clt': 'n=1..100, repetitions=10..1000; continuously consumed stream; dependent repeats one draw within each block',
    'standardization': 'z=sqrt(n)*(mean-populationMean)/sigma; null for zero variance; dependent still uses iid scale for comparison',
    'histogram': '24 bins [-4,4), width=8/24; floor((z+4)/width), capped at 23 only for z<4; underflow z<-4, overflow z>=4',
    'density': 'count/(repetitions*width); tails retain their mass, no in-window renormalization',
    'fixtureArrays': 'First min(trials,24) LLN prefixes; first min(repetitions,24) CLT sums/means/z; first three complete blocks; aggregate summaries cover whole run',
    'numericalTolerance': '2e-12*max(1,abs(expected)) for binary64 arithmetic/log cross-language comparisons; counts and LCG uniforms exact',
    'statisticalError': 'No guaranteed realized error or Gaussian fit; sigma/sqrt(m) is theoretical iid mean SD, not a confidence guarantee',
    'dependentCounterexample': 'Within-block dependence gives Var(mean)=population variance, instead of variance/n; CLT assumptions violated',
}


def rational(value):
    return f'{value.numerator}/{value.denominator}'


def integer(value, lo, hi, name):
    if type(value) is not int or not lo <= value <= hi:
        raise ValueError(f'{name} must be an integer in [{lo},{hi}]')
    return value


def uniforms(seed):
    state = integer(seed, 0, 2**32-1, 'seed')
    while True:
        state = (1664525*state+1013904223) % 2**32
        yield state/2**32


def population(kind, p):
    if kind not in ('bernoulli', 'uniform', 'exponential'):
        raise ValueError('unknown source kind')
    if type(p) not in (int, float) or not 0 <= p <= 100 or not math.isfinite(p):
        raise ValueError('p must be a finite percentage in [0,100]')
    fraction = F(str(p))
    if (fraction*100).denominator != 1:
        raise ValueError('p requires at most two decimal places')
    prob = fraction/100
    return (prob, prob*(1-prob)) if kind == 'bernoulli' else ((F(1,2), F(1,12)) if kind == 'uniform' else (F(1), F(1)))


def draw(kind, p, u):
    return float(u < p/100) if kind == 'bernoulli' else (u if kind == 'uniform' else -math.log1p(-u))


def lln(kind='bernoulli', p=35, seed=42, trials=100):
    mean, variance = population(kind, p)
    integer(trials, 1, 4000, 'trials')
    stream = uniforms(seed)
    sums, means, deviations, observations = [], [], [], []
    total, previous_error, increases = 0.0, None, 0
    for i in range(trials):
        value = draw(kind,p,next(stream))
        total += value
        average = total/(i+1)
        deviation = abs(average-float(mean))
        if previous_error is not None and deviation > previous_error:
            increases += 1
        previous_error = deviation
        if i < 24:
            observations.append(value)
            sums.append(total)
            means.append(average)
            deviations.append(deviation)
    return dict(populationMean=rational(mean), populationVariance=rational(variance),
                prefixLength=len(means), observations=observations, sums=sums, means=means, deviations=deviations,
                finalSum=total, finalMean=total/trials, finalDeviation=previous_error,
                errorIncreases=increases, standardError=math.sqrt(float(variance)/trials))


def clt(kind='bernoulli', p=35, seed=42, n=10, repetitions=100, dependent=False):
    mean, variance = population(kind,p)
    integer(n,1,100,'n')
    integer(repetitions,10,1000,'repetitions')
    if type(dependent) is not bool:
        raise ValueError('dependent must be a boolean')
    stream = uniforms(seed)
    all_means, first_blocks, sums, means, zs = [], [], [], [], []
    counts, underflow, overflow = [0]*24, 0, 0
    sigma = math.sqrt(float(variance))
    for rep in range(repetitions):
        if dependent:
            value = draw(kind,p,next(stream))
            block = [value]*n
        else:
            block = [draw(kind,p,next(stream)) for _ in range(n)]
        total = 0.0
        for value in block:
            total += value
        average = total/n
        all_means.append(average)
        z = math.sqrt(n)*(average-float(mean))/sigma if sigma else None
        if z is not None:
            if z < -4:
                underflow += 1
            elif z >= 4:
                overflow += 1
            else:
                counts[min(23,math.floor((z+4)/WIDTH))] += 1
        if rep < 3:
            first_blocks.append(block)
        if rep < 24:
            sums.append(total)
            means.append(average)
            zs.append(z)
    empirical_mean = sum(all_means)/repetitions
    empirical_variance = sum((x-empirical_mean)**2 for x in all_means)/repetitions
    return dict(populationMean=rational(mean), populationVariance=rational(variance),
                meanVariance=rational(variance if dependent else variance/n), iidMeanVariance=rational(variance/n),
                assumptionsSatisfied=not dependent, standardized=sigma != 0,
                prefixLength=len(means), firstBlocks=first_blocks, sums=sums, means=means, z=zs,
                counts=counts if sigma else [], densities=[c/(repetitions*WIDTH) for c in counts] if sigma else [],
                underflow=underflow, overflow=overflow, empiricalMean=empirical_mean, empiricalVariance=empirical_variance)


def build_fixture():
    lln_inputs = [dict(kind=kind,p=p,seed=seed,trials=trials)
                  for kind,p in [('bernoulli',35),('uniform',35),('exponential',35)]
                  for seed,trials in [(0,1),(1,2),(42,12),(2026,24),(2**32-1,31),(123,200),(17,4000),(7,63)]]
    lln_inputs += [dict(kind='bernoulli',p=p,seed=seed,trials=t)
                   for p,seed,t in [(0,42,24),(100,42,24),(0.01,0,4000),(99.99,2**32-1,4000),
                                    (50,42,32),(12.5,7,19),(1,123,25),(99,123,25)]]
    clt_inputs = [dict(kind=kind,p=p,seed=seed,n=n,repetitions=r,dependent=False)
                  for kind,p in [('bernoulli',35),('uniform',35),('exponential',35)]
                  for seed,n,r in [(0,1,10),(42,2,12),(7,5,24),(2026,10,31),(2**32-1,30,40),(123,100,1000),(1,1,1000),(17,40,100)]]
    clt_inputs += [dict(kind=kind,p=p,seed=42,n=n,repetitions=40,dependent=True)
                   for kind,p in [('bernoulli',35),('uniform',35),('exponential',35)] for n in [1,10,100]]
    clt_inputs += [dict(kind='bernoulli',p=p,seed=seed,n=n,repetitions=r,dependent=False)
                   for p,seed,n,r in [(0,42,100,10),(100,42,100,10),(0.01,0,100,100),
                                     (99.99,2**32-1,100,100),(50,42,1,32),(50,42,4,32),
                                     (50,42,16,32),(50,42,64,32),(12.5,7,8,24),(1,0,100,30),(99,0,100,30)]]
    return dict(policy=POLICY, lln=[dict(**i,expected=lln(**i)) for i in lln_inputs],
                clt=[dict(**i,expected=clt(**i)) for i in clt_inputs])


def render(data):
    return json.dumps(data, indent=2, allow_nan=False) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write',action='store_true')
    mode.add_argument('--check',action='store_true')
    args = parser.parse_args(argv)
    data = build_fixture()
    expected = render(data)
    if args.write:
        with FIXTURE.open('w', encoding='utf-8', newline='\n') as handle:
            handle.write(expected)
    elif not FIXTURE.exists() or FIXTURE.read_text(encoding='utf-8') != expected:
        print('probability_sampling fixture stale or missing; run oracle/probability_sampling_oracle.py --write',file=sys.stderr)
        return 1
    print(f'probability_sampling: {len(data["lln"])} LLN, {len(data["clt"])} CLT cases; fixture {"written" if args.write else "fresh"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
