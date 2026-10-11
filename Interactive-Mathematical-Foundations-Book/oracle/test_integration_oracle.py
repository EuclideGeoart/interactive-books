from fractions import Fraction as F
from pathlib import Path
import math
import runpy
import unittest

from integration_oracle import accumulation_case, integral, power_sum, riemann_exact, signed_parts

CODE = Path(__file__).resolve().parents[1] / 'code/python'


class IntegrationOracleTests(unittest.TestCase):
    def test_power_sums(self):
        for n in (1, 5, 10):
            for p in range(5):
                self.assertEqual(power_sum(p, n), sum(F(i) ** p for i in range(n)))

    def test_hand_worked_integrals_and_sums(self):
        self.assertEqual(integral('cubic', F(-2), F(3)), F(25, 16))
        self.assertEqual(signed_parts('cubic', F(-2), F(3)), (F(41, 16), F(-1)))
        self.assertEqual(integral('signed', F(-1), F(2)), F(9, 4))
        self.assertEqual(integral('kink', F(0), F(1)), F(5, 18))
        self.assertEqual(integral('linear', F(0), F(2)), 0)
        self.assertEqual([riemann_exact('cubic', F(-2), F(3), 10, r) for r in ('left', 'right', 'midpoint', 'trapezoid')], [F(45, 64), F(165, 64), F(195, 128), F(105, 64)])
        self.assertEqual(riemann_exact('square', F(0), F(1), 4, 'trapezoid'), F(11, 32))
        self.assertEqual(riemann_exact('square', F(0), F(2), 2, 'left'), 1)

    def test_accumulation_literals(self):
        c = accumulation_case('cubic', '-2', '1')
        self.assertEqual((c['F'], c['left'], c['right'], c['f']), ('9/16', '-3/4', '-3/4', '-3/4'))
        j = accumulation_case('step', '-1', '1')
        self.assertEqual((j['F'], j['left'], j['right']), ('2', '1', '-1'))

    def test_references(self):
        for name in ['calculus_riemann.py', 'calculus_riemann_numpy.py', 'calculus_accumulation.py', 'calculus_accumulation_numpy.py',
                     'calculus_quadrature.py', 'calculus_quadrature_numpy.py']:
            runpy.run_path(str(CODE / name))


if __name__ == '__main__':
    unittest.main()
