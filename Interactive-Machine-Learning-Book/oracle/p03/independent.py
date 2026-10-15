"""Independent proofs: Fraction moments/products, Decimal norms, exhaustive subsets,
and closed-form modular LCG draws. No canonical or browser model is imported."""
from collections import Counter
from decimal import Decimal, localcontext
from fractions import Fraction
from itertools import combinations
from math import isqrt

def frac(value):
    if isinstance(value,Fraction):
        return value
    # Inputs are accepted binary64 quantities, not their decimal spelling.
    return Fraction.from_float(float(value))

def dec(value):
    value = frac(value)
    return Decimal(value.numerator)/Decimal(value.denominator)

def exact_distance(a, b, metric, p, scales=None):
    power = 1 if metric == "L1" else 2 if metric == "L2" else p
    deltas = [abs(frac(x)-frac(y))/frac(1 if scales is None else scales[j]) for j,(x,y) in enumerate(zip(a,b))]
    with localcontext() as ctx:
        ctx.prec = 70
        if power == 1:
            return dec(sum(deltas))
        if power == 2:
            return dec(sum(v*v for v in deltas)).sqrt()
        exponent = dec(power)
        total = sum(dec(v)**exponent for v in deltas)
        return total**(1/exponent) if total else Decimal(0)

def id_key(ident):
    return ident.encode("utf-16-be",errors="surrogatepass")

def neighbors(state):
    data = {s["id"]:s for s in state["samples"]}
    distances = {ident:exact_distance([s["x"],s["y"]],[state["query"]["x"],state["query"]["y"]],state["metric"],state["p"],state["scales"]) for ident,s in data.items()}
    order = sorted(data,key=lambda ident:(distances[ident],id_key(ident)))
    k = state["k"]
    selected = []
    if k <= len(order):
        # Enumerate all subsets; minimum total distance, then ordered rank tuple.
        ranks = {ident:j for j,ident in enumerate(order)}
        subset = min(combinations(order,k),key=lambda ids:(sum(distances[i] for i in ids),tuple(ranks[i] for i in ids)))
        selected = list(subset)
    tally = Counter(data[i]["category"] for i in selected)
    largest_vote = max((tally[c] for c in ("A","B")),default=0)
    prediction = next(c for c in ("A","B") if tally[c] == largest_vote) if selected else None
    mean = float(sum(frac(data[i]["target"]) for i in selected)/k) if selected else None
    duplicates = [i for i in order if any(i != j and (frac(data[i]["x"]),frac(data[i]["y"])) == (frac(data[j]["x"]),frac(data[j]["y"])) for j in order)]
    return {"orderedIds":order,"distances":[float(distances[i]) for i in order],"selectedIds":selected,
            "votes":[{"category":c,"count":tally[c]} for c in ("A","B")],"classification":prediction,"regression":mean,
            "reasonCode":"k-too-large" if not selected else None,"voteTie":bool(selected) and tally["A"] == tally["B"],
            "boundaryTie":bool(selected) and k < len(order) and distances[order[k-1]] == distances[order[k]],
            "duplicateIds":duplicates,"shapes":{"X":[len(order),2],"query":[2,1],"distances":[len(order),1],"targets":[len(order),1]}}

def seed_integer(seed, draw_index):
    """Closed-form geometric sum, not a stepwise translation of the generator."""
    a,c,mod = 1664525,1013904223,2**32
    power = pow(a,draw_index,mod*(a-1))
    geometric = (power-1)//(a-1)
    return (power*seed+c*geometric) % mod

def metrics(state):
    power = 1 if state["metric"] == "L1" else 2 if state["metric"] == "L2" else state["p"]
    dimension = state["dimension"]
    with localcontext() as ctx:
        ctx.prec = 70
        divisor = Decimal(1) if state["normalization"] == "raw" else Decimal(dimension)**(1/dec(power))
        rows = []
        for j in range(24):
            coords = [Fraction(seed_integer(state["seed"],j*32+i+1),2**31)-1 for i in range(dimension)]
            if state["distribution"] == "line":
                coords[1:] = [Fraction(0)]*(dimension-1)
            raw = exact_distance(coords,[0]*dimension,state["metric"],state["p"])
            rows.append({"id":"d"+str(j+1),"features":[float(v) for v in coords],"raw":float(raw),"distance":float(raw/divisor)})
        # Summary arithmetic retains high precision rather than NumPy reductions.
        values = [exact_distance(
            [Fraction(seed_integer(state["seed"],j*32+i+1),2**31)-1 if state["distribution"] == "cube" or i == 0 else 0 for i in range(dimension)],
            [0]*dimension,state["metric"],state["p"])/divisor for j in range(24)]
        mean = sum(values)/len(values)
        sd = (sum((v-mean)**2 for v in values)/len(values)).sqrt()
        summary = {"min":float(min(values)),"max":float(max(values)),"mean":float(mean),"sd":float(sd),
                   "relativeSpread":float((max(values)-min(values))/mean) if mean else None,
                   "coefficientOfVariation":float(sd/mean) if mean else None,
                   "meanUnderflow":mean > 0 and float(mean) == 0,"sdUnderflow":sd > 0 and float(sd) == 0,
                   "reason":None if mean else "All distances are zero; relative spread and coefficient of variation are undefined."}
        pair = exact_distance([state["point"]["x"],state["point"]["y"]],[state["query"]["x"],state["query"]["y"]],state["metric"],state["p"],state["scales"])
    return {"power":power,"pairDistance":float(pair),"rows":rows,"summary":summary,
            "shapes":{"X":[24,dimension],"query":[dimension,1],"distances":[24,1]}}

