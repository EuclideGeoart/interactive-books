"""Owner-only --check command. Hand literals are never rewritten/generated."""
import argparse
import json
from independent import ROOT, canonical, near, verify, gram, exact_hard_feasibility
from fractions import Fraction


def check():
    fixture = json.loads((ROOT / "fixtures/p07/svm.fixtures.json").read_text())
    for case in fixture["cases"]:
        actual = verify(case["input"])
        for key, value in case["expected"].items():
            got = [r[{"scores": "score", "distances": "signedDistance", "hinges": "hinge"}[key]] for r in actual["rows"]] if key in ("scores", "distances", "hinges") else actual[key]
            if isinstance(value, str) or value is None or isinstance(value, list) and any(v is None for v in value):
                assert got == value, (case["name"], key, got, value)
            else:
                near(got, value)
    h = fixture["hinge"]
    for m, loss, subgradient in zip(h["margins"], h["losses"], h["subgradients"]):
        assert canonical.hinge(m) == dict(loss=loss, subgradient=subgradient)
    e = fixture["kernelEntries"]
    for kind, field, offset in (("linear", "linear", 1), ("polynomial", "polynomialOffset1Degree2", 1), ("rbf", "rbfGamma1", 1)):
        near(canonical.kernel_value(e["a"], e["b"], dict(kind=kind, gamma=1, coef0=offset, degree=2)), e[field])
    review = json.loads((ROOT / "fixtures/p07/review-regressions.json").read_text())
    failure = review["diagnosticFailure"]
    near(gram(failure["input"]), failure["gram"], atol=0, rtol=0)
    actual = canonical.svm(failure["input"])
    assert actual["status"] == failure["status"]
    assert actual["kkt"] > failure["kktLowerBound"]
    narrow = review["orientation"]["input"]
    A, B, P = [[Fraction.from_float(float(v)) for v in p["x"]] for p in narrow["points"]]
    determinant = (B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0])
    assert determinant == Fraction(1, 2 ** 104)
    assert exact_hard_feasibility(narrow)["feasible"] is review["orientation"]["exactHardFeasible"]
    try:
        actual = canonical.svm(narrow)
    except ValueError as error:
        assert any(word in str(error) for word in ("unresolved", "representable", "underflow", "negative"))
    else:
        assert actual["status"] == "failed"
    return len(fixture["cases"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", required=True)
    parser.parse_args()
    print(f"Independent literal SVM scenarios checked: {check()}")
