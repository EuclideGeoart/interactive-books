import {IdScope} from '../../ui/ids';
import {NumericalStage} from './NumericalStage';
import {sparseConfig,tensorConfig,reproConfig} from './structure-lesson';
export default function StructureStage({chapter,worked=false}:{chapter:'sparse'|'broadcasting'|'reproducibility';worked?:boolean}){return <IdScope name={`numerical-${chapter}${worked?'-worked':''}`}>{chapter==='sparse'?<NumericalStage chapter={chapter} worked={worked} config={sparseConfig} />:chapter==='broadcasting'?<NumericalStage chapter={chapter} worked={worked} config={tensorConfig} />:<NumericalStage chapter={chapter} worked={worked} config={reproConfig} />}</IdScope>;}
