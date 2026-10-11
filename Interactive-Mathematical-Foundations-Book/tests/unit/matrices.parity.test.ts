import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  affine2, determinant2, exactVector, matrix, multiplyMatrices, multiplyVector,
  orthogonal2, solveSystem2, transpose, type ExactVector, type Matrix,
} from '../../src/math/linear-algebra/matrices';
import type { Rational } from '../../src/math/quantity/rational';

const fixture = JSON.parse(readFileSync('fixtures/matrices.fixtures.json', 'utf8'));
const str = (r: Rational) => r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`;
const vectorStrings = (v: ExactVector) => v.map(str);
const matrixStrings = (a: Matrix) => a.values.map(vectorStrings);

describe('independent Fraction/shoelace/elimination matrix oracle', () => {
  for (const [i, item] of fixture.cases.entries()) it(`matrix case ${i}`, () => {
    const { input, expected } = item;
    const a = matrix(input.a), b = matrix(input.b), x = exactVector(input.x), translation = exactVector(input.translation);
    const ax = multiplyVector(a, x);
    expect(ax.ok ? vectorStrings(ax.value) : null).toEqual(expected.ax);
    const ba = multiplyMatrices(b, a);
    expect(ba.ok ? matrixStrings(ba.value) : null).toEqual(expected.ba);
    expect(matrixStrings(transpose(a))).toEqual(expected.transpose);
    const affine = affine2(a, x, translation);
    expect(affine.ok ? vectorStrings(affine.value) : null).toEqual(expected.affine);
    if ('det' in expected) {
      expect(str(determinant2(a))).toBe(expected.det);
      expect(orthogonal2(a)).toBe(expected.orthogonal);
    }
  });

  for (const [i, item] of fixture.systems.entries()) it(`system case ${i}`, () => {
    const result = solveSystem2(matrix(item.input.a), exactVector(item.input.rhs));
    expect(result.kind).toBe(item.expected.kind);
    expect(result.kind === 'unique' ? vectorStrings(result.solution) : null).toEqual(item.expected.solution);
  });
});
