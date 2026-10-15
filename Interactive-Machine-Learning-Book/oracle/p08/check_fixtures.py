"""Owner-only stale-literal check. No generation/activation step is required."""
import argparse
import json
import math
from independent import ROOT, canonical, near, verify_fit, verify_metrics, verify_split


def check():
    fixture = json.loads((ROOT / "fixtures/p08/evaluation.fixtures.json").read_text())
    m = fixture["metric"]
    actual = verify_metrics(canonical.DATA["probabilities"], m["threshold"])
    for key, value in m["expected"].items():
        near(actual[key], value)
    assert [b["count"] for b in actual["bins"]] == m["binCounts"]
    c = fixture["leakage"]
    proper = verify_fit(c["rows"], c["train"], 1, 1)
    leaked = verify_fit(c["rows"], c["train"], 1, 1, c["train"]+c["validation"])
    for model, expected in ((proper, c["proper"]), (leaked, c["leaked"])):
        for k in ("impute", "center"):
            near(model["preprocessing"][k], expected[k])
        for k in ("slope", "intercept", "trainingMse", "objective"):
            if k in expected:
                near(model[k], expected[k])
        score = canonical.evaluate(c["rows"], c["validation"], model)
        near(score["mse"], expected["heldOutMse"])
        for r, p in zip(score["rows"], expected["predictions"]):
            near(r["prediction"], p)
    near(leaked["preprocessing"]["scale"]**2, c["leaked"]["variance"])
    near(leaked["slope"]**2, c["leaked"]["slopeSquared"])
    near(canonical.evaluate(c["rows"], c["validation"], leaked)["mse"]-canonical.evaluate(c["rows"], c["validation"], proper)["mse"], c["difference"])
    board = verify_split(canonical.DATA["rows"], 0, 3)
    for key in ("groups", "draws", "test"):
        assert board[key] == fixture["seedZero"][key]
    assert [f["validation"] for f in board["folds"]] == fixture["seedZero"]["validation"]
    b = fixture["binary64"]
    n = canonical.numerics(b["t"], b["delta"])
    for key in ("left", "right", "fragile"):
        assert n[key] == b[key]
    near(n["stable"], b["stable"], atol=0)
    for name in ("zeroTrueClassProbability", "logScore"):
        case = fixture[name]
        actual = verify_metrics(case["rows"], case["threshold"])
        if "expected" in case:
            for k, value in case["expected"].items():
                if value is None:
                    assert actual[k] is None
                else:
                    near(actual[k], value)
        else:
            near(actual["logLoss"], case["expectedLogLoss"]); near(actual["brier"], case["expectedBrier"])
    return 6


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", required=True)
    parser.parse_args()
    print(f"Part VIII independent literal families checked: {check()}")
