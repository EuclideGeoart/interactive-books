import CompletionStage, { CompletionWorkedStage } from './CompletionStage';
import { deriveLeastSquares, LS_CANONICAL, leastSquaresPresets, leastSquaresSpecs } from './least-squares-lesson';
export default function LeastSquaresStage({ worked = false }: { worked?: boolean }) {
  if (worked) return <CompletionWorkedStage kind="least-squares" frames={deriveLeastSquares(LS_CANONICAL).frames} />;
  return <CompletionStage kind="least-squares" title="Find the closest reachable data vector" canonical={LS_CANONICAL} derive={deriveLeastSquares}
    fields={() => ['x1','y1','x2','y2','x3','y3']} specs={leastSquaresSpecs} presets={leastSquaresPresets} />;
}
