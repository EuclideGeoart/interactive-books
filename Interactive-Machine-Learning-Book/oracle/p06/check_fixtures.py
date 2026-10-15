"""Check committed independent literals AND actual canonical against Fraction/SVD.

No fixture generation is needed: expected invariants were calculated by hand.
"""
import argparse
import json
import numpy as np
from independent import ROOT, near, verify


def check():
    fixture = json.loads((ROOT / "fixtures/p06/pca.fixtures.json").read_text())
    for case in fixture["cases"]:
        actual, expected = verify(case["input"]), case["expected"]
        assert actual["status"] == expected["status"], case["name"]
        for key, value in expected.items():
            if key in ("status", "minorRelativeTolerance"):
                continue
            if key == "projector":
                axis = np.asarray(actual["axes"][0])
                near(np.outer(axis, axis), value)
            elif key == "reconstructed":
                near([r[key] for r in actual["rows"]], value)
            elif value is None or isinstance(value, bool):
                assert actual[key] == value, (case["name"], key)
            else:
                near(actual[key], value)
        if "minorRelativeTolerance" in expected:
            # Absolute tolerance must not allow a fabricated zero small eigenvalue.
            near(actual["eigenvalues"][1], expected["eigenvalues"][1], atol=0, rtol=expected["minorRelativeTolerance"])
            near(actual["sse"], expected["sse"], atol=0, rtol=expected["minorRelativeTolerance"])
    return len(fixture["cases"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", required=True)
    parser.parse_args()
    print(f"Independent hand-authored PCA fixture cases checked: {check()}")
