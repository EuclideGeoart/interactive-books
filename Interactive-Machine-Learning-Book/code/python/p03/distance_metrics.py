"""Feature units, scaled Lp distances and a bounded seeded dimension experiment."""
import copy
import json
import numpy as np
from common import distance, lcg, number, power_for

CANONICAL = {"query":{"x":0,"y":0},"point":{"x":2,"y":1},"metric":"L2","p":2,"scales":[1,1],
             "seed":42,"dimension":2,"distribution":"cube","normalization":"raw"}

def summarize(values):
    if not isinstance(values, (list,tuple)) or not values:
        raise ValueError("A distance summary needs observations.")
    array = np.asarray([number(v,"Summary distance",0) for v in values],dtype=np.float64).reshape(-1,1)
    lo, hi = float(np.min(array)), float(np.max(array))
    if hi == 0:
        return {"min":lo,"max":hi,"mean":0.0,"sd":0.0,"relativeSpread":None,"coefficientOfVariation":None,
                "meanUnderflow":False,"sdUnderflow":False,
                "reason":"All distances are zero; relative spread and coefficient of variation are undefined."}
    unit = array/hi
    unit_mean = float(np.mean(unit))
    unit_sd = float(np.sqrt(np.mean((unit-unit_mean)**2)))
    mean, sd = hi*unit_mean, hi*unit_sd
    mean_underflow, sd_underflow = mean == 0, unit_sd > 0 and sd == 0
    return {"min":lo,"max":hi,"mean":mean,"sd":sd,
            "relativeSpread":(1-lo/hi)/unit_mean,"coefficientOfVariation":unit_sd/unit_mean,
            "meanUnderflow":mean_underflow,"sdUnderflow":sd_underflow,
            "reason":"Positive mean or standard deviation underflowed to zero; relative metrics use normalized arithmetic." if mean_underflow or sd_underflow else None}

def derive(state):
    power = power_for(state["metric"],state["p"])
    seed = int(number(state["seed"],"Seed",0,2**32-1,True))
    dimension = int(number(state["dimension"],"Dimension",1,32,True))
    if state["distribution"] not in ("cube","line") or state["normalization"] not in ("raw","per-coordinate"):
        raise ValueError("Choose a supported distribution and normalization.")
    pair = distance([state["point"]["x"],state["point"]["y"]],[state["query"]["x"],state["query"]["y"]],state["metric"],state["p"],state["scales"])
    draws = lcg(seed)
    full = np.asarray([[2*next(draws)-1 for _ in range(32)] for _ in range(24)],dtype=np.float64)
    X = full[:,:dimension].copy()
    if state["distribution"] == "line":
        X[:,1:] = 0
    divisor = 1 if state["normalization"] == "raw" else dimension**(1/power)
    rows = []
    for j,column in enumerate(X):
        raw = distance(column.tolist(),[0]*dimension,state["metric"],state["p"])
        rows.append({"id":"d"+str(j+1),"features":column.tolist(),"raw":raw,"distance":raw/divisor})
    return {"state":copy.deepcopy(state),"power":power,"pairDistance":pair,"rows":rows,
            "summary":summarize([row["distance"] for row in rows]),
            "shapes":{"X":[24,dimension],"query":[dimension,1],"distances":[24,1]},
            "provenance":f"LCG seed {seed}; 24 rows, 32 draws per row, prefixes retained; "+
                ("cube model: pseudo-random uniform-coordinate draws in [−1,1]" if state["distribution"] == "cube" else "one uniform coordinate, remaining coordinates exactly zero")}

def trace(state):
    states = [copy.deepcopy(state)] + [dict(copy.deepcopy(state),dimension=d) for d in (1,2,8,32)]
    return [{"index":j,"state":value,"derived":derive(value)} for j,value in enumerate(states)]

if __name__ == "__main__":
    print(json.dumps({"before":derive(CANONICAL),"after":derive(dict(CANONICAL,dimension=32)),"trace":trace(CANONICAL)},allow_nan=False))
