"""Independent limit/continuity oracle for III.1 and III.2.

Different algorithms from the browser (which divides out common factors (x - a)):
  * a finite limit of a rational piece num/den is found by repeated DIFFERENTIATION of numerator and denominator (L'Hopital on
    polynomials, exact Fractions) until the denominator derivative is nonzero;
  * the sign of an unbounded side comes from exact evaluation at a -/+ 10^-30;
  * sin(1/x) is classified by two explicit sequences with 60-digit Decimal sines that approach 0 and disagree;
  * x sin(1/x) is classified by the squeeze bound |x sin(1/x)| <= |x|.
Writes fixtures/limits.fixtures.json; `--check` fails when the committed fixture is stale.
"""
from decimal import Decimal as D, getcontext
from fractions import Fraction as F
from pathlib import Path
import json
import sys

getcontext().prec = 60
FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/limits.fixtures.json'
TINY = F(1, 10**30)


def ev(c, x):
    return sum(ck * x**k for k, ck in enumerate(c))


def der(c):
    return [k * ck for k, ck in enumerate(c)][1:]


def fstr(q):
    return f'{q.numerator}' if q.denominator == 1 else f'{q.numerator}/{q.denominator}'


def rational_limit(num, den, a, side):
    n, d = num, den
    for _ in range(8):
        if ev(d, a) != 0:
            return {'kind': 'finite', 'exact': fstr(ev(n, a) / ev(d, a))}
        if ev(n, a) != 0:
            x = a - TINY if side == 'left' else a + TINY
            return {'kind': 'infinite', 'sign': 1 if ev(num, x) / ev(den, x) > 0 else -1}
        n, d = der(n), der(d)
    raise ValueError('degenerate rational piece')


# Each piece: (lo, hi, lo_closed, hi_closed, num, den); None = unbounded.
def pieces_value(pieces, points, x):
    for px, value in points:
        if px == x:
            return None if value is None else value
    for lo, hi, lc, hc, num, den in pieces:
        if (lo is None or x > lo or (lc and x == lo)) and (hi is None or x < hi or (hc and x == hi)):
            dv = ev(den, x)
            return None if dv == 0 else ev(num, x) / dv
    return None


def pieces_limit(pieces, a, side):
    for lo, hi, lc, hc, num, den in pieces:
        covers = ((lo is None or lo < a) and (hi is None or hi >= a)) if side == 'left' else ((lo is None or lo <= a) and (hi is None or hi > a))
        if covers:
            return rational_limit(num, den, a, side)
    return {'kind': 'none', 'cause': 'domain'}


ONE = [F(1)]
CATALOG = {
    'hole': ([(None, None, False, False, [F(-1), F(0), F(1)], [F(-1), F(1)])], []),
    'moved': ([(None, None, False, False, [F(1), F(1)], ONE)], [(F(1), F(3))]),
    'jump': ([(None, F(0), False, False, [F(-1)], ONE), (F(0), None, True, False, [F(1)], ONE)], []),
    'recip-square': ([(None, None, False, False, [F(1)], [F(0), F(0), F(1)])], []),
    'recip': ([(None, None, False, False, [F(1)], [F(0), F(1)])], []),
    'smooth': ([(None, None, False, False, [F(0), F(0), F(1, 2)], ONE)], []),
    'shifted-pole': ([(None, None, False, False, [F(1)], [F(-1), F(1)])], []),
}


def join(c, m, mode, v):
    value = {'left': 1 + c, 'right': m, 'custom': v, 'none': None}[mode]
    return ([(None, F(1), False, False, [c, F(0), F(1)], ONE), (F(1), None, False, False, [F(0), m], ONE)], [(F(1), value)])


def classify(value, left, right):
    if left['kind'] == right['kind'] == 'finite':
        if left['exact'] != right['exact']:
            return 'jump'
        return 'continuous' if value is not None and fstr(value) == left['exact'] else 'removable'
    if 'infinite' in (left['kind'], right['kind']):
        return 'infinite'
    if left.get('cause') == 'oscillation' or right.get('cause') == 'oscillation':
        return 'oscillation'
    return 'outside' if left['kind'] == right['kind'] == 'none' else 'one-sided'


def analyse(pieces, points, a):
    value = pieces_value(pieces, points, a)
    left, right = pieces_limit(pieces, a, 'left'), pieces_limit(pieces, a, 'right')
    return {'value': None if value is None else fstr(value), 'left': left, 'right': right, 'kind': classify(value, left, right)}


PI = D('3.14159265358979323846264338327950288419716939937510582097494459230781640628620899')


def dsin(x):
    x = D(x) % (2 * PI)                     # argument reduction with an 80-digit pi
    term = total = x; k = 1
    while abs(term) > D(10) ** -58:
        term = -term * x * x / ((2 * k) * (2 * k + 1)); total += term; k += 1
    return total


def special(fn, a):
    """sin(1/x) and x sin(1/x) at a = 0, decided by explicit sequences / the squeeze bound."""
    pi = PI
    if fn == 'oscillation':
        zeros = [dsin(k * pi) for k in range(1000, 1004)]                        # x = 1/(k pi)
        ones = [dsin(pi / 2 + 2 * k * pi) for k in range(1000, 1004)]             # x = 2/((4k+1) pi)
        assert all(abs(z) < D(10) ** -50 for z in zeros) and all(abs(o - 1) < D(10) ** -50 for o in ones)
        side = {'kind': 'none', 'cause': 'oscillation'}
        return {'value': None, 'left': side, 'right': side, 'kind': 'oscillation'}
    # squeeze: |x sin(1/x)| <= |x| for the samples, and |x| -> 0
    for k in range(1, 30):
        x = D(1) / D(2) ** k
        assert abs(x * dsin(1 / x)) <= x
    zero = {'kind': 'finite', 'exact': '0'}
    return {'value': None, 'left': zero, 'right': zero, 'kind': 'removable'}


def cases():
    out = []
    for fn, (pieces, points) in CATALOG.items():
        for a in ['-1', '0', '0.5', '1', '2.25']:
            out.append({'fn': fn, 'a': a, **analyse(pieces, points, F(a))})
    for fn in ['oscillation', 'squeeze']:
        out.append({'fn': fn, 'a': '0', **special(fn, F(0))})
    for c in ['-1', '0', '1', '1.5']:
        for m in ['0', '2', '2.5']:
            for mode in ['left', 'right', 'custom', 'none']:
                pieces, points = join(F(c), F(m), mode, F(2))
                for a in ['1', '-1']:
                    out.append({'fn': 'join', 'c': c, 'm': m, 'mode': mode, 'v': '2', 'a': a, **analyse(pieces, points, F(a))})
    return out


def build():
    return {'method': "exact L'Hopital on polynomial pieces; sign at a -/+ 1e-30; explicit Decimal(60) sequences for sin(1/x); squeeze for x sin(1/x)",
            'tolerance': 'all decisions and values are exact and must match exactly', 'cases': cases()}


def main():
    text = json.dumps(build(), indent=1) + '\n'
    if '--check' in sys.argv:
        if not FIXTURE.exists() or FIXTURE.read_text() != text:
            raise SystemExit('limits fixture stale: run python oracle/limits_oracle.py')
        print(f"limits: {len(build()['cases'])} limit/continuity cases fresh")
    else:
        FIXTURE.write_text(text)


if __name__ == '__main__':
    main()
