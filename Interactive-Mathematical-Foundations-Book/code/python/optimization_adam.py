"""Independent 80-digit Decimal Adam, Algorithm 1: https://arxiv.org/pdf/1412.6980.

The first moment step uses t=1; epsilon is outside the square root.
Decimal outputs involving square roots are high-precision approximations.
"""
from decimal import Decimal as D, localcontext


def adam_update(gradient, m=(0, 0), v=(0, 0), t=1,
                eta="0.25", beta1="0.9", beta2="0.999", epsilon="1e-8"):
    if type(t) is not int or t < 1:
        raise ValueError("The first update is t=1, not t=0")
    if any(len(vector) != 2 for vector in (gradient, m, v)):
        raise ValueError("Require two-component gradient and moment vectors")
    with localcontext() as context:
        context.prec = 80
        gradient, m, v = (tuple(D(str(x)) for x in vector) for vector in (gradient, m, v))
        eta, beta1, beta2, epsilon = map(lambda x: D(str(x)), (eta, beta1, beta2, epsilon))
        if not all(x.is_finite() for x in (*gradient, *m, *v, eta, beta1, beta2, epsilon)):
            raise ValueError("Require finite inputs")
        if eta <= 0 or epsilon <= 0 or not 0 <= beta1 < 1 or not 0 <= beta2 < 1 or any(x < 0 for x in v):
            raise ValueError("Require eta,epsilon>0, betas in [0,1), and nonnegative second moments")
        next_m = tuple(beta1*old+(1-beta1)*g for old, g in zip(m, gradient))
        next_v = tuple(beta2*old+(1-beta2)*g*g for old, g in zip(v, gradient))
        m_hat = tuple(value/(1-beta1**t) for value in next_m)
        v_hat = tuple(value/(1-beta2**t) for value in next_v)
        update = tuple(-eta*mean/(second.sqrt()+epsilon) for mean, second in zip(m_hat, v_hat))
        return {"t": t, "gradient": gradient, "m": next_m, "v": next_v,
                "m_hat": m_hat, "v_hat": v_hat, "update": update}


def main():
    with localcontext() as context:
        context.prec = 80
        first = adam_update((2, 4))
        assert first["m"] == (D("0.2"), D("0.4"))
        assert first["v"] == (D("0.004"), D("0.016"))
        assert first["m_hat"] == (2, 4) and first["v_hat"] == (4, 16)
        assert first["update"] == (-D("0.25")*2/(2+D("1e-8")), -D("0.25")*4/(4+D("1e-8")))
        zero = adam_update((0, 0))
        assert zero["m_hat"] == zero["v_hat"] == zero["update"] == (0, 0)
        retained = adam_update((0, 0), first["m"], first["v"], t=2)
        assert retained["m"] == (D("0.18"), D("0.36"))
        assert all(x < 0 for x in retained["update"])
        reversed_gradient = adam_update((-2, -4), first["m"], first["v"], t=2)
        assert reversed_gradient["m"] == (D("-0.02"), D("-0.04"))
        assert reversed_gradient["v"] == (D("0.007996"), D("0.031984"))
        assert reversed_gradient["m_hat"] == (-D(2)/19, -D(4)/19)
        assert reversed_gradient["v_hat"] == (4, 16)
        small_reversal = adam_update(("-0.1", 0), first["m"], first["v"], t=2)
        assert small_reversal["m"] == (D("0.17"), D("0.36"))
        assert small_reversal["update"][0] < 0  # Memory still points against the new negative gradient.
        large_epsilon = adam_update((2, 4), epsilon=1)
        assert large_epsilon["update"] == (-D(1)/6, -D(1)/5)
        theta, m, v, gradients, path = (D(2), D(1)), (D(0), D(0)), (D(0), D(0)), [], []
        for t in range(1, 9):
            gradient = (theta[0], 4*theta[1])
            gradients.append(gradient)
            item = adam_update(gradient, m, v, t)
            weighted_m = tuple(D("0.1")*sum(D("0.9")**(t-i)*g[j] for i, g in enumerate(gradients, 1)) for j in (0, 1))
            weighted_v = tuple(D("0.001")*sum(D("0.999")**(t-i)*g[j]*g[j] for i, g in enumerate(gradients, 1)) for j in (0, 1))
            assert all(abs(actual-expected) < D("1e-70") for actual, expected in zip(item["m"], weighted_m))
            assert all(abs(actual-expected) < D("1e-70") for actual, expected in zip(item["v"], weighted_v))
            theta = tuple(theta[j]+item["update"][j] for j in (0, 1))
            m, v = item["m"], item["v"]
            path.append(theta)
        for kwargs in ({"t": 0}, {"beta1": 1}, {"beta2": -1}, {"epsilon": 0}, {"eta": 0}):
            try:
                adam_update((2, 4), **kwargs)
            except ValueError:
                pass
            else:
                raise AssertionError("Invalid Adam configuration accepted")
        print("First-step high-precision moments and update:", first)
        print("First next theta, 80-digit approximations:", path[0])
        print("Zero current gradient can retain a nonzero update from moment history.")
        print("A finite Adam run does not certify convergence or global optimality.")


if __name__ == "__main__":
    main()
