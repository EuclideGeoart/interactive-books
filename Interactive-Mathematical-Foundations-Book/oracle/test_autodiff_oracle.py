from fractions import Fraction as F
from pathlib import Path
import math
import runpy
import unittest

from autodiff_oracle import build, case, tape_contributions

CODE = Path(__file__).resolve().parents[1] / 'code/python'


class AutodiffOracleTests(unittest.TestCase):
    def test_mandatory_reference(self):
        c = case('shared-input', ['2', '3'])
        self.assertEqual(c['outputs'], [{'exact': '10'}])
        self.assertEqual(c['jacobian'], [[{'exact': '7'}, {'exact': '2'}]])          # 2x + y, x
        contributions, ax, ay = tape_contributions(F(2), F(3))
        self.assertEqual(contributions, [['u', 'z', '2'], ['x', 'z', '5'], ['x', 'u', '2'], ['y', 'u', '2']])
        self.assertEqual((ax, ay), ('7', '2'))

    def test_literals_other_graphs(self):
        self.assertEqual(case('square', ['3'])['jacobian'], [[{'exact': '6'}]])
        self.assertEqual(case('scalar-loss', ['1', '2', '-1'])['jacobian'], [[{'exact': '4'}, {'exact': '2'}, {'exact': '2'}]])
        many = case('many-outputs', ['1.5'])['jacobian']
        self.assertEqual(many[0], [{'exact': '3'}]); self.assertEqual(many[1], [{'exact': '27/4'}])
        self.assertAlmostEqual(many[2][0]['value'], math.cos(1.5), places=15)
        self.assertIsNone(case('quotient', ['2', '2'])['jacobian'])
        s = case('sin-product', ['1', '2'])['jacobian'][0]
        self.assertAlmostEqual(s[0]['value'], 2 + math.cos(1), places=15)

    def test_every_rational_case_satisfies_its_closed_form(self):
        for c in build()['cases']:
            if c['graph'] == 'shared-input':
                x, y = (F(v) for v in c['inputs'])
                self.assertEqual(c['jacobian'][0], [{'exact': str(2 * x + y) if (2 * x + y).denominator > 1 else f'{(2 * x + y).numerator}'}, {'exact': str(x) if x.denominator > 1 else f'{x.numerator}'}])

    def test_references(self):
        for name in ['calculus_autodiff.py', 'calculus_autodiff_numpy.py']:
            runpy.run_path(str(CODE / name))


if __name__ == '__main__':
    unittest.main()
