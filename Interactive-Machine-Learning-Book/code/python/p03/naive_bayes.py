"""Bernoulli Naive Bayes: editable sufficient counts, evidence mask and log ledger."""
import copy
import json
import math
from fractions import Fraction
import numpy as np
from common import number

CANONICAL = {"classes":[{"id":"A","priorWeight":.6,"count":6,"positive":[4,1]},
                        {"id":"B","priorWeight":.4,"count":4,"positive":[1,3]}],
             "query":[1,1],"observed":[True,True],"alpha":1,"provenance":"Hand-authored ten-row Bernoulli toy counts"}

def _exact_score(c,state):
    score=Fraction.from_float(float(c["priorWeight"]))
    if score == 0:
        return score
    alpha=Fraction.from_float(float(state["alpha"]))
    denominator=Fraction(c["count"])+2*alpha
    for j,flag in enumerate(state["observed"]):
        if flag:
            count=c["positive"][j] if state["query"][j] == 1 else c["count"]-c["positive"][j]
            score *= (Fraction(count)+alpha)/denominator
    return score

def _log_sum(values):
    column = np.asarray(values,dtype=np.float64).reshape(-1,1)
    largest = float(np.max(column))
    return float(number(largest+math.log(float(np.sum(np.exp(column-largest)))),"Log normalization"))

def derive(state):
    classes, query, observed = state["classes"],state["query"],state["observed"]
    if not isinstance(classes,list) or len(classes) != 2 or [c["id"] for c in classes] != ["A","B"]:
        raise ValueError("Bayes classes must be ordered A, B.")
    if not isinstance(query,(list,tuple)) or len(query) != 2 or not isinstance(observed,(list,tuple)) or len(observed) != 2:
        raise ValueError("Bayes needs two binary query components and two evidence flags.")
    for value in query:
        number(value,"Binary query",0,1,True)
    if any(type(flag) is not bool for flag in observed):
        raise ValueError("Evidence flags must be boolean.")
    alpha = number(state["alpha"],"Smoothing alpha",0,1e6)
    if not isinstance(state["provenance"],str):
        raise ValueError("Count provenance must be text.")
    for c in classes:
        number(c["priorWeight"],"Prior weight",0,1e6);number(c["count"],"Class count",0,1e6,True)
        if not isinstance(c["positive"],(list,tuple)) or len(c["positive"]) != 2:
            raise ValueError("Each class needs two positive counts.")
        for value in c["positive"]:
            number(value,"Positive count",0,c["count"],True)
    logs = [math.log(c["priorWeight"]) for c in classes if c["priorWeight"] > 0]
    prior_total = _log_sum(logs) if logs else None
    rows = []
    for c in classes:
        log_prior = None if c["priorWeight"] == 0 or prior_total is None else math.log(c["priorWeight"])-prior_total
        prior = None if prior_total is None else 0.0 if log_prior is None else math.exp(log_prior)
        features = []
        for j,positive in enumerate(c["positive"]):
            numerator = (positive if query[j] == 1 else c["count"]-positive)+alpha
            denominator = c["count"]+2*alpha
            reason = "No class observations and no smoothing." if denominator == 0 else "This feature outcome has zero count and no smoothing." if numerator == 0 else None
            likelihood = None if denominator == 0 else numerator/denominator
            log_like = None if numerator == 0 or denominator == 0 else math.log(likelihood) if likelihood > 0 else math.log(numerator)-math.log(denominator)
            features.append({"index":j,"observed":observed[j],"query":query[j],"positive":positive,"numerator":numerator,
                             "denominator":denominator,"likelihood":likelihood,
                             "logLikelihood":log_like,"reason":reason,"underflow":numerator > 0 and denominator > 0 and likelihood == 0})
        reason = "All prior weights are zero; no prior distribution exists." if prior_total is None else "Zero prior; this class has zero score." if c["priorWeight"] == 0 else None
        undefined, impossible, log_score = False,c["priorWeight"] == 0,log_prior
        if log_prior is not None:
            for f in (f for f in features if f["observed"]):
                if f["denominator"] == 0:
                    undefined,reason,log_score = True,f["reason"],None
                    break
                if f["numerator"] == 0:
                    impossible,reason,log_score = True,f["reason"],None
                elif log_score is not None:
                    log_score += f["logLikelihood"]
        if log_score is not None:
            number(log_score,"Log score")
        score = 0.0 if log_score is None and impossible and prior_total is not None and not undefined else None if log_score is None else math.exp(log_score)
        rows.append(dict(c,prior=prior,logPrior=log_prior,features=features,logScore=log_score,score=score,
                         impossible=impossible,undefinedLikelihood=undefined,reason=reason,underflow=log_score is not None and score == 0))
    reason = "All prior weights are zero; posterior undefined." if prior_total is None else "A required likelihood is undefined; posterior cannot be normalized." if any(r["undefinedLikelihood"] for r in rows) else None
    scores = [r["logScore"] for r in rows if r["logScore"] is not None]
    if reason is None and not scores:
        reason = "All classes assign zero probability to this evidence; posterior undefined."
    score_order = None
    if reason is None:
        left,right = (_exact_score(c,state) for c in classes)
        score_order = (left > right)-(left < right)
        if score_order == 0:
            common_score = max(scores)
            for row in rows:
                row.update(logScore=common_score,score=math.exp(common_score),underflow=math.exp(common_score) == 0)
            scores = [common_score,common_score]
    shift = max(scores) if reason is None else None
    shifted = [None if shift is None else 0.0 if r["logScore"] is None else math.exp(r["logScore"]-shift) for r in rows]
    normalizer = sum(shifted) if shift is not None else None
    log_evidence = _log_sum(scores) if reason is None else None
    evidence = math.exp(log_evidence) if log_evidence is not None else None
    posterior = [v/normalizer for v in shifted] if normalizer is not None else [None,None]
    return {"state":copy.deepcopy(state),"rows":[dict(r,shifted=shifted[j],posterior=posterior[j]) for j,r in enumerate(rows)],
            "shift":shift,"normalizer":normalizer,"logEvidence":log_evidence,"evidence":evidence,
            "evidenceUnderflow":log_evidence is not None and evidence == 0,
            "prediction":None if reason else "A" if score_order >= 0 else "B","reason":reason,"scoreOrder":score_order,
            "tiedPosterior":score_order == 0,"roundedPosteriorTie":reason is None and score_order != 0 and posterior[0] == posterior[1],
            "shapes":{"query":[2,1],"priors":[2,1],"likelihoods":[2,2],"posterior":[2,1]}}

def trace(state):
    states = [copy.deepcopy(state)] + [dict(copy.deepcopy(state),observed=mask) for mask in ([False,False],[True,False],[True,True])]
    return [{"index":j,"state":value,"derived":derive(value)} for j,value in enumerate(states)]

if __name__ == "__main__":
    print(json.dumps({"before":derive(CANONICAL),"after":derive(dict(CANONICAL,alpha=0)),"trace":trace(CANONICAL)},allow_nan=False))
