from fractions import Fraction as F
from pathlib import Path
import runpy
import unittest

import numpy as np

from multivariable_oracle import build, map_case, surface_case

CODE = Path(__file__).resolve().parents[1] / 'code/python'


class MultivariableOracleTests(unittest.TestCase):
    def test_hand_worked_partials_and_gradient(self):
        c = surface_case('saddle', '1', '0.5')
        self.assertEqual((c['fx'], c['fy'], c['f']), ('2', '-1', '3/4'))
        e = surface_case('elliptic', '1', '0.5')
        self.assertEqual((e['fx'], e['fy']), ('1', '2'))
        self.assertEqual(e['directional'][0], '11/5')            # (1,2).(3/5,4/5)
        self.assertEqual(e['directional'][1], '2/5')             # (1,2).(-4/5,3/5) = -4/5 + 6/5

    def test_hessian_classification_literals(self):
        self.assertEqual(surface_case('double-well', '1', '0')['class'], 'minimum')
        self.assertEqual(surface_case('double-well', '-1', '0')['class'], 'saddle')
        self.assertEqual(surface_case('cap', '0', '0')['class'], 'maximum')
        for name in ['monkey', 'quartic', 'cubic-y']:
            self.assertEqual(surface_case(name, '0', '0')['class'], 'inconclusive')
        self.assertEqual(surface_case('double-well', '0', '0.5')['class'], 'not-critical')
        w = surface_case('double-well', '-1', '0')
        self.assertEqual((w['fxx'], w['fxy'], w['fyy']), ('-6', '0', '2'))

    def test_jacobian_literals(self):
        c = map_case('square', '1', '0.5', '0.25', '0.25')
        self.assertEqual(c['J'], [['2', '-1'], ['1', '2']])
        self.assertEqual((c['predicted'], c['Fq'], c['errorSquared'], c['det']), (['1', '7/4'], ['1', '15/8'], '1/64', '5'))
        self.assertEqual(map_case('linear', '1', '0.5', '1', '1')['errorSquared'], '0')

    def test_symmetry_and_numpy_eigenvalues(self):
        for c in build()['surfaces']:
            self.assertEqual(c['fxy'], c['fyx'])
            H = np.array([[float(F(c['fxx'])), float(F(c['fxy']))], [float(F(c['fyx'])), float(F(c['fyy']))]])
            np.testing.assert_allclose(sorted(np.linalg.eigvalsh(H), reverse=True), c['eigenvalues'], atol=1e-12)

    def test_references(self):
        for name in ['calculus_partials.py', 'calculus_partials_numpy.py', 'calculus_gradient.py', 'calculus_gradient_numpy.py',
                     'calculus_jacobian.py', 'calculus_jacobian_numpy.py', 'calculus_hessian.py', 'calculus_hessian_numpy.py']:
            runpy.run_path(str(CODE / name))


if __name__ == '__main__':
    unittest.main()
