"""Deterministic literal fixture spec/freshness check. Author did not execute.
--check recomputes each expected payload independently; formatting is immaterial.
Without --check it updates ONLY this Part's expected fields from the same inputs.
"""
import argparse
import json
import math
from pathlib import Path
from independent import expected
ROOT = Path(__file__).resolve().parents[2]
DEFAULT = ROOT/"fixtures/p05/clustering.json"


def compare(actual, wanted, path="value"):
    if isinstance(wanted, dict):
        if not isinstance(actual, dict) or set(actual) != set(wanted):
            raise AssertionError(f"{path}: wrong object keys")
        for k in wanted:
            compare(actual[k], wanted[k], path+"."+k)
    elif isinstance(wanted, list):
        if not isinstance(actual, list) or len(actual) != len(wanted):
            raise AssertionError(f"{path}: wrong shape")
        for i, (a,b) in enumerate(zip(actual,wanted)):
            compare(a,b,f"{path}[{i}]")
    elif isinstance(wanted, bool) or isinstance(wanted, str) or wanted is None:
        if type(actual) is not type(wanted) or actual != wanted:
            raise AssertionError(f"{path}: {actual!r} != {wanted!r}")
    else:
        if isinstance(actual, bool) or not isinstance(actual, (int,float)) or not math.isfinite(actual) or not math.isclose(actual, wanted, rel_tol=1e-12, abs_tol=1e-12):
            raise AssertionError(f"{path}: {actual!r} != {wanted!r}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--output", type=Path, default=DEFAULT)
    args = parser.parse_args()
    document = json.loads(DEFAULT.read_text())
    for case in document["cases"]:
        independent = expected(case["input"])
        if args.check:
            compare(case["expected"], independent, case["name"])
        else:
            case["expected"] = independent
    if not args.check:
        args.output.write_text(json.dumps(document, indent=2, allow_nan=False)+"\n")
    else:
        print("Part V independent fixture freshness passed.")
