/** Direct exact-rational → IEEE binary interchange bits, nearest/ties-even. No intermediate float format. */
import { abs, add, cmp, div, int, mul, neg, parseDecimal, rational, sub, type Rational } from '../quantity/rational';
export type FormatId = 'binary64' | 'binary32' | 'fp16' | 'bf16';
export const FORMATS = {
  binary64: { name:'binary64', exponent:11, fraction:52, bias:1023, implementation:'Bit model; native JavaScript arithmetic uses binary64.' },
  binary32: { name:'binary32', exponent:8, fraction:23, bias:127, implementation:'Software-emulated direct rounding; not a hardware arithmetic benchmark.' },
  fp16: { name:'FP16 / binary16', exponent:5, fraction:10, bias:15, implementation:'Software-emulated FP16; not actual hardware operations.' },
  bf16: { name:'BF16 / bfloat16', exponent:8, fraction:7, bias:127, implementation:'Software-emulated BF16; not actual hardware operations.' },
} as const;
export type Input = { kind:'finite'; value:Rational; negativeZero:boolean } | { kind:'infinity'; negative:boolean } | { kind:'nan' };
export function parseExact(text:string): Input {
  const raw=text.trim().replace(/−/g,'-');
  if (raw.length>420) throw new RangeError('Use at most 420 characters.');
  if (/^[+-]?Infinity$/i.test(raw)) return {kind:'infinity',negative:raw[0]==='-'};
  if (/^NaN$/i.test(raw)) return {kind:'nan'};
  const m=/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:[eE]([+-]?\d{1,4}))?$/.exec(raw);
  if (!m) throw new RangeError('Enter an exact decimal (optional exponent), Infinity, -Infinity or NaN.');
  const e=Number(m[2]??0);
  if (Math.abs(e)>400) throw new RangeError('Decimal exponent must lie in [-400,400].');
  const mantissa=parseDecimal(m[1]!)!;
  const value=e>=0?mul(mantissa,int(10n**BigInt(e))):div(mantissa,int(10n**BigInt(-e)));
  return {kind:'finite',value,negativeZero:value.num===0n&&raw[0]==='-'};
}
export function finiteDecimal(text:string):Rational {
  const input=parseExact(text);
  if(input.kind!=='finite')throw new RangeError('This computation requires a finite exact decimal.');
  return input.value;
}
export const pow2=(e:number):Rational=>e>=0?int(1n<<BigInt(e)):rational(1n,1n<<BigInt(-e));
export const fractionText=(r:Rational)=>r.den===1n?String(r.num):`${r.num}/${r.den}`;
export function floorLog2(r:Rational):number {
  if(r.num<=0n)throw new RangeError('Positive rational required.');
  let e=r.num.toString(2).length-r.den.toString(2).length;
  if(cmp(r,pow2(e))<0)e--;
  return e;
}
const nearestInteger=(r:Rational):bigint=>{
  const q=r.num/r.den,rem=r.num%r.den;
  return q+(2n*rem>r.den||(2n*rem===r.den&&q%2n===1n)?1n:0n);
};
export function encode(input:Input,id:FormatId):bigint {
  const f=FORMATS[id];if(!f)throw new RangeError('Unknown format.');
  const signShift=BigInt(f.exponent+f.fraction),sign=input.kind==='finite'?(input.value.num<0n||input.negativeZero):input.kind==='infinity'&&input.negative;
  const s=sign?1n<<signShift:0n,all=(1n<<BigInt(f.exponent))-1n;
  if(input.kind==='nan')return (all<<BigInt(f.fraction))|(1n<<BigInt(f.fraction-1));
  if(input.kind==='infinity')return s|(all<<BigInt(f.fraction));
  const r=abs(input.value);if(r.num===0n)return s;
  const emin=1-f.bias,emax=f.bias,exponent=Math.max(emin,floorLog2(r));
  if(exponent>emax)return s|(all<<BigInt(f.fraction));
  let significand=nearestInteger(div(r,pow2(exponent-f.fraction))),e=exponent;
  if(significand===1n<<BigInt(f.fraction+1)){significand>>=1n;e++;}
  if(e>emax)return s|(all<<BigInt(f.fraction));
  const normal=significand>=1n<<BigInt(f.fraction);
  return s|(BigInt(normal?e+f.bias:0)<<BigInt(f.fraction))|(normal?significand-(1n<<BigInt(f.fraction)):significand);
}
export interface FloatValue { bits:bigint; bitString:string; sign:number; exponentField:number; fractionField:bigint; exponent:number|null; kind:'normal'|'subnormal'|'zero'|'infinity'|'nan'; exact:Rational|null; value:number; spacing:Rational|null }
export function decode(bits:bigint,id:FormatId):FloatValue {
  const f=FORMATS[id];if(!f||bits<0n||bits>=1n<<BigInt(1+f.exponent+f.fraction))throw new RangeError('Bits outside this format.');
  const sign=Number(bits>>BigInt(f.exponent+f.fraction)),e=Number((bits>>BigInt(f.fraction))&((1n<<BigInt(f.exponent))-1n)),fraction=bits&((1n<<BigInt(f.fraction))-1n),all=2**f.exponent-1;
  const kind=e===all?(fraction===0n?'infinity':'nan'):e===0?(fraction===0n?'zero':'subnormal'):'normal';
  const exponent=e===all?null:e===0?1-f.bias:e-f.bias;
  const spacing=exponent===null?null:pow2(exponent-f.fraction);
  const magnitude=spacing===null?null:mul(int(fraction+(e===0?0n:1n<<BigInt(f.fraction))),spacing);
  const exact=magnitude===null?null:sign?neg(magnitude):magnitude;
  // Every finite value of these formats is exactly representable in binary64, including its smallest subnormal.
  const value=exact===null?(kind==='nan'?NaN:sign?-Infinity:Infinity):Number(fraction+(e===0?0n:1n<<BigInt(f.fraction)))*2**(exponent!-f.fraction)*(sign?-1:1);
  return {bits,bitString:bits.toString(2).padStart(1+f.exponent+f.fraction,'0'),sign,exponentField:e,fractionField:fraction,exponent,kind,exact,value,spacing};
}
export function neighbor(bits:bigint,id:FormatId,direction:-1|1):FloatValue|null {
  const v=decode(bits,id),f=FORMATS[id],signBit=1n<<BigInt(f.exponent+f.fraction);
  if(v.kind==='nan'||(v.kind==='infinity'&&(v.sign===0?direction===1:direction===-1)))return null;
  if(v.kind==='zero')return decode(direction===1?1n:signBit|1n,id);
  return decode(bits+BigInt(v.sign?-direction:direction),id);
}
export function representation(text:string,id:FormatId,bits?:string) {
  const input=parseExact(text),f=FORMATS[id];
  if(bits!==undefined&&(!/^[01]+$/.test(bits)||bits.length!==1+f.exponent+f.fraction))throw new RangeError('Use the exact bit width of the selected format.');
  const stored=decode(bits===undefined?encode(input,id):BigInt('0b'+bits),id),previous=neighbor(stored.bits,id,-1),next=neighbor(stored.bits,id,1);
  const error=input.kind==='finite'&&stored.exact!==null?sub(stored.exact,input.value):null;
  return {input,stored,previous,next,error,absoluteError:error===null?null:abs(error),relativeError:error===null||input.kind!=='finite'||input.value.num===0n?null:div(abs(error),abs(input.value)),format:id,
    minimumNormal:pow2(1-f.bias),minimumSubnormal:pow2(1-f.bias-f.fraction),maximum:mul(int((1n<<BigInt(f.fraction+1))-1n),pow2(f.bias-f.fraction)),overflowThreshold:sub(pow2(f.bias+1),pow2(f.bias-f.fraction-1)),normalMinExponent:1-f.bias,normalMaxExponent:f.bias,subnormalExponent:1-f.bias-f.fraction,precision:f.fraction+1};
}
export function exactBinary64(value:number):Rational {
  if(!Number.isFinite(value))throw new RangeError('Non-finite result has no rational value.');
  const data=new DataView(new ArrayBuffer(8));data.setFloat64(0,value,false);
  return decode(data.getBigUint64(0,false),'binary64').exact!;
}
export const asBinary64=(r:Rational):number=>decode(encode({kind:'finite',value:r,negativeZero:false},'binary64'),'binary64').value;
export function roundedSum(a:string,b:string,id:FormatId) {
  const left=representation(a,id),right=representation(b,id);
  if(left.input.kind!=='finite'||right.input.kind!=='finite'||left.stored.exact===null||right.stored.exact===null)throw new RangeError('Sum explorer needs two inputs that round to finite values.');
  const intended=add(left.input.value,right.input.value),operandSum=add(left.stored.exact,right.stored.exact),stored=decode(encode({kind:'finite',value:operandSum,negativeZero:false},id),id);
  return {left,right,intended,operandSum,stored,representationError:sub(operandSum,intended),evaluationError:stored.exact===null?null:sub(stored.exact,operandSum),totalError:stored.exact===null?null:sub(stored.exact,intended)};
}
