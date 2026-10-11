import { useMemo } from 'preact/hooks';
import CompletionStage, { CompletionWorkedStage } from './CompletionStage';
import { deriveElimination, ELIMINATION_CANONICAL, eliminationFields, eliminationPresets, eliminationSpecs, type EliminationChapter, type EliminationState } from './elimination-lesson';
const titles = { elimination: 'Simplify the equations, one legal row operation at a time', rank: 'Count what survives and what disappears', inverse: 'Construct the map that undoes A' };
export default function EliminationStage({ chapter, worked = false }: { chapter: EliminationChapter; worked?: boolean }) {
  const derive = useMemo(() => (state: EliminationState) => deriveElimination(chapter, state), [chapter]);
  if (worked) return <CompletionWorkedStage kind={chapter} frames={derive(ELIMINATION_CANONICAL[chapter]).frames} />;
  return <CompletionStage kind={chapter} title={titles[chapter]} canonical={ELIMINATION_CANONICAL[chapter]} derive={derive}
    fields={state => eliminationFields(chapter, state)} specs={eliminationSpecs(chapter)} presets={eliminationPresets(chapter)} />;
}
