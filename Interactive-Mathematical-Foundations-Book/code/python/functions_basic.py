# A function is a rule that sends every input to exactly one output. In Python a function is also a value: it can be passed
# to another function, stored in a list, or returned.
def shifted_square(x):
    return (x - 2) ** 2  # subtract 2, then square


def square(x):
    return x**2


def line(x):
    return 2 * x - 1


def compose(outer, inner):
    """outer after inner: the output of `inner` becomes the input of `outer`."""
    return lambda x: outer(inner(x))


print(shifted_square(-1), shifted_square(5))  # 9 9: two different inputs may share one output
print(compose(square, line)(3), compose(line, square)(3))  # 25 17: the order of the machines matters

inputs = list(range(-3, 4))
table = [(x, shifted_square(x)) for x in inputs]
print(table)  # [(-3, 25), (-2, 16), (-1, 9), (0, 4), (1, 1), (2, 0), (3, 1)]
outputs = {y for _, y in table}
print(len(outputs), len(inputs))  # 6 7: fewer outputs than inputs, so the rule is not one-to-one and cannot be undone


# 2x - 1 multiplies by 2 and then subtracts 1. Its inverse undoes the steps in the opposite order: add 1, then halve.
def undo_line(y):
    return (y + 1) / 2


print(undo_line(line(3)))  # 3.0: the round trip returns the input
