import CompletionStage, { CompletionWorkedStage } from './CompletionStage';
import { deriveSVD, SVD_CANONICAL, svdPresets } from './svd-lesson';
import { matrixSpecs } from './completion-view';
export default function SVDStage({ worked = false }: { worked?: boolean }) {
 if(worked)return <CompletionWorkedStage kind="svd" frames={deriveSVD(SVD_CANONICAL).frames}/>;
 return <CompletionStage kind="svd" title="Reconstruct A through three inspectable transformations" canonical={SVD_CANONICAL} derive={deriveSVD}
  fields={()=>['a11','a12','a21','a22','x1','x2']} specs={matrixSpecs(SVD_CANONICAL)} presets={svdPresets}/>;
}
