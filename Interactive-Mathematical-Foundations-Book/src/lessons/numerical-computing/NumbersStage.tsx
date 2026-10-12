import { IdScope } from '../../ui/ids';
import { NumericalStage } from './NumericalStage';
import { numbersConfig,type NumbersChapter } from './numbers-lesson';
export default function NumbersStage({chapter,worked=false}:{chapter:NumbersChapter;worked?:boolean}) {return <IdScope name={`numerical-${chapter}${worked?'-worked':''}`}><NumericalStage chapter={chapter} worked={worked} config={numbersConfig(chapter)} /></IdScope>;}
