"""Explicit toy states and edge experiments; these do not import canonical code."""
import copy

NEIGHBORS = {
    "samples":[{"id":"s1","x":-2,"y":0,"category":"A","target":2},{"id":"s2","x":-1,"y":1,"category":"A","target":4},
               {"id":"s3","x":-1,"y":-1,"category":"A","target":6},{"id":"s4","x":1,"y":0,"category":"B","target":8},
               {"id":"s5","x":1,"y":1,"category":"B","target":10},{"id":"s6","x":2,"y":-1,"category":"B","target":12}],
    "query":{"x":0,"y":0},"k":3,"metric":"L2","p":2,"scales":[1,1],"provenance":"Hand-authored six-row toy dataset"}
METRICS = {"query":{"x":0,"y":0},"point":{"x":2,"y":1},"metric":"L2","p":2,"scales":[1,1],
           "seed":42,"dimension":2,"distribution":"cube","normalization":"raw"}
BAYES = {"classes":[{"id":"A","priorWeight":.6,"count":6,"positive":[4,1]},{"id":"B","priorWeight":.4,"count":4,"positive":[1,3]}],
         "query":[1,1],"observed":[True,True],"alpha":1,"provenance":"Hand-authored ten-row Bernoulli toy counts"}

def changed(state, **kwargs):
    return dict(copy.deepcopy(state), **kwargs)

def states():
    neighbors = [("canonical",copy.deepcopy(NEIGHBORS)),("query-right",changed(NEIGHBORS,query={"x":1.5,"y":0}))]
    neighbors += [("k-"+str(k),changed(NEIGHBORS,k=k)) for k in (1,2,6,7,64)]
    neighbors += [("metric-"+m,changed(NEIGHBORS,metric=m,p=3,scales=[2,.5])) for m in ("L1","L2","Lp")]
    neighbors.append(("duplicates",changed(NEIGHBORS,k=2,query={"x":1,"y":0},samples=NEIGHBORS["samples"]+[{"id":"s7","x":1,"y":0,"category":"A","target":0}])))
    neighbors.append(("vote-tie",changed(NEIGHBORS,k=4,samples=[
        {"id":"aa","x":-1,"y":0,"category":"A","target":2},{"id":"ab","x":1,"y":0,"category":"A","target":4},
        {"id":"ba","x":0,"y":-1,"category":"B","target":6},{"id":"bb","x":0,"y":1,"category":"B","target":8}])))
    neighbors.append(("one-sample",changed(NEIGHBORS,k=1,samples=NEIGHBORS["samples"][:1])))
    neighbors.append(("special-ids",changed(NEIGHBORS,k=1,samples=[
        {"id":"__proto__","x":0,"y":0,"category":"A","target":1},
        {"id":"\U0001f600","x":0,"y":0,"category":"B","target":2},
        {"id":"\ue000","x":0,"y":0,"category":"B","target":3}])))
    neighbors.append(("binary64-integer-duplicates",changed(NEIGHBORS,k=2,query={"x":2**53,"y":0},samples=[
        {"id":"a","x":2**53+1,"y":0,"category":"A","target":2},
        {"id":"b","x":2**53,"y":0,"category":"B","target":4}])))
    metrics = [("dimension-"+str(d),changed(METRICS,dimension=d)) for d in (1,2,8,32)]
    metrics += [("line-"+str(d),changed(METRICS,distribution="line",dimension=d)) for d in (1,32)]
    metrics += [("pair-"+m,changed(METRICS,metric=m,p=1.5,scales=[2,.5],dimension=8,normalization="per-coordinate")) for m in ("L1","L2","Lp")]
    metrics += [("seed-zero",changed(METRICS,seed=0,dimension=2)),("seed-max",changed(METRICS,seed=2**32-1,dimension=2))]
    bayes = [("canonical",copy.deepcopy(BAYES)),("unsmoothed",changed(BAYES,alpha=0)),
             ("prior-only",changed(BAYES,observed=[False,False])),("first-only",changed(BAYES,observed=[True,False])),
             ("absent-evidence",changed(BAYES,query=[0,0]))]
    for name in ("zero-prior","all-zero-priors","impossible","tiny","empty-class","empty-smoothed","zero-prior-empty"):
        state = copy.deepcopy(BAYES)
        if name in ("zero-prior","all-zero-priors","zero-prior-empty"):
            state["classes"][0]["priorWeight"] = 0
        if name == "all-zero-priors":
            state["classes"][1]["priorWeight"] = 0
        if name in ("impossible","tiny"):
            state["alpha"] = 0 if name == "impossible" else 1e-200
            for c in state["classes"]:
                c["positive"] = [0,0]
        if name in ("empty-class","empty-smoothed","zero-prior-empty"):
            state["classes"][0].update(count=0,positive=[0,0])
            state["alpha"] = 1 if name == "empty-smoothed" else 0
        bayes.append((name,state))
    tie = changed(BAYES,classes=[{"id":c,"priorWeight":1,"count":2,"positive":[1,1]} for c in ("A","B")])
    bayes.append(("posterior-tie",tie))
    bayes.append(("distinct-count-rational-tie",changed(BAYES,alpha=0,classes=[
        {"id":"A","priorWeight":1,"count":9,"positive":[1,1]},
        {"id":"B","priorWeight":1,"count":18,"positive":[2,2]}])))
    for name,alpha,classes in [
        ("different-factor-product-tie",0,[{"id":"A","priorWeight":1,"count":7,"positive":[1,6]},{"id":"B","priorWeight":1,"count":7,"positive":[2,3]}]),
        ("weighted-unsmoothed-tie",0,[{"id":"A","priorWeight":2,"count":2,"positive":[1,2]},{"id":"B","priorWeight":1,"count":3,"positive":[3,3]}]),
        ("smoothed-exact-tie",1,[{"id":"A","priorWeight":4,"count":2,"positive":[1,1]},{"id":"B","priorWeight":2.25,"count":1,"positive":[1,1]}]),
        ("unequal-rounded-posterior",5e-324,[{"id":"A","priorWeight":1,"count":7,"positive":[1,6]},{"id":"B","priorWeight":1,"count":7,"positive":[2,3]}]),
        ("hand-worked-integer-weights",1,[{"id":"A","priorWeight":3,"count":6,"positive":[4,1]},{"id":"B","priorWeight":2,"count":4,"positive":[1,3]}]),
    ]:
        bayes.append((name,changed(BAYES,alpha=alpha,classes=classes)))
    return {"neighbors":neighbors,"metrics":metrics,"bayes":bayes}
