from fractions import Fraction
if __name__ == '__main__':
    x, delta = Fraction('1.000001'), Fraction('0.000001')
    reference = 1/(x-1); changed = 1/(x+delta-1)
    stored = Fraction.from_float(float(x)); at_stored = 1/(stored-1)
    computed = Fraction.from_float(1/(float(x)-1))
    input_effect = at_stored-reference; roundoff = computed-at_stored
    assert reference == 1000000 and changed == 500000
    assert abs(x/(x-1)) == 1000001
    assert input_effect+roundoff == computed-reference
    print('problem condition', abs(x/(x-1)), 'input effect', input_effect, 'roundoff', roundoff)
