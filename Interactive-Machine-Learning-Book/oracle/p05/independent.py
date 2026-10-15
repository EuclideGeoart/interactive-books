"""Mathematical oracle: rational expanded quadratic, exhaustive partitions,
Decimal linkage norms, core-only graph transitive closure and closed-form LCG.
Imports no canonical implementation, NumPy, browser model or fixture expectations.
"""
from decimal import Decimal, localcontext
from fractions import Fraction as F
from itertools import combinations


def frac(v):
    return F.from_float(float(v))


def quadratic(a, b, scales=(1, 1)):
    # Expanded inner product, distinct from the canonical delta/square loop.
    return sum((frac(x)**2+frac(y)**2-2*frac(x)*frac(y))/frac(s)**2 for x, y, s in zip(a, b, scales))


def cluster_mean(points):
    return [sum(frac(p[d]) for p in points)/len(points) for d in range(2)]


def partition_cost(points, labels, scales=(1, 1)):
    # Identity: SSE around the mean = sum_{i<j} ||x_i-x_j||² / cluster size.
    return sum(sum(quadratic(points[i], points[j], scales) for i, j in combinations(group, 2))/len(group)
               for label in set(labels) if (group := [i for i, v in enumerate(labels) if v == label]))


def partitions(n, k):
    """Restricted growth strings enumerate each unlabeled nonempty partition once."""
    def visit(labels):
        if len(labels) == n:
            if max(labels)+1 == k:
                yield labels
            return
        for label in range(min(k-1, max(labels)+1)+1):
            yield from visit(labels+[label])
    yield from visit([0])


def global_tiny(points, k, scales=(1, 1)):
    values = [(partition_cost(points, labels, scales), labels) for labels in partitions(len(points), k)]
    return min(values, key=lambda item:(item[0], item[1]))


def lloyd(request):
    s = request["state"]
    points = [p["x"] for p in s["points"]]
    D = [[quadratic(x, c, s["scales"]) for c in s["centers"]] for x in points]
    nearest = [min(range(len(row)), key=lambda j:(row[j], j)) for row in D]
    labels = nearest if s["labels"] is None else s["labels"]
    groups = [[x for x, label in zip(points, labels) if label == j] for j in range(len(s["centers"]))]
    means = [cluster_mean(group) if group else list(map(frac, s["centers"][j])) for j, group in enumerate(groups)]
    J = sum(row[label] for row, label in zip(D, labels))
    after_centers = means if s["phase"] == "assign" and not s["stopped"] else [list(map(frac, c)) for c in s["centers"]]
    after_labels = labels if s["phase"] == "assign" or s["stopped"] else nearest
    after_J = sum(quadratic(x, after_centers[label], s["scales"]) for x, label in zip(points, after_labels))
    return {"distances":[list(map(float, row)) for row in D], "labels":labels, "means":[list(map(float, c)) for c in means],
            "empty":[not group for group in groups], "objective":float(J), "afterCenters":[list(map(float, c)) for c in after_centers], "afterObjective":float(after_J), "proposedObjective":float(sum(quadratic(x,means[label],s["scales"]) for x,label in zip(points,labels)))}


def sqrt_fraction(v):
    with localcontext() as ctx:
        ctx.prec = 80
        return (Decimal(v.numerator)/Decimal(v.denominator)).sqrt()


def hierarchy(request):
    points, linkage = [p["x"] for p in request["points"]], request["linkage"]
    distances = {(i,j):sqrt_fraction(quadratic(points[i], points[j], request.get("scales", [1,1]))) for i in range(len(points)) for j in range(len(points))}
    groups = {i:(i,) for i in range(len(points))}
    result = []
    with localcontext() as ctx:
        ctx.prec = 80
        while len(groups) > 1:
            def score(pair):
                a, b = pair
                values = [distances[i,j] for i in groups[a] for j in groups[b]]
                height = min(values) if linkage == "single" else max(values) if linkage == "complete" else sum(values)/len(values)
                return height, a, b
            height, a, b = min(map(score, combinations(sorted(groups), 2)))
            left, right = groups.pop(a), groups.pop(b)
            result.append({"left":list(left), "right":list(right), "height":float(height)})
            groups[len(points)+len(result)-1] = tuple(sorted(left+right))
    return {"merges":result}


def density(request):
    points = [p["x"] for p in request["points"]]
    n, limit = len(points), frac(request["epsilon"])**2
    adjacent = [[quadratic(a,b,request.get("scales",[1,1])) <= limit for b in points] for a in points]
    neighborhoods = [[j for j in range(n) if adjacent[i][j]] for i in range(n)]
    core = [sum(row) >= request["minPoints"] for row in adjacent]
    # Warshall closure on CORE vertices only: borders cannot connect components.
    reach = [[core[i] and core[j] and adjacent[i][j] for j in range(n)] for i in range(n)]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                reach[i][j] = reach[i][j] or (reach[i][k] and reach[k][j])
    components = []
    remaining = {i for i in range(n) if core[i]}
    while remaining:
        first = min(remaining)
        group = {j for j in remaining if reach[first][j]}
        components.append(group)
        remaining -= group
    labels = [next((label for label, group in enumerate(components) if any(adjacent[i][j] for j in group)), -1) for i in range(n)]
    return {"neighborhoods":neighborhoods, "core":core, "labels":labels, "count":len(components),
            "kinds":["core" if core[i] else "noise" if label < 0 else "border" for i, label in enumerate(labels)]}


def lcg_integer(seed, index):
    a, c, modulus = 1664525, 1013904223, 2**32
    # Closed-form geometric series, rather than stepping canonical generator state.
    power = pow(a, index, modulus*(a-1))
    return (power*seed+c*((power-1)//(a-1))) % modulus


def initialization(request):
    order = list(range(len(request["points"])))
    for i in range(request["k"]):
        # Exact integer floor of rational draw times remaining length.
        j = i+lcg_integer(request["seed"], i+1)*(len(order)-i)//2**32
        order[i], order[j] = order[j], order[i]
    return {"centers":[request["points"][i]["x"] for i in order[:request["k"]]]}


def expected(request):
    return {"lloyd":lloyd, "hierarchical":hierarchy, "dbscan":density, "initialize":initialization}[request["operation"]](request)


if __name__ == "__main__":
    assert quadratic([-3,0],[1,0]) == 16
    assert cluster_mean([[-3,0],[-1,0]]) == [-2,0]
    rectangle = [[-2,-1],[-2,1],[2,-1],[2,1]]
    assert partition_cost(rectangle, [0,1,0,1]) == 16
    assert global_tiny(rectangle, 2) == (F(4), [0,0,1,1])
    assert len(list(partitions(4,2))) == 7
    assert lcg_integer(0,1) == 1013904223
    assert lcg_integer(0,2) == 1196435762
    print("Part V independent mathematical self-tests passed.")