def summary_reference(values):
    exact = [Fraction.from_float(float(v)) for v in values]
    mean = sum(exact)/len(exact)
    variance = sum((v-mean)**2 for v in exact)/len(exact)
    with localcontext() as ctx:
        ctx.prec = 90
        nroot,droot=isqrt(variance.numerator),isqrt(variance.denominator)
        exact_sd=Fraction(nroot,droot) if nroot*nroot == variance.numerator and droot*droot == variance.denominator else None
        sd = dec(exact_sd) if exact_sd is not None else dec(variance).sqrt()
        mean_out, sd_out = float(mean),float(exact_sd) if exact_sd is not None else float(sd)
        mean_underflow = mean > 0 and mean_out == 0
        sd_underflow = sd > 0 and sd_out == 0
        return {"min":float(min(exact)),"max":float(max(exact)),"mean":mean_out,"sd":sd_out,
                "relativeSpread":float((max(exact)-min(exact))/mean) if mean else None,
                "coefficientOfVariation":float(sd/dec(mean)) if mean else None,
                "meanUnderflow":mean_underflow,"sdUnderflow":sd_underflow,
                "reason":"All distances are zero; relative spread and coefficient of variation are undefined." if max(exact) == 0 else
                "Positive mean or standard deviation underflowed to zero; relative metrics use normalized arithmetic." if mean_underflow or sd_underflow else None}

def rational_log(value):
    if value is None or value == 0:
        return None
    with localcontext() as ctx:
        ctx.prec = 70
        return float(Decimal(value.numerator).ln()-Decimal(value.denominator).ln())

def bayes(state):
    alpha = frac(state["alpha"])
    weights = [frac(c["priorWeight"]) for c in state["classes"]]
    weight_total = sum(weights)
    rows, scores = [],[]
    unknown = False
    for j,c in enumerate(state["classes"]):
        prior = weights[j]/weight_total if weight_total else None
        features, terms = [],[]
        for i,positive in enumerate(c["positive"]):
            numerator = frac(positive if state["query"][i] else c["count"]-positive)+alpha
            denominator = frac(c["count"])+2*alpha
            likelihood = numerator/denominator if denominator else None
            features.append({"index":i,"observed":state["observed"][i],"query":state["query"][i],"positive":positive,
                             "numerator":float(numerator),"denominator":float(denominator),
                             "likelihood":None if likelihood is None else float(likelihood),"logLikelihood":rational_log(likelihood)})
            if state["observed"][i]:
                terms.append(likelihood)
        undefined = prior is not None and prior > 0 and any(t is None for t in terms)
        unknown |= undefined
        score = prior
        if prior is not None and prior > 0:
            if undefined:
                score = None
            else:
                for t in terms:
                    score *= t
        scores.append(score)
        rows.append({"id":c["id"],"prior":None if prior is None else float(prior),"logPrior":rational_log(prior),
                     "features":features,"score":None if score is None else float(score),"logScore":rational_log(score),
                     "impossible":weights[j] == 0 or (prior is not None and prior > 0 and not undefined and score == 0),
                     "undefinedLikelihood":undefined,"underflow":score is not None and score > 0 and float(score) == 0})
    reason_code = "no-prior" if not weight_total else "unknown-likelihood" if unknown else "impossible" if sum(s or 0 for s in scores) == 0 else None
    evidence = sum(scores) if reason_code is None else None
    largest = max(scores) if reason_code is None else None
    for j,row in enumerate(rows):
        row["shifted"] = float(scores[j]/largest) if largest is not None else None
        row["posterior"] = float(scores[j]/evidence) if evidence is not None else None
    posterior = [scores[j]/evidence for j in range(2)] if evidence is not None else None
    return {"rows":rows,"shift":rational_log(largest),"normalizer":float(evidence/largest) if evidence is not None else None,
            "logEvidence":rational_log(evidence),"evidence":float(evidence) if evidence is not None else None,
            "evidenceUnderflow":evidence is not None and evidence > 0 and float(evidence) == 0,
            "prediction":None if posterior is None else "A" if posterior[0] >= posterior[1] else "B",
            "reasonCode":reason_code,"tiedPosterior":posterior is not None and posterior[0] == posterior[1],
            "shapes":{"query":[2,1],"priors":[2,1],"likelihoods":[2,2],"posterior":[2,1]}}

if __name__ == "__main__":
    from cases import NEIGHBORS, BAYES
    literal=dict(BAYES,classes=[dict(c,priorWeight=3 if c["id"] == "A" else 2) for c in BAYES["classes"]])
    n,b = neighbors(NEIGHBORS),bayes(literal)
    assert n["selectedIds"] == ["s4","s2","s3"] and n["regression"] == 6 and n["classification"] == "A"
    assert b["rows"][0]["score"] == 3/32 and b["rows"][1]["score"] == 4/45
    assert b["rows"][0]["posterior"] == 135/263 and b["rows"][1]["posterior"] == 128/263
    assert seed_integer(42,1) == 1083814273
    assert float(exact_distance([0,0],[3,4],"L2",2)) == 5
    assert float(exact_distance([0,0],[3,4],"L1",2)) == 7
    print("Independent literal groups: 6 passed (10 conditions)")
