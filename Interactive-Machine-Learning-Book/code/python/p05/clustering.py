"""Canonical from-scratch NumPy clustering. X is n×2; centers are k×2.
No target column, fitting library, hidden reseeding, or optimum guarantee.
"""
import json
import math
import sys
from copy import deepcopy
import numpy as np


def number(v, name, lo=None, hi=None, integer=False):
    try:
        valid = isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(float(v))
    except (OverflowError, TypeError):
        valid = False
    if not valid:
        raise ValueError(f"{name} must be a finite number.")
    v = float(v)
    if (lo is not None and v < lo) or (hi is not None and v > hi) or (integer and v != math.floor(v)):
        raise ValueError(f"{name} is outside its supported range.")
    return int(v) if integer else v


def vector(v, name):
    if not isinstance(v, (list, tuple)) or len(v) != 2:
        raise ValueError(f"{name} needs a dense two-feature row.")
    return [number(x, name) for x in v]


def observations(points):
    if not isinstance(points, list) or not 1 <= len(points) <= 32:
        raise ValueError("Use 1–32 observations; empty data have no objective.")
    ids, rows = set(), []
    for p in points:
        if not isinstance(p, dict) or not isinstance(p.get("id"), str) or not p["id"].strip() or p["id"] in ids:
            raise ValueError("Observation IDs must be unique nonempty strings.")
        ids.add(p["id"])
        rows.append(vector(p.get("x"), "Observation"))
    return np.asarray(rows, dtype=np.float64)


def scales_vector(scales):
    values = vector(scales, "Scales")
    if any(x <= 0 for x in values):
        raise ValueError("Reference scales must be positive.")
    return values


def squared_distance(a, b, scales=(1, 1)):
    a, b, scales = vector(a, "First vector"), vector(b, "Second vector"), scales_vector(scales)
    total = 0.0
    for j in range(2):
        difference = number(a[j]-b[j], "Coordinate difference")
        delta = number(difference/scales[j], "Scaled difference")
        square = number(delta*delta, "Squared difference")
        if difference != 0 and (delta == 0 or square == 0):
            raise ValueError("Distance underflow: rescale coordinates or reference scales so distinct points remain distinguishable.")
        total = number(total+square, "Squared distance")
    return total


def distance_matrix(X, centers, scales):
    # Explicit scalar boundary checks keep NumPy warning settings from changing semantics.
    return np.asarray([[squared_distance(x.tolist(), c.tolist(), scales) for c in centers] for x in X], dtype=np.float64)


def inspect_lloyd(state):
    X = observations(state["points"])
    scales = scales_vector(state["scales"])
    centers = state["centers"]
    if not isinstance(centers, list):
        raise ValueError("Centroids must be a dense array.")
    number(len(centers), "k", 1, len(X), True)
    C = np.asarray([vector(c, "Centroid") for c in centers], dtype=np.float64)
    phase, labels = state["phase"], state["labels"]
    if phase not in ("ready", "assign", "update") or type(state["stopped"]) is not bool:
        raise ValueError("Invalid phase or stop flag.")
    number(state["iteration"], "Iteration", 0, 1000, True)
    if phase == "ready":
        if labels is not None or state["stopped"] or state["iteration"] != 0:
            raise ValueError("Invalid ready state.")
    elif not isinstance(labels, list) or len(labels) != len(X):
        raise ValueError("Assignments must match rows.")
    if state["stopped"] and phase != "update":
        raise ValueError("Stop is reported only after mean update.")
    if labels is not None:
        labels = [number(v, "Assignment", 0, len(C)-1, True) for v in labels]
    D = distance_matrix(X, C, scales)
    nearest = np.argmin(D, axis=1).tolist()  # first index on computed equality
    held = nearest if labels is None else labels
    clusters = []
    for j, c in enumerate(C):
        indices = [i for i, label in enumerate(held) if label == j]
        sums = [0.0, 0.0]
        for i in indices:
            for d in range(2):
                sums[d] = number(sums[d]+float(X[i, d]), "Cluster sum")
        mean = [number(v/len(indices), "Mean") for v in sums] if indices else c.tolist()
        clusters.append({"index":j, "ids":[state["points"][i]["id"] for i in indices], "count":len(indices), "sums":sums, "mean":mean, "empty":not indices})
    def objective(assignment, matrix=D):
        total = 0.0
        for i, label in enumerate(assignment):
            total = number(total+float(matrix[i, label]), "WCSS")
        return total
    return {"distances":D.tolist(), "nearest":nearest, "labels":held, "clusters":clusters,
            "objective":objective(held), "nearestObjective":objective(nearest),
            "proposedObjective":objective(held, distance_matrix(X, np.asarray([c["mean"] for c in clusters]), scales)),
            "ties":[sum(v == row[nearest[i]] for v in row) > 1 for i, row in enumerate(D.tolist())]}


def lloyd_step(state):
    active = inspect_lloyd(state)
    result = deepcopy(state)
    if state["stopped"]:
        return result
    if state["phase"] != "assign":
        result.update(labels=active["nearest"], phase="assign")
    else:
        centers = [c["mean"] for c in active["clusters"]]
        result.update(centers=centers, phase="update", iteration=state["iteration"]+1, stopped=centers == state["centers"])
    inspect_lloyd(result)
    return result


def lloyd_trace(state, half_steps=40):
    number(half_steps, "Half steps", 1, 100, True)
    frames = [deepcopy(state)]
    inspect_lloyd(state)
    for _ in range(half_steps):
        if frames[-1]["stopped"]:
            break
        frames.append(lloyd_step(frames[-1]))
    return frames


