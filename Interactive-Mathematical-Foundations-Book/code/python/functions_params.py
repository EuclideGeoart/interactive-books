# A model is a function of an input x that also depends on parameters: here f(x; w, b) = w*x + b. Training chooses the parameters,
# so the LOSS is a second function, this time of (w, b), with the data held fixed.
def model(x, w, b):
    return w * x + b


data = [(0, 1), (1, 3), (2, 5), (3, 7)]  # these points lie exactly on y = 2x + 1


def loss(w, b):
    """Mean squared error of the model on the data, as a function of the parameters."""
    return sum((model(x, w, b) - y) ** 2 for x, y in data) / len(data)


print(loss(2, 1))  # 0.0: the right parameters
print(loss(1, 1))  # 3.5: errors 0, -1, -2, -3 give (0 + 1 + 4 + 9) / 4
print(loss(2, 0))  # 1.0: every prediction is 1 too low


# A neural-network layer is a composition: an affine map followed by an activation function.
def relu(z):
    return max(z, 0.0)


def make_layer(w, b):
    return lambda x: relu(model(x, w, b))


layer = make_layer(2.0, 1.0)
print(layer(-1.0), layer(2.0))  # 0.0 5.0: 2*(-1) + 1 = -1 is clipped to 0, and 2*2 + 1 = 5 passes through
print(relu(-3.0), relu(-1.0))  # 0.0 0.0: two inputs, one output, so relu cannot be undone
