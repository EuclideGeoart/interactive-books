"""Generate deterministic NumPy goldens only after independent rational agreement."""
import argparse
from copy import deepcopy
import json
import math
from pathlib import Path
import sys

import linear_regression_oracle as oracle

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "code/python/p02"))
import linear_regression as reference

FIXTURE = ROOT / "fixtures/p02/linear-regression.fixtures.json"
ABSOLUTE_TOLERANCE = RELATIVE_TOLERANCE = 1e-12


def assert_close(actual, expected, path="result"):
    if isinstance(expected, dict):
        assert actual.keys() == expected.keys(), path
        for key in expected:
            assert_close(actual[key], expected[key], f"{path}.{key}")
    elif isinstance(expected, list):
        assert len(actual) == len(expected), path
        for index, (left, right) in enumerate(zip(actual, expected)):
            assert_close(left, right, f"{path}[{index}]")
    elif isinstance(expected, (int, float)):
        assert math.isfinite(actual) and abs(actual - expected) <= (
            ABSOLUTE_TOLERANCE + RELATIVE_TOLERANCE * abs(expected)
        ), f"{path}: {actual} != {expected}"
    else:
        assert actual == expected, path


def cases():
    def state(points, weight, bias, rate):
        return dict(samples=[dict(id=f"s{i}", x=x, y=y) for i, (x, y) in enumerate(points, 1)],
                    weight=weight, bias=bias, learningRate=rate)

    return [
        ("canonical", deepcopy(reference.CANONICAL_REGRESSION), 5),
        ("asymmetric", state([(-2, 1), (1, 4)], 0.5, -1, 0.2), 2),
        ("one-sample", state([(2, 3)], 0, 0, 0.1), 2),
        ("constant-x", state([(2, 1), (2, 3)], 0, 0, 0.1), 2),
        ("perfect-fit", state([(-1, -1), (0, 1), (1, 3)], 2, 1, 0.1), 2),
        ("finite-divergence", state([(2, 1)], 0, 0, 1), 2),
        ("small-scale", state([(1, 1e-150)], 0, 0, 0.1), 2),
    ]


def build_fixture():
    oracle.literal_self_tests()
    rows = []
    for identifier, state, steps in cases():
        actual = {
            "before": reference.derive_regression(state),
            "after": reference.derive_regression(reference.regression_step(state)),
            "trace": reference.regression_trace(state, steps),
        }
        expected = oracle.numbers({
            "before": oracle.derive(state), "after": oracle.derive(oracle.step(state)),
            "trace": oracle.trace(state, steps),
        })
        assert_close(actual, expected, identifier)
        rows.append(dict(id=identifier, state=state, steps=steps, **actual))
    return {
        "policy": {
            "provenance": "Explicit hand-authored toy datasets; no downloaded or measured data.",
            "arithmetic": "NumPy float64; independently checked with exact Fraction data-moment expansion.",
            "residual": "prediction - target",
            "loss": "mean squared error, without a one-half factor",
            "tolerance": {"absolute": ABSOLUTE_TOLERANCE, "relative": RELATIVE_TOLERANCE},
            "trace": "Initial state plus each update; at most 20 updates.",
        },
        "cases": rows,
    }


def render(fixture):
    return (json.dumps(fixture, indent=2, ensure_ascii=False, allow_nan=False) + "\n").encode("utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    expected = render(build_fixture())
    if args.check:
        if not FIXTURE.is_file() or FIXTURE.read_bytes() != expected:
            print(f"Missing or stale fixture: {FIXTURE}", file=sys.stderr)
            return 1
        print(f"Fresh fixture: {FIXTURE}")
    elif args.write:
        FIXTURE.parent.mkdir(parents=True, exist_ok=True)
        FIXTURE.write_bytes(expected)
        print(f"Wrote fixture: {FIXTURE}")
    else:
        sys.stdout.write(expected.decode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
