"""Owner-only freshness checker of literal expectations; never rewrites them."""
import argparse
import importlib.util
import json
from independent import ROOT, exact_forward, near


def load_canonical():
    spec = importlib.util.spec_from_file_location("p09_canonical", ROOT / "code/python/p09/forward.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def check():
    cases = json.loads((ROOT / "fixtures/p09/forward.fixtures.json").read_text())["cases"]
    examples = json.loads((ROOT / "data/p09/examples.json").read_text())
    by_name = {c["name"]: c for c in cases}
    assert examples["neuron"] == by_name["negative ReLU"]["input"]
    assert examples["network"] == by_name["XOR 10"]["input"]
    assert examples["binary"] == [[0, 0], [0, 1], [1, 0], [1, 1]]
    canonical = load_canonical()
    for case in cases:
        expected = exact_forward(case["input"])
        near(expected, case["expected"], case["exact"])
        near(canonical.forward(case["input"]), expected, case["exact"])
    return len(cases)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", required=True)
    parser.parse_args()
    print(f"Part IX literal cases independently checked: {check()}")
