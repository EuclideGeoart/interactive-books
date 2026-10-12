import type { InspectorRowData } from '../../ui/Inspector';
import type { ValueDescription } from '../../platform/numeric/quantity';
import { numericRow, approx } from '../probability/view';
export { parameter, exactRow, exactText, tex, steps, massItem } from '../probability/view';
export type { ProbabilityView } from '../probability/view';
export const numberText = (x:number|null):string => x === null ? 'undefined' : x === Infinity ? '+∞' : x === -Infinity ? '−∞' : Number.isNaN(x) ? 'undefined (NaN)' : `≈ ${approx(x)}`;
/** Extended values must never be sent to the finite numeric formatter. */
export function valueRow(id:string,symbolTex:string,name:string,value:number|null,reason='No mathematical value is defined.') : InspectorRowData {
  if (value === null || Number.isNaN(value)) return numericRow(id,symbolTex,name,null,reason);
  if (Number.isFinite(value)) return numericRow(id,symbolTex,name,value);
  const description:ValueDescription = {status:'exact',lines:[{relation:'=',text:value>0?'+∞':'−∞',tex:value>0?'\\infty':'-\\infty'}],spoken:`${name}: ${value>0?'positive':'negative'} infinity. ${reason}`,note:reason};
  return {id,symbolTex,name,role:'caution',description};
}
export interface TableView { readonly caption:string; readonly columns:readonly string[]; readonly rows:readonly (readonly string[])[] }
export interface BarView { readonly label:string; readonly text:string; readonly value:number; readonly width:number }
export function contributionBars(values:readonly number[],labels:readonly string[]):readonly BarView[] {
  const scale = Math.max(1,...values.filter(Number.isFinite).map(Math.abs));
  return values.map((value,i)=>({label:labels[i]!,text:numberText(value),value,width:Number.isFinite(value)?Math.abs(value)/scale*100:0}));
}
