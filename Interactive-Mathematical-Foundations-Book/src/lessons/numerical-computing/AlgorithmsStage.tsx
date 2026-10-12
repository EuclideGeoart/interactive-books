import {IdScope} from '../../ui/ids';
import {NumericalStage} from './NumericalStage';
import {stableConfig,solverConfig} from './algorithms-lesson';
export default function AlgorithmsStage({chapter,worked=false}:{chapter:'stable'|'solver';worked?:boolean}){return <IdScope name={`numerical-${chapter}${worked?'-worked':''}`}>{chapter==='stable'?<NumericalStage chapter={chapter} worked={worked} config={stableConfig} />:<NumericalStage chapter={chapter} worked={worked} config={solverConfig} />}</IdScope>;}
