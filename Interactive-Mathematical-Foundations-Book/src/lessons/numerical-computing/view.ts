/** Presentation only: every numeric cell comes from a numerical model. */
import { traceFrom } from '../../platform/trace';
import { formatApprox } from '../../platform/numeric/format';
import { exactDesc, undefinedDesc, row, type CalcTable, type CalcFrame } from '../calculus/calculus-view';
import type { InspectorRowData } from '../../ui/Inspector';
import type { Rational } from '../../math/quantity/rational';
import { fractionText } from '../../math/numerical-computing/floating';
import type { ParamSpec } from '../../platform/params';
export const numberText=(n:number):string=>Object.is(n,-0)?'−0':formatApprox(n,{digits:17,scientificAbove:1e8,trimZeros:true}).text;
export const numberTex=(n:number):string=>Object.is(n,-0)?'-0':formatApprox(n,{digits:17,scientificAbove:1e8,trimZeros:true}).tex;
export type Cell=number|string|Rational|null;
export const cellText=(v:Cell):string=>v===null?'undefined':typeof v==='number'?`≈ ${numberText(v)}`:typeof v==='string'?v:fractionText(v);
export const numericRow=(id:string,symbol:string,name:string,n:number|null):InspectorRowData=>row(id,symbol,name,n===null?undefinedDesc('No finite reference for this mathematical state.'):{status:'approximate',lines:[{relation:'≈',text:numberText(n),tex:numberTex(n)}],spoken:`approximately ${numberText(n)}`});
export const exactRow=(id:string,symbol:string,name:string,v:Rational|string|null):InspectorRowData=>row(id,symbol,name,v===null?undefinedDesc('No exact real quantity for this state.'):exactDesc(typeof v==='string'?v:fractionText(v)));
export const table=(caption:string,head:readonly string[],rows:readonly (readonly Cell[])[]):CalcTable=>({caption,head,rows:rows.map(r=>r.map(cellText))});
export const frames=(steps:readonly {title:string;detail:string;values:Record<string,Cell>;formula?:string}[])=>traceFrom(steps.map(s=>({state:{semantic:s.values,title:s.title,detail:s.detail,formula:s.formula??'\\text{Inspect the recorded values}',table:table('Actual intermediate values; = exact rationals, ≈ binary64 displays.',['quantity','value'],Object.entries(s.values))} satisfies CalcFrame})));
export interface NumericalView { rows:readonly InspectorRowData[];formulas:readonly string[];tables:readonly CalcTable[];frames:ReturnType<typeof frames>;description:string;metrics:Record<string,unknown>;bits?:{name:string;digits:string;group:'sign'|'exponent'|'significand';offset:number}[];grid?:{cols:number;cells:{row:number;col:number;value:string;nonzero:boolean}[]} }
export interface LessonConfig<S extends object> {title:string;initial:S;derive:(state:S)=>NumericalView;presets:readonly {id:string;label:string;state:S}[];texts:readonly {key:keyof S;label:string;hint:string}[];numbers?:readonly {key:keyof S;spec:ParamSpec}[];choices?:readonly {key:keyof S;label:string;options:readonly {id:string;label:string}[]}[];flip?:(s:S,index:number,view:NumericalView)=>S;toggle?:(s:S,row:number,col:number)=>S }
