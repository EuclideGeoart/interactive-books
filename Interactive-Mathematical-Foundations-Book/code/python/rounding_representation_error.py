"""Representation error and addition error as independent exact fractions."""
from fractions import Fraction
from floating_point_representation import convert, exact
if __name__ == '__main__':
    a, b = Fraction('0.1'), Fraction('0.2')
    stored_a = exact(convert('0.1', 'binary64'), 'binary64')
    stored_b = exact(convert('0.2', 'binary64'), 'binary64')
    answer = Fraction.from_float(0.1 + 0.2)
    representation = stored_a + stored_b - (a+b)
    evaluation = answer - (stored_a+stored_b)
    assert representation + evaluation == answer - Fraction(3, 10)
    assert answer == Fraction(1351079888211149, 4503599627370496)
    print('intended', a+b, 'stored', answer, 'representation', representation, 'evaluation', evaluation)
