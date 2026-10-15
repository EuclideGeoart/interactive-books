"""Fresh independent expectations; --check reruns real canonical Python+NumPy."""
import argparse
import importlib.util
import json
from pathlib import Path
from independent import (enumerate_partitions,exhaustive_tree,tree_summary,float_data,predict,
                         pruning_oracle,sample_oracle,ensemble_oracle,boosting_oracle)
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location("p04_canonical",ROOT/"code/python/p04/trees_ensembles.py")
canonical=importlib.util.module_from_spec(spec)
spec.loader.exec_module(canonical)
O=canonical.DEFAULT_OPTIONS
C=canonical.CLASS_ROWS
R=canonical.REG_ROWS
TINY=[dict(id=f"a{i+1}",x=[i+1,int(i>1)],y=y) for i,y in enumerate([0,0,2,2])]
REG=dict(O,task="regression",criterion="sse")
DECIMAL=[dict(id=f"d{i}",x=[i],y=.1) for i in range(3)]
CASES=[
 dict(name="decimal-constant",operation="tree",rows=DECIMAL,options=dict(REG,dimensions=1)),
 dict(name="decimal-close-distinct",operation="tree",rows=[dict(id="d0",x=[0],y=.1),dict(id="d1",x=[1],y=.10000000000000006)],options=dict(REG,dimensions=1)),
 dict(name="decimal-ensemble",operation="bagging",rows=DECIMAL,options=dict(REG,dimensions=1),seed=7,count=3),
 dict(name="decimal-boosting",operation="boosting",rows=DECIMAL,options=dict(REG,dimensions=1),rate=.5,stages=3),
 dict(name="classification-gini",operation="tree",rows=C,options=O,probe=[2.5,0]),
 dict(name="classification-entropy",operation="tree",rows=C,options=dict(O,criterion="entropy"),probe=[2.5,0]),
 dict(name="pure",operation="tree",rows=C[:2],options=O,probe=[0,0]),
 dict(name="empty",operation="tree",rows=[],options=O,probe=[0,0]),
 dict(name="constant-features",operation="tree",rows=[dict(r,x=[1,1]) for r in C],options=O),
 dict(name="minimum-leaf",operation="tree",rows=C,options=dict(O,minLeaf=3)),
 dict(name="gain-tie",operation="tree",rows=[dict(id=f"t{i}",x=[i,i],y=y) for i,y in enumerate([0,1,1,0])],options=O),
 dict(name="regression",operation="tree",rows=R,options=REG,alpha=.25),
 dict(name="pruning-rational-tie",operation="tree",rows=[dict(id=f"r{i}",x=[i],y=y) for i,y in enumerate([1,1,5,5,5])],options=dict(REG,dimensions=1),alpha=3.84),
 dict(name="bootstrap-zero",operation="bootstrap",rows=C,options=O,seed=0),
 dict(name="bootstrap-seven",operation="bootstrap",rows=C,options=O,seed=7),
 dict(name="bagging",operation="bagging",rows=C,options=O,seed=7,count=3),
 dict(name="forest",operation="bagging",rows=C,options=dict(O,mtry=1),seed=7,count=3),
 dict(name="bagging-regression",operation="bagging",rows=R,options=REG,seed=0,count=3),
 dict(name="oob-none",operation="bagging",rows=C[:1],options=O,seed=7,count=3),
 dict(name="zero-trees",operation="bagging",rows=C,options=O,seed=7,count=0),
 dict(name="boosting-tiny",operation="boosting",rows=TINY,options=dict(REG,maxDepth=1),rate=.5,stages=3),
 dict(name="boosting",operation="boosting",rows=R,options=dict(REG,maxDepth=1),rate=.5,stages=3),
 dict(name="boosting-empty",operation="boosting",rows=[],options=REG,rate=.5,stages=3),
]
def expected(c):
    rows,o=c["rows"],c["options"]
    if c["operation"]=="tree":
        tree=exhaustive_tree(rows,o)
        result=dict(tree=tree_summary(tree),candidates=float_data(enumerate_partitions(rows,o,list(range(o["dimensions"])))),
                    predictions=float_data([predict(tree,r["x"]) for r in rows]))
        if "probe" in c: result["probe"]=float_data(predict(tree,c["probe"]))
        if "alpha" in c: result["pruned"]=pruning_oracle(tree,c["alpha"])
        return result
    if c["operation"]=="bootstrap": return sample_oracle(rows,c["seed"])
    if c["operation"]=="bagging": return ensemble_oracle(rows,o,c["seed"],c["count"])
    return boosting_oracle(rows,o,c["rate"],c["stages"])

