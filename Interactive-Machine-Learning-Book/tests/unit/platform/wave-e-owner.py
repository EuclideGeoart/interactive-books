"""Owner-only independent exact-rational/Decimal challenges of canonical P09."""
from copy import deepcopy
from decimal import Decimal, localcontext
from fractions import Fraction as Q
import importlib.util
from pathlib import Path
import sys
import unittest

spec = importlib.util.spec_from_file_location('p09_canonical', Path('code/python/p09/forward.py'))
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)

AFFINE = dict(kind='network', x=[2, -1], W1=[[2, -1], [0, 3]], b1=[1, -2],
              W2=[[4, -2], [-1, 5]], b2=[3, 7], activation='identity')
NEURON = dict(kind='neuron', x=[2, -3], w=[-4, .5], b=1, activation='identity')


def rational_row(x, w, b):
    return sum((Q(a) * Q(v) for a, v in zip(w, x)), Q(b))


def decimal_sigmoid(z):
    with localcontext() as context:
        context.prec = 90
        # Independent unsplit definition; Decimal exp(+1000) is representable.
        return float(Decimal(1) / (Decimal(1) + (-Decimal(str(z))).exp()))


class OwnerChallenges(unittest.TestCase):
    def test_neuron_rational_contributions(self):
        r = C.forward(NEURON)
        self.assertEqual(r['row']['products'], [-8, -1.5])
        self.assertEqual(r['row']['running'], [-8, -9.5])
        self.assertEqual(r['a'], rational_row(NEURON['x'], NEURON['w'], NEURON['b']))

    def test_rectangular_network_shapes_and_values(self):
        r = C.forward(dict(kind='network', x=[2, -1], W1=[[1, 0], [0, 1], [2, -1]],
                           b1=[0, 0, 1], W2=[[1, 2, -1], [-1, 0, 3]], b2=[1, -2], activation='identity'))
        self.assertEqual(r['shapes'], dict(x=[2, 1], W1=[3, 2], b1=[3, 1], z1=[3, 1], a1=[3, 1], W2=[2, 3], b2=[2, 1], z2=[2, 1]))
        self.assertEqual(r['a1'], [2, -1, 6])
        self.assertEqual([row['z'] for row in r['output']], [-5, 14])

    def test_affine_identity_exact_composition(self):
        r = C.forward(AFFINE)
        self.assertEqual(r['a1'], [6, -5])
        self.assertEqual([row['z'] for row in r['output']], [37, -24])
        self.assertEqual(r['collapse']['W'], [[8, -10], [-2, 16]])
        self.assertEqual(r['collapse']['b'], [11, -4])
        self.assertEqual(r['collapse']['difference'], [0, 0])
        for x in ([0, 0], [3, -4], [.5, -.25]):
            actual = C.forward({**AFFINE, 'x': x})
            hidden = [rational_row(x, w, b) for w, b in zip(AFFINE['W1'], AFFINE['b1'])]
            exact = [rational_row(hidden, w, b) for w, b in zip(AFFINE['W2'], AFFINE['b2'])]
            self.assertEqual([row['z'] for row in actual['output']], exact)

    def test_nonlinearity_changes_the_actual_map(self):
        r = C.forward({**AFFINE, 'activation': 'relu'})
        self.assertEqual(r['a1'], [6, 0])
        self.assertEqual([row['z'] for row in r['output']], [27, 1])
        self.assertEqual(r['collapse']['difference'], [-10, 25])

    def test_xor_absolute_difference_and_affine_contradiction(self):
        values = []
        for x in ([0, 0], [0, 1], [1, 0], [1, 1]):
            r = C.forward(dict(kind='network', x=x, W1=[[1, -1], [-1, 1]], b1=[0, 0], W2=[[1, 1]], b2=[0], activation='relu'))
            self.assertEqual(r['output'][0]['z'], abs(Q(x[0]) - Q(x[1])))
            values.append(r['output'][0]['z'])
        self.assertEqual(values, [0, 1, 1, 0])
        self.assertNotEqual(Q(0) + Q(1) + Q(1), values[-1])

    def test_decimal_sigmoid_and_relu_boundary(self):
        for z in [-1000, -700, -8.5, -1, 0, .25, 6, 1000]:
            expected = decimal_sigmoid(z)
            actual = C.activate(z, 'sigmoid')
            allowance = 32 * 2**-52 * (abs(expected) + (1 if abs(expected) >= 1e-8 else 0))
            self.assertLessEqual(abs(actual - expected), allowance)
        self.assertEqual([C.activate(z, 'sigmoid') for z in [-1000, 0, 1000]], [0, .5, 1])
        self.assertGreater(C.activate(-700, 'sigmoid'), 0)
        self.assertEqual([C.activate(z, 'relu') for z in [-1, 0, 1]], [0, 0, 1])

    def test_zero_inputs_preserve_biases(self):
        r = C.forward({**AFFINE, 'x': [0, 0]})
        self.assertEqual(r['a1'], [1, -2])
        self.assertEqual([row['z'] for row in r['output']], [11, -4])

    def test_shapes_and_types_reject(self):
        for changes in [dict(x=[]), dict(W1=[[1], [1, 2]]), dict(b1=[0]), dict(W2=[[1]]),
                        dict(b2=[0]), dict(x=[[1], [2]]), dict(b1=[True, 0]), dict(activation='unknown'), dict(b2=[float('inf'), 0])]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                C.forward({**AFFINE, **changes})
        with self.assertRaises(ValueError):
            C.forward({**NEURON, 'w': [1]})

    def test_unrepresentable_forward_and_valid_subnormal(self):
        for changes in [dict(x=[1e308, 0], w=[2, 0]), dict(x=[1e308, 1e308], w=[1, 1]),
                        dict(x=[1e308, 0], w=[1, 0], b=1e308), dict(x=[5e-324, 0], w=[.5, 0])]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                C.forward({**NEURON, **changes})
        self.assertEqual(C.forward({**NEURON, 'x': [1e-320, 0], 'w': [2, 0], 'b': 0})['a'], 2e-320)

    def test_collapse_failure_does_not_erase_actual_result(self):
        r = C.forward(dict(kind='network', x=[0], W1=[[1e308]], b1=[0], W2=[[2]], b2=[0], activation='identity'))
        self.assertEqual(r['output'][0]['z'], 0)
        self.assertEqual(r['collapse']['status'], 'unrepresentable')

    def test_real_identity_has_distinct_binary64_evaluation_orders(self):
        r = C.forward(dict(kind='network', x=[1], W1=[[1]], b1=[1e16], W2=[[1]], b2=[-1e16], activation='identity'))
        self.assertEqual(r['output'][0]['z'], 0)
        self.assertEqual(r['collapse']['rows'][0]['z'], 1)
        self.assertEqual(r['collapse']['difference'], [-1])
        self.assertEqual(Q(1) + Q(10**16) - Q(10**16), 1)

    def test_valid_active_zero_and_unrepresentable_binary_counterfactuals(self):
        request = dict(kind='network', x=[0, 0], W1=[[1e-300, 0], [-1, 1]], b1=[0, 0], W2=[[1e-300, 0]], b2=[0], activation='relu')
        self.assertEqual(C.forward(request)['output'][0]['z'], 0)
        self.assertEqual(C.forward({**request, 'x': [0, 1]})['output'][0]['z'], 0)
        for x in ([1, 0], [1, 1]):
            with self.subTest(x=x), self.assertRaisesRegex(ValueError, 'underflow'):
                C.forward({**request, 'x': x})

    def test_canonical_does_not_mutate_inputs_or_retain_array_aliases(self):
        request = deepcopy(AFFINE)
        before = deepcopy(request)
        result = C.forward(request)
        self.assertEqual(request, before)
        request['W1'][0][0] = 99
        self.assertEqual(result['hidden'][0]['products'], [4, 1])


if __name__ == '__main__':
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(OwnerChallenges))
    sys.exit(not result.wasSuccessful())
