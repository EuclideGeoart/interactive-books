"""Forward mode with dual numbers and reverse mode with a tape, written independently (III.10).

z = (x + y) * x at x = 2, y = 3: dz/dx = 2x + y = 7 and dz/dy = x = 2.
"""


class Dual:
    """a + b*eps with eps**2 = 0: b carries the derivative with respect to the seeded input."""
    def __init__(self, a, b=0.0):
        self.a, self.b = a, b

    def __add__(self, o):
        o = o if isinstance(o, Dual) else Dual(o)
        return Dual(self.a + o.a, self.b + o.b)

    def __mul__(self, o):
        o = o if isinstance(o, Dual) else Dual(o)
        return Dual(self.a * o.a, self.a * o.b + self.b * o.a)


def z_of(x, y):
    u = x + y
    return u * x


# Forward mode: one pass per input.
assert z_of(Dual(2, 1), Dual(3, 0)).b == 7
assert z_of(Dual(2, 0), Dual(3, 1)).b == 2

# Reverse mode: record (node, [(argument, local derivative)]) on a tape, then accumulate adjoints backward.
values = {"x": 2, "y": 3}
tape = []
values["u"] = values["x"] + values["y"]; tape.append(("u", [("x", 1), ("y", 1)]))
values["z"] = values["u"] * values["x"]; tape.append(("z", [("u", values["x"]), ("x", values["u"])]))
adjoint = {name: 0 for name in values}
adjoint["z"] = 1
for node, edges in reversed(tape):
    for arg, local in edges:
        adjoint[arg] += adjoint[node] * local          # ADD: x receives one contribution per path
assert (adjoint["x"], adjoint["y"]) == (7, 2)
