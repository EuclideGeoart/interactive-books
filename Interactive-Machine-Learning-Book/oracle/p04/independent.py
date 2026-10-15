"""Independent small-data proofs: subsets, exact rational moments, Decimal entropy.
No canonical training/sampling function is used here. At most six rows in fixtures.
"""
from collections import Counter
from decimal import Decimal, localcontext
from fractions import Fraction as Q
from itertools import product

MOD, A, C = 2**32, 1664525, 1013904223

def state_at(seed,k):
    # Closed form, not the runtime's iterative recurrence.
    power = A**k
    return (power*seed + C*((power-1)//(A-1))) % MOD

def moments(rows,o):
    n = len(rows)
    if not n:
        return dict(n=0,counts=[0,0] if o["task"]=="classification" else None,
                    mean=None,value=None,probability=None,impurity=Q(0),risk=Q(0))
    if o["task"] == "regression":
        ys = [Q(r["y"]) for r in rows]
        mean = sum(ys)/n
        risk = sum((y-mean)**2 for y in ys)
        return dict(n=n,counts=None,mean=mean,value=mean,probability=None,impurity=risk/n,risk=risk)
    ones = sum(r["y"]==1 for r in rows)
    counts, p = [n-ones,ones], Q(ones,n)
    if o["criterion"] == "gini":
        impurity = 1-sum(Q(c,n)**2 for c in counts)
    else:
        with localcontext() as ctx:
            ctx.prec = 80
            impurity = -sum((Decimal(c)/n)*(Decimal(c)/n).ln()/Decimal(2).ln() for c in counts if c)
    return dict(n=n,counts=counts,mean=None,value=int(ones>n-ones),probability=p,impurity=impurity,risk=n*impurity)

def enumerate_partitions(rows,o,features):
    """Enumerate every row subset, then ask whether a feature can separate it."""
    parent = moments(rows,o)
    out = []
    n = len(rows)
    for bits in product((False,True),repeat=n):
        left = [r for r,b in zip(rows,bits) if b]
        right = [r for r,b in zip(rows,bits) if not b]
        if min(len(left),len(right)) < o["minLeaf"]:
            continue
        for f in features:
            lo,hi = max(r["x"][f] for r in left),min(r["x"][f] for r in right)
            if lo >= hi:
                continue
            threshold = lo/2 + hi/2
            if not lo <= threshold < hi:
                threshold = lo
            l,r = moments(left,o),moments(right,o)
            weighted = (l["risk"]+r["risk"])/n
            out.append(dict(feature=f,threshold=threshold,leftIds=[r["id"] for r in left],
                            rightIds=[r["id"] for r in right],weighted=weighted,gain=parent["impurity"]-weighted))
    return sorted(out,key=lambda s:(s["feature"],s["threshold"]))

def float_data(value):
    if isinstance(value,(Q,Decimal)):
        return float(value)
    if isinstance(value,list):
        return [float_data(v) for v in value]
    if isinstance(value,dict):
        return {k:float_data(v) for k,v in value.items()}
    return value

def exhaustive_tree(rows,o):
    draws = 0
    def grow(data,depth,node_id):
        nonlocal draws
        s = moments(data,o)
        node = dict(id=node_id,dimensions=o["dimensions"],depth=depth,rowIds=[r["id"] for r in data],
                    sourceIds=[r.get("sourceId",r["id"]) for r in data],stats=s,features=[],split=None,left=None,right=None)
        if not data or s["risk"]==0 or depth>=o["maxDepth"] or len(data)<2*o["minLeaf"]:
            return node
        features = list(range(o["dimensions"]))
        m = o["mtry"]
        if 0<m<len(features):
            for i in range(m):
                draws += 1
                j = i + state_at(o["seed"],draws)*(len(features)-i)//MOD
                features[i],features[j]=features[j],features[i]
            features = sorted(features[:m])
        node["features"] = features
        splits = enumerate_partitions(data,o,features)
        best = max(splits,key=lambda s:s["gain"],default=None)  # stable tie, sorted above
        if best is None or best["gain"]<=0:
            return node
        node["split"] = best
        node["left"] = grow([r for r in data if r["id"] in best["leftIds"]],depth+1,node_id+"L")
        node["right"] = grow([r for r in data if r["id"] in best["rightIds"]],depth+1,node_id+"R")
        return node
    return grow(rows,0,"root")

def predict(tree,x):
    while tree["split"]:
        s=tree["split"]
        tree=tree["left"] if x[s["feature"]]<=s["threshold"] else tree["right"]
    return tree["stats"]["value"]

def tree_summary(tree):
    result=[]
    def visit(t):
        s=t["split"]
        result.append(dict(id=t["id"],dimensions=t["dimensions"],depth=t["depth"],rowIds=t["rowIds"],
                           sourceIds=t["sourceIds"],stats=t["stats"],features=t["features"],
                           split=None if s is None else {k:s[k] for k in ("feature","threshold","leftIds","rightIds","weighted","gain")}))
        if s:
            visit(t["left"]);visit(t["right"])
    visit(tree)
    return float_data(result)

def pruning_oracle(tree,alpha):
    """Enumerate all subtrees by either collapsing or retaining each branch."""
    def choices(t):
        result=[(t["stats"]["risk"],1)]
        if t["split"]:
            result += [(l+r,nl+nr) for l,nl in choices(t["left"]) for r,nr in choices(t["right"])]
        return result
    if not tree["stats"]["n"]:
        return dict(leaves=1,risk=None,objective=None)
    n=tree["stats"]["n"]
    candidates=[(risk/n+Q(alpha)*leaves,leaves,risk/n) for risk,leaves in choices(tree)]
    # Decimal-exact breakpoint alpha supplied as 3.84 is a binary64 value;
    # resolve only selection-roundoff-equivalent costs, never round the risks.
    best=min(candidates)
    scale=abs(float(best[0]))
    tied=[c for c in candidates if float(c[0]-best[0]) <= 8*2**-52*max(scale,abs(float(c[0])))]
    cost,leaves,risk=min(tied,key=lambda c:(c[1],c[0]))
    return float_data(dict(leaves=leaves,risk=risk,objective=cost))

def sample_oracle(rows,seed):
    indices=[state_at(seed,k)*len(rows)//MOD for k in range(1,len(rows)+1)]
    counts=Counter(indices)
    return dict(indices=indices,counts=[dict(id=r["id"],count=counts[i]) for i,r in enumerate(rows)],
                uniqueIds=[r["id"] for i,r in enumerate(rows) if counts[i]],
                oobIds=[r["id"] for i,r in enumerate(rows) if not counts[i]])

def ensemble_oracle(rows,o,seed,count):
    budget=(2**o["maxDepth"]-1)*o["mtry"] if 0<o["mtry"]<o["dimensions"] else 0
    trees=[]
    for i in range(count):
        start=i*(len(rows)+budget)
        bs,fs=state_at(seed,start),state_at(seed,start+len(rows))
        sample=sample_oracle(rows,bs)
        drawn=[dict(rows[j],id=f"draw{k+1}",sourceId=rows[j]["id"]) for k,j in enumerate(sample["indices"])]
        tree=exhaustive_tree(drawn,dict(o,seed=fs))
        trees.append(dict(bootstrapStart=start,featureStart=start+len(rows),featureBudget=budget,
                          bootstrapSeed=bs,featureSeed=fs,sample=sample,tree=tree))
    def aggregate(vs):
        return None if not vs else int(sum(vs)>Q(len(vs),2)) if o["task"]=="classification" else sum(vs)/len(vs)
    predictions,oob=[],[]
    for r in rows:
        vs=[predict(t["tree"],r["x"]) for t in trees]
        vs=[v for v in vs if v is not None]
        eligible=[(i,t) for i,t in enumerate(trees) if r["id"] in t["sample"]["oobIds"]]
        ovs=[predict(t["tree"],r["x"]) for _,t in eligible]
        ovs=[v for v in ovs if v is not None]
        predictions.append(dict(id=r["id"],values=vs,value=aggregate(vs),
                                voteFraction=Q(sum(v==1 for v in vs),len(vs)) if vs and o["task"]=="classification" else None))
        oob.append(dict(id=r["id"],treeIds=[f"tree{i+1}" for i,_ in eligible],values=ovs,value=aggregate(ovs)))
    evaluated=[(p["value"],r["y"]) for p,r in zip(oob,rows) if p["value"] is not None]
    metric=None if not evaluated else (Q(sum(v==y for v,y in evaluated),len(evaluated)) if o["task"]=="classification" else
                                       sum((v-Q(y))**2 for v,y in evaluated)/len(evaluated))
    return float_data(dict(trees=[dict(t,tree=tree_summary(t["tree"])) for t in trees],
                           predictions=predictions,oob=oob,eligible=len(evaluated),oobMetric=metric))

def boosting_oracle(rows,o,rate,stages):
    if not rows:
        return dict(baseline=None,predictions=[],stages=[],loss=None)
    baseline=sum(Q(r["y"]) for r in rows)/len(rows)
    values=[baseline]*len(rows)
    loss=lambda v:sum((Q(r["y"])-p)**2 for r,p in zip(rows,v))/(2*len(rows))
    trace=[]
    for m in range(stages):
        before=values[:]
        residual=[Q(r["y"])-p for r,p in zip(rows,values)]
        # Leaf averages and split scores remain exact Fractions throughout.
        tree=exhaustive_tree([dict(r,y=y) for r,y in zip(rows,residual)],o)
        fitted=[predict(tree,r["x"]) for r in rows]
        values=[p+Q(rate)*h for p,h in zip(before,fitted)]
        trace.append(dict(stage=m+1,before=before,residuals=residual,fitted=fitted,after=values[:],
                          lossBefore=loss(before),lossAfter=loss(values),tree=tree_summary(tree)))
    return float_data(dict(baseline=baseline,predictions=values,stages=trace,loss=loss(values)))
