/** Exact bounded sparse structure; packed byte counts are an explicit Float64/int32 cost model. */
import {abs,add,cmp,int,mul,decimalText,ZERO,type Rational} from '../quantity/rational';
import {multiplyVector,type Matrix} from '../linear-algebra/matrices';
import {integer} from '../probability/seeded';
import {decimalList,type ArithmeticStep} from './algorithms';
import {finiteDecimal} from './floating';
export interface SparseInput{rows:number;cols:number;entries:string;vector:string;threshold:string}
export interface Entry{row:number;col:number;value:Rational}
export function sparseMatrix(s:SparseInput){
 integer(s.rows,1,3,'Row count');integer(s.cols,1,3,'Column count');if(s.entries.length>1200)throw new RangeError('Use at most 1200 characters for COO input.');
 const threshold=finiteDecimal(s.threshold);if(threshold.num<0n||cmp(threshold,int(1))>0)throw new RangeError('Near-zero diagnostic threshold must lie in [0,1].');
 const parts=s.entries.trim()===''?[]:s.entries.split(';');if(parts.length>18)throw new RangeError('Use at most 18 COO triples.');
 const raw:Entry[]=parts.map(text=>{const fields=text.trim().split(',');if(fields.length!==3||!/^\d+$/.test(fields[0]!.trim())||!/^\d+$/.test(fields[1]!.trim()))throw new RangeError('Each COO entry is row,column,value; coordinates are zero-based whole numbers.');const row=integer(Number(fields[0]),0,s.rows-1,'Row index'),col=integer(Number(fields[1]),0,s.cols-1,'Column index'),value=decimalList(fields[2]!,1,'20')[0]!;return {row,col,value};});
 const dense=Array.from({length:s.rows},()=>Array.from({length:s.cols},()=>ZERO)),seen=new Set<string>();let duplicates=0;
 for(const entry of raw){const key=`${entry.row},${entry.col}`;if(seen.has(key))duplicates++;seen.add(key);dense[entry.row]![entry.col]=add(dense[entry.row]![entry.col]!,entry.value);}
 const canonical:Entry[]=[];for(let row=0;row<s.rows;row++)for(let col=0;col<s.cols;col++){const value=dense[row]![col]!;if(value.num!==0n)canonical.push({row,col,value});}
 const data=canonical.map(e=>e.value),indices=canonical.map(e=>e.col),indptr=[0];for(let row=0;row<s.rows;row++)indptr.push(indptr[row]!+canonical.filter(e=>e.row===row).length);
 const vector=decimalList(s.vector,3,'20');if(vector.length!==s.cols)throw new RangeError('Vector length must equal the matrix column count.');
 const matrix:Matrix={rows:s.rows,cols:s.cols,values:dense},product=multiplyVector(matrix,vector);if(!product.ok)throw new Error(product.reason);
 const result:Rational[]=[],terms:{row:number;col:number;value:Rational;input:Rational;product:Rational;before:Rational;after:Rational}[]=[];
 for(let row=0;row<s.rows;row++){let sum=ZERO;for(let k=indptr[row]!;k<indptr[row+1]!;k++){const value=data[k]!,col=indices[k]!,term=mul(value,vector[col]!),next=add(sum,term);terms.push({row,col,value,input:vector[col]!,product:term,before:sum,after:next});sum=next;}result.push(sum);}

 const nnz=canonical.length,small=canonical.filter(e=>cmp(abs(e.value),threshold)<=0),steps:ArithmeticStep[]=[{title:'Read raw COO entries',detail:'Zero-based coordinates are validated against shape. Explicit zeros and duplicate coordinates are retained in the input record.',values:{shape:`${s.rows}×${s.cols}`,rawEntries:String(raw.length),duplicates:String(duplicates),explicitZeros:String(raw.filter(e=>e.value.num===0n).length)}},{title:'Combine duplicates exactly',detail:'Sum duplicate coordinates. Remove only exact aggregated zeros; a small nonzero value remains structurally present.',values:{nonzeros:String(nnz),nearZeroButRetained:String(small.length)}}];
 terms.forEach((t,i)=>steps.push({title:`Sparse multiplication ${i}`,detail:'Read the CSR column index, multiply only this nonzero, then accumulate in its row.',values:{row:String(t.row),column:String(t.col),coefficient:t.value,input:t.input,product:t.product,before:t.before,after:t.after}}));
 for(let row=0;row<s.rows;row++)steps.push({title:`CSR row ${row}`,detail:'indptr[row] through indptr[row+1] delimit this row; equal pointers describe an empty row.',values:{start:String(indptr[row]),end:String(indptr[row+1]),columns:canonical.filter(e=>e.row===row).map(e=>e.col).join(', ')||'empty',result:result[row]!}});
 steps.push({title:'Count packed storage and multiply work',detail:'These are ideal Float64/int32 array bytes, not JavaScript or exact-rational object memory; no wall-clock speedup is inferred.',values:{denseBytes:String(8*s.rows*s.cols),cooBytes:String(16*nnz),csrBytes:String(12*nnz+4*(s.rows+1)),denseMultiplications:String(s.rows*s.cols),sparseMultiplications:String(nnz)}});
 return {s,raw,dense,canonical,data,indices,indptr,vector,result,denseResult:product.value,terms,nnz,duplicates,explicitZeros:raw.filter(e=>e.value.num===0n).length,nearZero:small.length,denseBytes:8*s.rows*s.cols,cooBytes:16*nnz,csrBytes:12*nnz+4*(s.rows+1),steps};
}
export function toggleSparse(s:SparseInput,row:number,col:number):SparseInput{
 integer(row,0,s.rows-1,'Row index');integer(col,0,s.cols-1,'Column index');const m=sparseMatrix(s),keep=m.raw.filter(e=>e.row!==row||e.col!==col);if(m.dense[row]![col]!.num===0n)keep.push({row,col,value:int(1)});
 if(keep.length>18)throw new RangeError('This toggle would exceed the 18-entry input limit.');
 return {...s,entries:keep.map(e=>`${e.row},${e.col},${decimalText(e.value)!}`).join(';')};
}

