from fractions import Fraction as F
from pathlib import Path
import runpy
import unittest

from limits_oracle import CATALOG, analyse, build, join, rational_limit

CODE = Path(__file__).resolve().parents[1] / 'code/python'


class LimitOracleTests(unittest.TestCase):
    def test_hand_worked_limits(self):
        self.assertEqual(rational_limit([F(-1), F(0), F(1)], [F(-1), F(1)], F(1), 'left'), {'kind': 'finite', 'exact': '2'})
        self.assertEqual(rational_limit([F(1)], [F(0), F(1)], F(0), 'left'), {'kind': 'infinite', 'sign': -1})
        self.assertEqual(rational_limit([F(1)], [F(0), F(0), F(1)], F(0), 'left'), {'kind': 'infinite', 'sign': 1})
        hole = analyse(*CATALOG['hole'], F(1))
        self.assertEqual((hole['value'], hole['kind']), (None, 'removable'))
        self.assertEqual(analyse(*CATALOG['moved'], F(1))['value'], '3')
        self.assertEqual(analyse(*CATALOG['jump'], F(0))['kind'], 'jump')

    def test_join_conditions(self):
        self.assertEqual(analyse(*join(F(1), F(2), 'right', F(0)), F(1))['kind'], 'continuous')
        self.assertEqual(analyse(*join(F(0), F(2), 'right', F(0)), F(1))['kind'], 'jump')
        self.assertEqual(analyse(*join(F(1), F(2), 'custom', F(0)), F(1))['kind'], 'removable')
        self.assertIsNone(analyse(*join(F(1), F(2), 'none', F(0)), F(1))['value'])

    def test_every_case_is_classified(self):
        kinds = {c['kind'] for c in build()['cases']}
        self.assertEqual(kinds, {'continuous', 'removable', 'jump', 'infinite', 'oscillation'})

    def test_references(self):
        for name in ['calculus_limits.py', 'calculus_limits_numpy.py', 'calculus_continuity.py', 'calculus_continuity_numpy.py']:
            runpy.run_path(str(CODE / name))


if __name__ == '__main__':
    unittest.main()