def initialize(points, k, seed):
    observations(points)
    k = number(k, "k", 1, len(points), True)
    state = number(seed, "Seed", 0, 2**32-1, True)
    order = list(range(len(points)))
    for i in range(k):
        state = (1664525*state+1013904223) % 2**32
        j = i+math.floor((state/2**32)*(len(points)-i))
        order[i], order[j] = order[j], order[i]
    return [vector(points[i]["x"], "Selected centroid") for i in order[:k]]


def same_partition(a, b):
    if not isinstance(a, list) or not isinstance(b, list) or len(a) != len(b):
        raise ValueError("Partitions need equal row counts.")
    a = [number(x, "Label", 0, 31, True) for x in a]
    b = [number(x, "Label", 0, 31, True) for x in b]
    return all((a[i] == a[j]) == (b[i] == b[j]) for i in range(len(a)) for j in range(i))


def hierarchical(points, linkage, scales=(1, 1)):
    X = observations(points)
    scales_vector(scales)
    if linkage not in ("single", "complete", "average"):
        raise ValueError("Choose single, complete or average linkage.")
    D = np.sqrt(distance_matrix(X, X, scales)).tolist()
    groups = [{"id":i, "members":[i]} for i in range(len(X))]
    merges = []
    while len(groups) > 1:
        best = None
        for i in range(len(groups)):
            for j in range(i+1, len(groups)):
                values = [D[a][b] for a in groups[i]["members"] for b in groups[j]["members"]]
                if linkage == "single":
                    height = min(values)
                elif linkage == "complete":
                    height = max(values)
                else:
                    total = 0.0
                    for d in values:
                        total = number(total+d, "Linkage sum")
                    height = number(total/len(values), "Average linkage")
                if best is None or height < best[0]:
                    best = height, i, j
        height, i, j = best
        left, right = groups[i], groups[j]
        group = {"id":len(X)+len(merges), "members":sorted(left["members"]+right["members"])}
        merges.append({"left":deepcopy(left), "right":deepcopy(right), "group":deepcopy(group), "height":height})
        groups = sorted([g for g in groups if g["id"] not in (left["id"], right["id"])]+[group], key=lambda g:g["id"])
    return {"distances":D, "merges":merges}


def dbscan(points, epsilon, min_points, scales=(1, 1)):
    X = observations(points)
    epsilon = number(epsilon, "Epsilon", 0)
    min_points = number(min_points, "Minimum points", 1, len(X), True)
    limit = number(epsilon*epsilon, "Squared epsilon")
    D = distance_matrix(X, X, scales).tolist()
    neighborhoods = [[i for i, d in enumerate(row) if d <= limit] for row in D]
    core = [len(ns) >= min_points for ns in neighborhoods]
    labels, visited, count = [-1]*len(X), [False]*len(X), 0
    for i in range(len(X)):
        if visited[i]:
            continue
        visited[i] = True
        if not core[i]:
            continue
        labels[i] = count
        queue, queued = list(neighborhoods[i]), set(neighborhoods[i])
        q = 0
        while q < len(queue):
            j = queue[q]
            if not visited[j]:
                visited[j] = True
                if core[j]:
                    for v in neighborhoods[j]:
                        if v not in queued:
                            queue.append(v); queued.add(v)
            if labels[j] == -1:
                labels[j] = count
            q += 1
        count += 1
    return {"distances":D, "neighborhoods":neighborhoods, "core":core, "labels":labels, "count":count,
            "kinds":["core" if core[i] else "noise" if label < 0 else "border" for i, label in enumerate(labels)]}


def dispatch(request):
    operation = request["operation"]
    if operation == "lloyd":
        state = request["state"]
        before = inspect_lloyd(state)
        after_state = lloyd_step(state)
        after = inspect_lloyd(after_state)
        return {"distances":before["distances"], "labels":before["labels"], "means":[c["mean"] for c in before["clusters"]],
                "empty":[c["empty"] for c in before["clusters"]], "objective":before["objective"],
                "proposedObjective":before["proposedObjective"], "afterCenters":after_state["centers"], "afterObjective":after["objective"]}
    if operation == "hierarchical":
        result = hierarchical(request["points"], request["linkage"], request.get("scales", [1, 1]))
        return {"merges":[{"left":m["left"]["members"], "right":m["right"]["members"], "height":m["height"]} for m in result["merges"]]}
    if operation == "dbscan":
        result = dbscan(request["points"], request["epsilon"], request["minPoints"], request.get("scales", [1, 1]))
        return {k:result[k] for k in ("neighborhoods", "core", "labels", "kinds", "count")}
    if operation == "initialize":
        return {"centers":initialize(request["points"], request["k"], request["seed"])}
    raise ValueError("Unknown clustering operation.")


if __name__ == "__main__":
    raw = "" if sys.stdin.isatty() else sys.stdin.read()
    default = {"operation":"lloyd", "state":{"points":[{"id":f"s{i+1}", "x":[x,0]} for i, x in enumerate([-3,-1,1,3])], "centers":[[-3,0],[1,0]], "scales":[1,1], "labels":[0,0,1,1], "phase":"assign", "iteration":0, "stopped":False}}
    try:
        print(json.dumps(dispatch(json.loads(raw) if raw.strip() else default), allow_nan=False, indent=2))
    except (ValueError, KeyError, TypeError, OverflowError) as error:
        print(f"Clustering input error: {error}", file=sys.stderr)
        raise SystemExit(2)