def summarize(c,actual):
    if c["operation"]=="tree":
        result=dict(tree=tree_summary(actual["tree"]),candidates=[{k:s[k] for k in ("feature","threshold","leftIds","rightIds","weighted","gain")} for s in actual["candidates"]],
                    predictions=[p["value"] for p in actual["predictions"]])
        if "probe" in c: result["probe"]=actual["probe"]["value"]
        if "alpha" in c: result["pruned"]={k:actual["pruned"][k] for k in ("leaves","risk","objective")}
        return result
    if c["operation"]=="bootstrap": return {k:actual[k] for k in ("indices","counts","uniqueIds","oobIds")}
    if c["operation"]=="bagging":
        trees=[dict({k:t[k] for k in ("bootstrapStart","featureStart","featureBudget","bootstrapSeed","featureSeed")},
                    sample={k:t["sample"][k] for k in ("indices","counts","uniqueIds","oobIds")},tree=tree_summary(t["tree"])) for t in actual["trees"]]
        return dict(trees=trees,predictions=[{k:p[k] for k in ("id","values","value","voteFraction")} for p in actual["predictions"]],
                    oob=[{k:p[k] for k in ("id","treeIds","values","value")} for p in actual["oob"]],
                    eligible=actual["eligible"],oobMetric=actual["oobMetric"]["value"])
    return dict(baseline=actual["baseline"],predictions=actual["predictions"],
                stages=[dict({k:s[k] for k in ("stage","before","residuals","fitted","after","lossBefore","lossAfter")},tree=tree_summary(s["tree"])) for s in actual["stages"]],loss=actual["loss"]["value"])

def compare(a,b,path="root"):
    if isinstance(a,(int,float)) and not isinstance(a,bool):
        if not isinstance(b,(int,float)) or abs(a-b)>2e-12*(1+abs(a)):
            raise AssertionError(f"{path}: expected {a}, canonical {b}")
    elif isinstance(a,dict):
        if a.keys()!=b.keys(): raise AssertionError(f"{path}: keys differ")
        for k in a: compare(a[k],b[k],path+"."+k)
    elif isinstance(a,list):
        if len(a)!=len(b): raise AssertionError(f"{path}: lengths differ")
        for i,(x,y) in enumerate(zip(a,b)): compare(x,y,f"{path}[{i}]")
    elif a!=b: raise AssertionError(f"{path}: expected {a}, canonical {b}")

def generate():
    cases=[]
    for c in CASES:
        oracle=expected(c)
        compare(oracle,summarize(c,canonical.dispatch(c)),c["name"])
        cases.append(dict(input=c,expected=oracle))
    return dict(provenance="Independent exhaustive row subsets, Fraction means/SSE/Gini, 80-digit Decimal entropy, closed-form LCG, enumerated subtrees, exact residual stages. Canonical Python+NumPy executed freshly.",
                tolerance=dict(absolute=2e-12,relative=2e-12,exact="IDs, counts, dimensions, seeds, partitions, feature subsets, nullability"),
                cases=cases)
if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--check",action="store_true");parser.add_argument("--write",action="store_true");args=parser.parse_args()
    fresh=json.dumps(generate(),indent=2,allow_nan=False)+"\n"
    path=ROOT/"fixtures/p04/trees.fixtures.json"
    if args.check:
        if not path.exists() or path.read_text()!=fresh: raise SystemExit("P04 fixtures stale or missing.")
        print(f"P04: {len(CASES)} fresh independent/canonical cases match committed fixtures.")
    elif args.write:
        path.write_text(fresh);print(f"Wrote {len(CASES)} independently proved P04 cases.")
    else: print(fresh)
