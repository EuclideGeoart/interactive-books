/**
 * One operation on quantities with units, from flat decimal inputs: the model behind the units stage.
 * The numbers have at most `VALUE_DECIMALS` decimal places (the stage rejects finer input); each quantity carries an exponent vector.
 */
import { applyOp, type Dim, type Op, type Quantity, type QuantityOutcome } from './dimension';
import { fromDecimal } from './rational';

export const VALUE_DECIMALS = 2;

export interface OperationState {
  readonly op: Op;
  readonly aValue: number;
  readonly aDim: Dim;
  readonly bValue: number;
  readonly bDim: Dim;
}

export interface OperationDerived {
  readonly op: Op;
  readonly a: Quantity;
  /** Ignored (but still present) for the unary operations `square` and `root`. */
  readonly b: Quantity;
  readonly outcome: QuantityOutcome;
}

function quantity(value: number, dim: Dim): Quantity {
  const r = fromDecimal(value, VALUE_DECIMALS);
  if (!r) throw new RangeError(`${value} has more than ${VALUE_DECIMALS} decimal places`);
  return { value: r, dim };
}

export function deriveOperation(state: OperationState): OperationDerived {
  const a = quantity(state.aValue, state.aDim);
  const b = quantity(state.bValue, state.bDim);
  return { op: state.op, a, b, outcome: applyOp(state.op, a, b) };
}
