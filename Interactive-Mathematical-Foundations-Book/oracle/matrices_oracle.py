"""II.8–II.13 oracle: Fraction rows/columns, shoelace area, and row elimination."""
from fractions import Fraction as F
from pathlib import Path
import argparse
import json
import random


def q(value):
    return F(str(value))


def rows(values):
    return [list(map(q, row)) for row in values]


def vector(values):
    return list(map(q, values))


def matvec(a, x):
    if not a or len(a[0]) != len(x):
        return None
    return [sum((entry * value for entry, value in zip(row, x)), F(0)) for row in a]


def matmul(left, right):
    if not left or not right or len(left[0]) != len(right):
        return None
    columns = list(zip(*right))
    return [[sum((x * y for x, y in zip(row, column)), F(0)) for column in columns] for row in left]


def det2(a):
    # Signed shoelace area of 0, first column, first+second column, second column.
    c1, c2 = (a[0][0], a[1][0]), (a[0][1], a[1][1])
    polygon = [(F(0), F(0)), c1, (c1[0] + c2[0], c1[1] + c2[1]), c2]
    return sum(x*y2 - y*x2 for (x, y), (x2, y2) in zip(polygon, polygon[1:] + polygon[:1])) / 2


def solve2(a, rhs):
    """Exact row elimination, separate from the browser's Cramer numerators."""
    augmented = [a[0][:] + [rhs[0]], a[1][:] + [rhs[1]]]
    pivot = next((j for j in range(2) if augmented[0][j] or augmented[1][j]), None)
    if pivot is None:
        return {'kind': 'infinite' if not any(rhs) else 'none', 'solution': None}
    if not augmented[0][pivot]:
        augmented.reverse()
    factor = augmented[1][pivot] / augmented[0][pivot]
    augmented[1] = [y - factor*x for x, y in zip(augmented[0], augmented[1])]
    second = next((j for j in range(pivot + 1, 2) if augmented[1][j]), None)
    if second is None:
        return {'kind': 'infinite' if not augmented[1][2] else 'none', 'solution': None}
    y = augmented[1][2] / augmented[1][second]
    x = (augmented[0][2] - augmented[0][second] * y) / augmented[0][pivot]
    solution = [None, None]
    solution[pivot], solution[second] = x, y
    return {'kind': 'unique', 'solution': solution}


def serial(value):
    if isinstance(value, F):
        return str(value)
    if isinstance(value, dict):
        return {key: serial(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [serial(item) for item in value]
    return value


def matrix_case(a_values, b_values, x_values, translation=(0, 0)):
    a, b, x, t = rows(a_values), rows(b_values), vector(x_values), vector(translation)
    ax = matvec(a, x)
    ba = matmul(b, a)
    out = {
        'ax': ax,
        'ba': ba,
        'transpose': list(map(list, zip(*a))),
        'affine': [u + v for u, v in zip(ax, t)] if ax is not None and len(ax) == len(t) else None,
    }
    if len(a) == 2 and len(a[0]) == 2:
        determinant = det2(a)
        columns = list(zip(*a))
        out.update(det=determinant, orthogonal=(sum(z*z for z in columns[0]) == 1 and sum(z*z for z in columns[1]) == 1 and sum(u*v for u, v in zip(*columns)) == 0))
    return {'input': {'a': a_values, 'b': b_values, 'x': x_values, 'translation': list(translation)}, 'expected': serial(out)}


def fixture():
    rng = random.Random(61313)
    cases = [
        matrix_case([[1, 1], [0, 1]], [[1, 0], [1, 1]], [2, 1], [1, -2]),
        matrix_case([[0, -1], [1, 0]], [[1, 0], [0, -1]], [3, 2]),
        matrix_case([[1, 2], [2, 4]], [[2, 0], [0, 1]], [1, -1]),
        matrix_case([[1, 2, 3], [0, -1, 2]], [[2, 0], [1, 1]], [2, 1, -1]),
        matrix_case([[1, 0], [2, 1], [-1, 3]], [[1, 2, 0], [0, 1, 1]], [2, -1]),
        matrix_case([[1, 0], [2, 1], [-1, 3]], [[1, 0], [0, 1]], [2, -1]),
    ]
    for _ in range(30):
        a = [[rng.randint(-4, 4) for _ in range(2)] for _ in range(2)]
        b = [[rng.randint(-3, 3) for _ in range(2)] for _ in range(2)]
        x = [rng.randint(-4, 4) for _ in range(2)]
        t = [rng.randint(-2, 2) for _ in range(2)]
        cases.append(matrix_case(a, b, x, t))
    systems = []
    samples = [
        ([[1, 1], [1, -1]], [3, 1]), ([[1, 0], [0, 1]], [2, -3]),
        ([[1, 1], [2, 2]], [1, 3]), ([[1, 1], [2, 2]], [1, 2]),
        ([[0, 0], [0, 0]], [0, 0]), ([[0, 0], [0, 0]], [0, 1]),
        ([[0, 0], [1, 0]], [0, 2]), ([[0, 0], [1, 0]], [1, 2]),
    ]
    for a, rhs in samples:
        systems.append({'input': {'a': a, 'rhs': rhs}, 'expected': serial(solve2(rows(a), vector(rhs)))})
    return {'policy': 'Every expected scalar is an exact Fraction string. Products use row/column pairing; determinants use signed shoelace area; systems use row elimination.', 'cases': cases, 'systems': systems}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    target = Path(__file__).resolve().parents[1] / 'fixtures/matrices.fixtures.json'
    content = json.dumps(fixture(), indent=2, allow_nan=False) + '\n'
    if args.check:
        if not target.exists() or target.read_text() != content:
            raise SystemExit('matrices.fixtures.json is stale')
        print('matrices: 36 matrix cases + 8 exact systems fresh')
    else:
        target.write_text(content)
