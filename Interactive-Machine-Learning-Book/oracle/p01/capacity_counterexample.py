"""Literal seed-zero underfit/overfit counterexample; checked against Fraction goldens."""
from generate_fixtures import c,verify_capacity,close
state={**c.CAPACITY_CANONICAL,'seed':0}
quadratic=verify_capacity({**state,'degree':2})
interpolant=verify_capacity({**state,'degree':8})
close(quadratic['errors'][1]['mse'],.0678125)
close(interpolant['errors'][1]['mse'],.3030743151903145)
assert interpolant['errors'][0]['mse'] < quadratic['errors'][0]['mse']
assert interpolant['errors'][1]['mse'] > quadratic['errors'][1]['mse']
print('capacity counterexample: 4 assertions passed')
