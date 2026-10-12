/** Bounded array indexing/broadcasting, not an unrestricted tensor backend. */
import {add,int,mul,ZERO,type Rational} from '../quantity/rational';
import {integer} from '../probability/seeded';
import type {ArithmeticStep} from './algorithms';
export const size=(shape:readonly number[])=>shape.reduce((a,b)=>a*b,1);
export function parseShape(text:string):number[]{
 if(text.length>60)throw new RangeError('Shape text is limited to 60 characters.');const raw=text.replace(/\s/g,'');
 if(!/^\((?:\d+(?:,\d+)*,?)?\)$/.test(raw))throw new RangeError('Use () for scalar, (3,) for a vector, or (2,3) for a matrix.');
 const shape=raw.slice(1,-1).split(',').filter(Boolean).map(Number);if(shape.length>4)throw new RangeError('Use at most four axes.');shape.forEach(d=>integer(d,0,4,'Axis size'));if(size(shape)>64)throw new RangeError('Each input is limited to 64 elements.');return shape;
}
export const shapeText=(shape:readonly number[])=>`(${shape.join(',')}${shape.length===1?',':''})`;
export function indexTuples(shape:readonly number[]):number[][]{
 if(shape.length>4||size(shape)>64)throw new RangeError('Index arrays are bounded to four axes and 64 elements.');shape.forEach(d=>integer(d,0,4,'Axis size'));
 const count=size(shape);return Array.from({length:count},(_,flat)=>{let rest=flat;const index=Array(shape.length).fill(0);for(let axis=shape.length-1;axis>=0;axis--){index[axis]=rest%shape[axis]!;rest=Math.floor(rest/shape[axis]!);}return index;});
}
export const flatIndex=(index:readonly number[],shape:readonly number[])=>index.reduce((v,coordinate,i)=>v*shape[i]!+coordinate,0);
export interface TensorInput{left:string;right:string;axis:string;operation:'add'|'multiply';aStart:number;bStart:number}
export function broadcasting(s:TensorInput){
 if(s.axis.length>16)throw new RangeError('Axis text is limited to 16 characters.');
 const aShape=parseShape(s.left),bShape=parseShape(s.right);integer(s.aStart,-10,10,'Left start');integer(s.bStart,-10,10,'Right start');if(!['add','multiply'].includes(s.operation))throw new RangeError('Choose addition or multiplication.');
 const rank=Math.max(aShape.length,bShape.length),outShape:number[]=[],checks:{axis:number;a:number;b:number;compatible:boolean}[]=[];
 for(let axis=0;axis<rank;axis++){const a=aShape[axis-(rank-aShape.length)]??1,b=bShape[axis-(rank-bShape.length)]??1,compatible=a===b||a===1||b===1;checks.push({axis,a,b,compatible});outShape.push(a===1?b:a);}
 const incompatible=checks.find(c=>!c.compatible),unsupported=!incompatible&&size(outShape)>64,kind=incompatible?'incompatible':unsupported?'bounded-out':'valid';
 const reason=incompatible?`Trailing-aligned axis ${incompatible.axis}: ${incompatible.a} and ${incompatible.b} are unequal and neither is one.`:unsupported?'The shapes are mathematically compatible, but this output exceeds the 64-element demonstration limit.':'Trailing dimensions agree or one broadcasts.';
 const aValues=indexTuples(aShape).map((_,i)=>int(s.aStart+i)),bValues=indexTuples(bShape).map((_,i)=>int(s.bStart+i));
 const mappings=kind!=='valid'?[]:indexTuples(outShape).map(index=>{const aIndex=aShape.map((d,i)=>d===1?0:index[i+rank-aShape.length]!),bIndex=bShape.map((d,i)=>d===1?0:index[i+rank-bShape.length]!),a=aValues[flatIndex(aIndex,aShape)]!,b=bValues[flatIndex(bIndex,bShape)]!,value=s.operation==='add'?add(a,b):mul(a,b);return {index,aIndex,bIndex,a,b,value};});
 let reduction:{kind:'valid';shape:number[];values:Rational[];groups:{index:number[];contributors:number[][];value:Rational}[]}|{kind:'invalid';reason:string}|null=null;
 if(kind==='valid'){
  const all=s.axis.trim()==='all',raw=Number(s.axis),axis=raw<0?outShape.length+raw:raw;
  if(!all&&(!/^[-+]?\d{1,2}$/.test(s.axis.trim())||!Number.isInteger(axis)||axis<0||axis>=outShape.length))reduction={kind:'invalid',reason:'An explicit axis must lie within output rank (negative axes count from the end); scalar arrays have no explicit axes here.'};
  else{const shape=all?[]:outShape.filter((_,i)=>i!==axis),groups=indexTuples(shape).map(index=>({index,contributors:[] as number[][],value:ZERO as Rational}));for(const cell of mappings){const index=all?[]:cell.index.filter((_,i)=>i!==axis),group=groups[flatIndex(index,shape)]!;group.contributors.push(cell.index);group.value=add(group.value,cell.value);}reduction={kind:'valid',shape,groups,values:groups.map(g=>g.value)};}
 }
 const steps:ArithmeticStep[]=[{title:'Align trailing axes',detail:'Missing leading axes behave as size one. Equal sizes or a size-one axis are compatible; zero with one produces zero length.',values:{leftShape:shapeText(aShape),rightShape:shapeText(bShape),classification:kind,reason}},{title:'Determine the output shape',detail:'Shape compatibility is checked before allocation. No output values are fabricated for incompatible or oversized results.',values:{outputShape:incompatible?'undefined':shapeText(outShape),elements:kind==='valid'?String(size(outShape)):'not allocated'}}];
 mappings.forEach(m=>steps.push({title:`Output index ${shapeText(m.index)}`,detail:'Each output index maps to the actual source indices; a size-one input axis always selects zero.',values:{outputIndex:shapeText(m.index),leftIndex:shapeText(m.aIndex),rightIndex:shapeText(m.bIndex),left:m.a,right:m.b,operation:s.operation,result:m.value}}));
 if(reduction)steps.push({title:'Reduce the chosen axis',detail:reduction.kind==='valid'?'Sum the actual output values along the selected axis. The reduced axis is removed; an empty sum is zero.':reduction.reason,values:{axis:s.axis,shape:reduction.kind==='valid'?shapeText(reduction.shape):'undefined',result:reduction.kind==='valid'?reduction.values.map(v=>String(v.num)).join(', ')||'empty':'undefined'}});
 return {s,aShape,bShape,aValues,bValues,checks,outShape:incompatible?null:outShape,kind,reason,mappings,reduction,operations:mappings.length,steps};
}
