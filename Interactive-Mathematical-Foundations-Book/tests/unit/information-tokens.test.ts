import {it,expect} from 'vitest';
import {sequenceLoss} from '../../src/math/information-theory/tokens';
it('token NLL derives directly from stable logsoftmax and equals one-hot CE',()=>{
  const d=sequenceLoss([{logits:[0,0,0,0],target:2,ignored:false},{logits:[1000,0,-1000,-1000],target:3,ignored:false}]);
  expect(d.rows[0]!.nll).toBe(Math.log(4));expect(d.rows[0]!.oneHotTerms).toEqual([0,0,Math.log(4),0]);expect(d.rows[1]!.nll).toBe(2000);expect(d.rows[1]!.pipeline.probabilities[3]).toBe(0);
  expect(d.mean).toBe((Math.log(4)+2000)/2);for(const row of d.rows)expect(row.nll).toBe(row.oneHotCross);
});
it('mask reduction counts only contributing positions and never multiplies 0 by infinity',()=>{
  const positions=[{logits:[0,0,0,0],target:0,ignored:false},{logits:[0,-Infinity,0,0],target:1,ignored:true}];
  const d=sequenceLoss(positions);expect(d.count).toBe(1);expect(d.mean).toBe(Math.log(4));expect(d.rows[1]!.nll).toBe(Infinity);
  expect(sequenceLoss(positions.map(p=>({...p,ignored:true}))).mean).toBeNull();
  expect(sequenceLoss(positions.map(p=>({...p,ignored:false}))).mean).toBe(Infinity);
});
it('malformed target masks vector shapes and invalid positions are rejected even if masked',()=>{
  for(const positions of [[{logits:[1e308,0,0,0],target:0,ignored:false}],[],[{logits:[0,0],target:0,ignored:false}],[{logits:[0,0,0,0],target:4,ignored:true}],[{logits:[NaN,0,0,0],target:0,ignored:true}],[{logits:[0,0,0,0],target:0,ignored:0}],[{logits:[-Infinity,-Infinity,-Infinity,-Infinity],target:0,ignored:true}]])expect(()=>sequenceLoss(positions as never)).toThrow();
});
