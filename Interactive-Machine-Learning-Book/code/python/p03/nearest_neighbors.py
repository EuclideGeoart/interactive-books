"""From-scratch k-NN: exact identities, distances, votes and unweighted average."""
import copy
import json
import numpy as np
from common import distance, id_key, number, power_for

CANONICAL = {
    "samples":[
        {"id":"s1","x":-2,"y":0,"category":"A","target":2},
        {"id":"s2","x":-1,"y":1,"category":"A","target":4},
        {"id":"s3","x":-1,"y":-1,"category":"A","target":6},
        {"id":"s4","x":1,"y":0,"category":"B","target":8},
        {"id":"s5","x":1,"y":1,"category":"B","target":10},
        {"id":"s6","x":2,"y":-1,"category":"B","target":12},
    ],
    "query":{"x":0,"y":0},"k":3,"metric":"L2","p":2,"scales":[1,1],
    "provenance":"Hand-authored six-row toy dataset",
}

def derive(state):
    state = copy.deepcopy(state)
    state["query"] = {key:number(state["query"][key],"Query coordinate") for key in ("x","y")}
    samples = state["samples"]
    if not isinstance(samples, list) or not 1 <= len(samples) <= 32:
        raise ValueError("Neighbors require 1 to 32 observations.")
    k = int(number(state["k"], "k", 1, 64, True))
    power_for(state["metric"], state["p"])
    if not isinstance(state["provenance"], str):
        raise ValueError("Provenance must be text.")
    ids, rows = set(), []
    for index,row in enumerate(samples):
        if not isinstance(row,dict) or not all(key in row for key in ("id","x","y","category","target")):
            raise ValueError(f"Observation at index {index} must be a sample record with id, x, y, category and target.")
        ident = row["id"]
        if not isinstance(ident, str) or not ident.strip() or ident in ids:
            raise ValueError("Sample IDs must be unique nonempty strings.")
        ids.add(ident)
        if row["category"] not in ("A", "B"):
            raise ValueError("A sample category must be A or B.")
        for key in ("x","y","target"):
            row[key] = number(row[key], "Sample "+key)
        d = distance([row["x"],row["y"]],[state["query"]["x"],state["query"]["y"]],state["metric"],state["p"],state["scales"])
        rows.append(dict(row, distance=d))
    rows.sort(key=lambda row:(row["distance"],id_key(row["id"])))
    reason = "k exceeds the number of observations; no neighbor prediction is defined." if k > len(rows) else None
    rows = [dict(row,rank=j+1,selected=reason is None and j < k) for j,row in enumerate(rows)]
    selected = [row for row in rows if row["selected"]]
    votes = [{"category":c,"count":sum(row["category"] == c for row in selected)} for c in ("A","B")]
    values = np.asarray([row["target"] for row in selected],dtype=np.float64).reshape(-1,1)
    largest = float(np.max(np.abs(values))) if len(values) else 0
    mean = None if reason else 0.0 if largest == 0 else float(number(largest*float(np.mean(values/largest)),"Regression average"))
    return {"state":copy.deepcopy(state),"rows":rows,"selectedIds":[row["id"] for row in selected],"votes":votes,
            "classification":None if reason else "A" if votes[0]["count"] >= votes[1]["count"] else "B",
            "regression":mean,"reason":reason,"voteTie":reason is None and votes[0]["count"] == votes[1]["count"],
            "boundaryTie":reason is None and k < len(rows) and rows[k-1]["distance"] == rows[k]["distance"],
            "duplicateIds":[row["id"] for row in rows if any(other["id"] != row["id"] and other["x"] == row["x"] and other["y"] == row["y"] for other in rows)],
            "shapes":{"X":[len(rows),2],"query":[2,1],"distances":[len(rows),1],"targets":[len(rows),1]}}

def trace(state):
    states = [copy.deepcopy(state)] + [dict(copy.deepcopy(state),query={"x":x,"y":0}) for x in (-1.5,0,1.5)]
    return [{"index":j,"state":value,"derived":derive(value)} for j,value in enumerate(states)]

if __name__ == "__main__":
    after = dict(copy.deepcopy(CANONICAL),query={"x":1.5,"y":0})
    print(json.dumps({"before":derive(CANONICAL),"after":derive(after),"trace":trace(CANONICAL)},allow_nan=False))
