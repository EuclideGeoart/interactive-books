import CompletionStage, { CompletionWorkedStage } from './CompletionStage';
import { deriveEigen, EIGEN_CANONICAL, eigenPresets } from './eigen-lesson';
import { matrixSpecs } from './completion-view';
export default function EigenStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CompletionWorkedStage kind="eigenvalues" frames={deriveEigen(EIGEN_CANONICAL).frames} />;
  return <CompletionStage kind="eigenvalues" title="Discover the directions that stay on their line" canonical={EIGEN_CANONICAL} derive={deriveEigen}
    fields={() => ['a11','a12','a21','a22','x1','x2']} specs={matrixSpecs(EIGEN_CANONICAL)} presets={eigenPresets} />;
}
