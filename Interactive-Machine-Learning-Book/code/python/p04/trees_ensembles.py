"""From-scratch binary CART, bootstrap ensembles and squared-error boosting.
X is an n x d row matrix; y is n x 1 conceptually. No sklearn or hosted model.
Public input: 0..32 rows, 1..4 features, depth 0..5, minLeaf 1..32.
Run: .venv/bin/python code/python/p04/trees_ensembles.py
Or send one JSON request on stdin with operation tree/bootstrap/bagging/boosting.
"""
import json
import math
import sys
import numpy as np

DEFAULT_OPTIONS = dict(task="classification", criterion="gini", dimensions=2,
                       maxDepth=3, minLeaf=1, mtry=0, seed=7)
CLASS_ROWS = [dict(id=f"s{i+1}", x=[i+1, 1-i % 2], y=y)
              for i, y in enumerate([0, 0, 1, 1, 0, 1])]
REG_ROWS = [dict(r, y=2*r["y"]) for r in CLASS_ROWS]
MOD = 2**32

def finite(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{name} must be a finite number, not bool or string.")
    return float(value)

def integer(value, lower, upper, name):
    finite(value, name)
    if int(value) != value or not lower <= value <= upper:
        raise ValueError(f"{name} must be an integer in [{lower},{upper}].")
    return int(value)

def validate_rows(rows, o):
    if not isinstance(o, dict) or o.get("task") not in ("classification", "regression") or o.get("criterion") not in ("gini", "entropy", "sse") or (o["task"] == "regression") != (o["criterion"] == "sse"):
        raise ValueError("Classification requires Gini/entropy; regression requires SSE.")
    for key, lo, hi in [("dimensions",1,4),("maxDepth",0,5),("minLeaf",1,32),("seed",0,MOD-1)]:
        integer(o.get(key), lo, hi, key)
    integer(o.get("mtry"), 0, o["dimensions"], "mtry")
    if not isinstance(rows, list) or len(rows) > 32:
        raise ValueError("Trees support 0..32 observation rows.")
    ids = set()
    for r in rows:
        if not isinstance(r, dict) or not isinstance(r.get("id"), str) or not r["id"].strip() or r["id"] in ids:
            raise ValueError("Row IDs must be unique nonempty strings.")
        ids.add(r["id"])
        if "sourceId" in r and (not isinstance(r["sourceId"], str) or not r["sourceId"].strip()):
            raise ValueError("Source IDs must be nonempty strings.")
        if not isinstance(r.get("x"), list) or len(r["x"]) != o["dimensions"]:
            raise ValueError("Each row needs the declared number of feature entries.")
        for v in r["x"]:
            finite(v, "Feature")
        finite(r.get("y"), "Target")
        if o["task"] == "classification" and r["y"] not in (0, 1):
            raise ValueError("Binary labels must be 0 or 1.")

def normalized(rows, o):
    """Detached binary64 observations; integer options stay integer-valued.
    Python arbitrary-precision ints are rounded once to the browser's numeric
    domain before identity, unique thresholds, NumPy masks or recursion.
    """
    validate_rows(rows, o)
    options = dict(o)
    for k in ("dimensions", "maxDepth", "minLeaf", "mtry", "seed"):
        options[k] = int(o[k])
    data = [dict(r, x=[float(v) for v in r["x"]], y=float(r["y"])) for r in rows]
    return data, options

def finite_mean(values, name):
    if not isinstance(values, list) or not values:
        raise ValueError("A mean needs at least one value.")
    data = [finite(v, name) for v in values]
    if all(v == data[0] for v in data):
        return data[0]  # exact constant mean; no accumulating addition needed
    with np.errstate(over="ignore", invalid="ignore"):
        return finite(float(np.mean(np.asarray(data, dtype=float))), name)

def stats(rows, o):
    rows, o = normalized(rows, o)
    n = len(rows)
    if not n:
        return dict(n=0, counts=[0,0] if o["task"] == "classification" else None,
                    mean=None, value=None, probability=None, impurity=0, risk=0)
    # These are real NumPy arrays used in canonical calculations, not display code.
    y = np.asarray([r["y"] for r in rows], dtype=np.float64).reshape(n, 1)
    if o["task"] == "classification":
        positive = int(np.count_nonzero(y == 1))
        counts, p = [n-positive, positive], positive/n
        impurity = 2*p*(1-p) if o["criterion"] == "gini" else -sum(c/n*math.log2(c/n) for c in counts if c)
        return dict(n=n, counts=counts, mean=None, value=int(positive > n-positive),
                    probability=p, impurity=impurity, risk=finite(n*impurity, "Node risk"))
    with np.errstate(over="ignore", invalid="ignore"):
        mean = finite_mean([r["y"] for r in rows], "Leaf mean")
        residual = y[:,0] - mean
        risk = finite(float(residual @ residual), "Leaf SSE")
    return dict(n=n, counts=None, mean=mean, value=mean, probability=None,
                impurity=finite(risk/n, "Node MSE"), risk=risk)

def evaluate_split(rows, o, feature, threshold):
    rows, o = normalized(rows, o)
    feature = integer(feature, 0, o["dimensions"]-1, "Feature")
    threshold = finite(threshold, "Threshold")
    X = np.asarray([r["x"] for r in rows], dtype=float).reshape(len(rows), o["dimensions"])
    mask = X[:,feature] <= threshold
    left_rows = [r for i, r in enumerate(rows) if mask[i]]
    right_rows = [r for i, r in enumerate(rows) if not mask[i]]
    parent, left, right = stats(rows,o), stats(left_rows,o), stats(right_rows,o)
    legal = left["n"] >= o["minLeaf"] and right["n"] >= o["minLeaf"]
    weighted = finite((left["risk"]+right["risk"])/len(rows), "Weighted child impurity") if rows else None
    gain = finite(parent["impurity"]-weighted, "Gain") if legal else None
    return dict(feature=feature, threshold=threshold, lower=None, upper=None,
                parent=parent, left=left, right=right, leftIds=[r["id"] for r in left_rows],
                rightIds=[r["id"] for r in right_rows], weighted=weighted, gain=gain,
                legal=legal, reason=None if legal else "Both children must meet the minimum leaf count; empty children are illegal.")

def candidates(rows, o, features=None):
    rows, o = normalized(rows, o)
    features = list(range(o["dimensions"])) if features is None else features
    if not isinstance(features, list) or any(isinstance(f,bool) or not isinstance(f,(int,float)) for f in features) or len(set(features)) != len(features):
        raise ValueError("Candidate features must be a unique index list.")
    result = []
    for f in sorted(features):
        f = integer(f, 0, o["dimensions"]-1, "Candidate feature")
        values = sorted(set(r["x"][f] for r in rows))
        for lo, hi in zip(values, values[1:]):
            t = lo/2 + hi/2
            if t < lo or t >= hi:
                t = lo  # adjacent floats: retain the exact <= partition
            s = evaluate_split(rows,o,f,t)
            if s["legal"]:
                result.append(dict(s, lower=lo, upper=hi))
    return result

def best_split(splits):
    best = None
    for s in sorted(splits, key=lambda s: (s["feature"],s["threshold"])):
        if s["legal"] and s["gain"] is not None and (best is None or s["gain"] > best["gain"]):
            best = s
    return best  # exact computed-gain ties: lower feature, then lower threshold

def lcg(seed):
    seed = integer(seed, 0, MOD-1, "Seed")
    state = seed
    while True:
        state = (1664525*state+1013904223) % MOD
        yield state

def train_tree(rows, o):
    rows, o = normalized(rows, o)
    rng = lcg(o["seed"])
    def grow(data, depth, node_id):
        s = stats(data,o)
        leaf = dict(id=node_id, dimensions=o["dimensions"], depth=depth,
                    rowIds=[r["id"] for r in data], sourceIds=[r.get("sourceId",r["id"]) for r in data],
                    stats=s, features=[], candidates=[], split=None, left=None, right=None, reason="")
        stop = ("Empty node: no prediction." if not data else
                ("Pure labels: zero impurity." if o["task"] == "classification" else
                 "Constant regression targets: zero SSE." if all(r["y"] == data[0]["y"] for r in data) else
                 "Computed SSE underflowed to zero; finer target variation is numerically unresolved.") if s["risk"] == 0 else
                "Maximum depth reached." if depth >= o["maxDepth"] else
                "Too few rows for two legal leaves." if len(data) < 2*o["minLeaf"] else None)
        if stop:
            return dict(leaf, reason=stop)
        features = list(range(o["dimensions"]))
        m = o["mtry"]
        if 0 < m < len(features):
            for i in range(m):
                j = i + (next(rng)*(len(features)-i))//MOD
                features[i], features[j] = features[j], features[i]
            features = sorted(features[:m])
        splits = candidates(data,o,features)
        split = best_split(splits)
        if split is None or split["gain"] <= 0:
            return dict(leaf, features=features, candidates=splits, reason="No legal positive-gain split in the considered features.")
        return dict(leaf, features=features, candidates=splits, split=split, reason="Split accepted.",
                    left=grow([r for r in data if r["x"][split["feature"]] <= split["threshold"]],depth+1,node_id+"L"),
                    right=grow([r for r in data if r["x"][split["feature"]] > split["threshold"]],depth+1,node_id+"R"))
    return grow(rows,0,"root")

def predict(tree, x):
    if not isinstance(x,list) or len(x) != tree["dimensions"]:
        raise ValueError("Prediction needs exactly the declared number of features.")
    x = [finite(v,"Prediction feature") for v in x]
    node = tree
    while node["split"] is not None:
        s = node["split"]
        node = node["left"] if x[s["feature"]] <= s["threshold"] else node["right"]
    return dict(value=node["stats"]["value"], probability=node["stats"]["probability"],
                leaf=node["id"], reason="Empty training node has no prediction." if node["stats"]["value"] is None else None)

def nodes(tree):
    return [tree] + (nodes(tree["left"])+nodes(tree["right"]) if tree["split"] else [])

def prune_tree(tree, alpha):
    alpha = finite(alpha,"Pruning alpha")
    if not 0 <= alpha <= 10:
        raise ValueError("Pruning alpha must be in [0,10].")
    n = tree["stats"]["n"]
    if not n:
        return dict(tree=tree, leaves=1, risk=None, objective=None, reason="Empty training data: normalized pruning objective is undefined.")
    def solve(node):
        risk = finite(node["stats"]["risk"]/n,"Normalized leaf risk")
        cost = finite(risk+alpha,"Pruning cost")
        if not node["split"]:
            return dict(tree=node, leaves=1, risk=risk, objective=cost)
        left,right = solve(node["left"]),solve(node["right"])
        split_cost = finite(left["objective"]+right["objective"],"Subtree cost")
        # Selection-only, eight binary64 epsilons at the compared cost scale.
        # Reported SSE/risk/objective values are never rounded to enforce a tie.
        tol = 8*sys.float_info.epsilon*max(abs(cost),abs(split_cost))
        if cost <= split_cost or cost-split_cost <= tol:
            return dict(tree=dict(node,split=None,left=None,right=None,reason="Collapsed by cost complexity (ties prefer fewer leaves)."),
                        leaves=1,risk=risk,objective=cost)
        return dict(tree=dict(node,left=left["tree"],right=right["tree"]),leaves=left["leaves"]+right["leaves"],
                    risk=finite(left["risk"]+right["risk"],"Subtree risk"),objective=split_cost)
    return dict(solve(tree),reason=None)

def bootstrap(rows,o,seed,draws=None):
    rows, o = normalized(rows,o)
    seed = integer(seed,0,MOD-1,"Bootstrap seed")
    draws = len(rows) if draws is None else draws
    draws = integer(draws,0,32,"Bootstrap draws")
    if not rows and draws:
        raise ValueError("Cannot draw from an empty source.")
    rng = lcg(seed)
    indices = [next(rng)*len(rows)//MOD for _ in range(draws)]
    counts = [dict(id=r["id"],count=indices.count(i)) for i,r in enumerate(rows)]
    return dict(seed=seed,indices=indices,counts=counts,
                draws=[dict(draw=j+1,index=i,sourceId=rows[i]["id"]) for j,i in enumerate(indices)],
                rows=[dict(rows[i],id=f"draw{j+1}",sourceId=rows[i]["id"]) for j,i in enumerate(indices)],
                uniqueIds=[r["id"] for r in counts if r["count"]],oobIds=[r["id"] for r in counts if not r["count"]])

def aggregate(values,task):
    if not values:
        return dict(value=None,reason="No eligible tree predictions.")
    mean = finite_mean(values,"Prediction mean")
    return dict(value=int(mean > .5) if task == "classification" else mean,reason=None)

def bagging(rows,o,seed,count):
    rows, o = normalized(rows,o)
    seed = integer(seed,0,MOD-1,"Ensemble seed")
    count = integer(count,0,6,"Tree count")
    master, state, offset = lcg(seed), seed, 0
    budget = (2**o["maxDepth"]-1)*o["mtry"] if 0 < o["mtry"] < o["dimensions"] else 0
    trees = []
    for i in range(count):
        bootstrap_seed,start = state,offset
        for _ in range(len(rows)):
            state = next(master)
        offset += len(rows)
        feature_seed,feature_start = state,offset
        for _ in range(budget):
            state = next(master)
        offset += budget
        sample = bootstrap(rows,o,bootstrap_seed)
        tree = train_tree(sample["rows"],dict(o,seed=feature_seed))
        trees.append(dict(id=f"tree{i+1}",bootstrapSeed=bootstrap_seed,featureSeed=feature_seed,
                          bootstrapStart=start,featureStart=feature_start,featureBudget=budget,sample=sample,tree=tree))
    predictions,oob = [],[]
    for r in rows:
        values = [predict(t["tree"],r["x"])["value"] for t in trees]
        values = [v for v in values if v is not None]
        predictions.append(dict(id=r["id"],values=values,**aggregate(values,o["task"]),
                                voteFraction=sum(v == 1 for v in values)/len(values) if values and o["task"] == "classification" else None))
        eligible = [t for t in trees if r["id"] in t["sample"]["oobIds"]]
        vs = [predict(t["tree"],r["x"])["value"] for t in eligible]
        vs = [v for v in vs if v is not None]
        oob.append(dict(id=r["id"],treeIds=[t["id"] for t in eligible],values=vs,**aggregate(vs,o["task"])))
    evaluated = [(p["value"],r["y"]) for p,r in zip(oob,rows) if p["value"] is not None]
    value = (sum(v==y for v,y in evaluated)/len(evaluated) if o["task"] == "classification" else
             finite(sum((v-y)**2 for v,y in evaluated)/len(evaluated),"OOB MSE")) if evaluated else None
    return dict(streamPolicy="Disjoint reserved LCG segments: n bootstrap draws, then at most (2^depth−1)·mtry feature draws per tree.",
                trees=trees,predictions=predictions,oob=oob,eligible=len(evaluated),
                oobMetric=dict(value=value,reason=None if evaluated else "No source row has an eligible OOB prediction."))

def boosting(rows,o,rate,stages):
    rows, o = normalized(rows,o)
    if o["task"] != "regression" or o["mtry"] != 0:
        raise ValueError("This boosting experiment uses squared-error regression with all features.")
    rate = finite(rate,"Learning rate")
    if not 0 < rate <= 1:
        raise ValueError("Boosting rate must be in (0,1].")
    stages = integer(stages,0,6,"Stage count")
    if not rows:
        return dict(baseline=None,predictions=[],stages=[],loss=dict(value=None,reason="Empty data: squared-error loss and baseline are undefined."))
    baseline = stats(rows,o)["mean"]
    values = [baseline for _ in rows]
    def loss(v):
        with np.errstate(over="ignore",invalid="ignore"):
            r = np.asarray(v,dtype=float)-np.asarray([r["y"] for r in rows],dtype=float)
            return finite(float(r @ r)/(2*len(rows)),"Half MSE")
    trace = []
    for m in range(stages):
        before = values[:]
        residual = [finite(r["y"]-v,"Negative per-example gradient") for r,v in zip(rows,before)]
        tree = train_tree([dict(r,y=v) for r,v in zip(rows,residual)],o)
        fitted = [predict(tree,r["x"])["value"] for r in rows]
        values = [finite(v+rate*h,"Boosted prediction") for v,h in zip(before,fitted)]
        trace.append(dict(stage=m+1,before=before,residuals=residual,tree=tree,fitted=fitted,after=values[:],
                          lossBefore=loss(before),lossAfter=loss(values)))
    return dict(baseline=baseline,predictions=values,stages=trace,loss=dict(value=loss(values),reason=None))

def dispatch(request):
    rows,o = request.get("rows",CLASS_ROWS),request.get("options",DEFAULT_OPTIONS)
    op = request.get("operation","tree")
    if op == "tree":
        tree = train_tree(rows,o)
        result = dict(tree=tree,candidates=candidates(rows,o),best=best_split(candidates(rows,o)),
                      predictions=[predict(tree,r["x"]) for r in rows])
        if "probe" in request:
            result["probe"] = predict(tree,request["probe"])
        if "alpha" in request:
            result["pruned"] = prune_tree(tree,request["alpha"])
        return result
    if op == "bootstrap":
        return bootstrap(rows,o,request["seed"],request.get("draws"))
    if op == "bagging":
        return bagging(rows,o,request["seed"],request["count"])
    if op == "boosting":
        return boosting(rows,o,request["rate"],request["stages"])
    raise ValueError("Unknown operation.")

if __name__ == "__main__":
    raw = "" if sys.stdin.isatty() else sys.stdin.read()
    request = json.loads(raw) if raw.strip() else dict(operation="boosting",rows=REG_ROWS,
              options=dict(DEFAULT_OPTIONS,task="regression",criterion="sse",maxDepth=1),rate=.5,stages=3)
    try:
        print(json.dumps(dispatch(request),allow_nan=False))
    except (ValueError,OverflowError,TypeError) as error:
        print(json.dumps(dict(error=str(error)),allow_nan=False))
        sys.exit(2)
