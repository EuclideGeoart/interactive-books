import { useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import TraceStepper from '../../ui/TraceStepper';
import type { TraceFrame } from '../../platform/trace';

export function useExperiment<S extends object,D extends {speech:string}>(canonical:S,derive:(state:S)=>D) {
  const lesson=useLesson(canonical,derive);
  const [frames,setFrames]=useState<readonly TraceFrame<S>[]|null>(null),[index,setIndex]=useState(0);
  const [reason,setReason]=useState(''),[announcement,setAnnouncement]=useState(''),[revision,setRevision]=useState(0);
  function accept(next:S,prefix='Changed. ') {
    const active=derive(next);
    lesson.set(next);setFrames(null);setIndex(0);setReason('');setAnnouncement(prefix+active.speech);
  }
  function attempt(action:()=>void) {try{action();}catch(error){setReason(error instanceof Error?error.message:'This change cannot be used.');}}
  function reset(){setRevision(v=>v+1);accept(canonical,'Reset. ');}
  function replay(next:readonly TraceFrame<S>[]) {
    if(!next.length) throw new RangeError('A replay requires at least one complete frame.');
    next.forEach(frame=>derive(frame.state));
    setFrames(next);setIndex(0);lesson.set(next[0]!.state);setRevision(v=>v+1);setReason('');
    setAnnouncement('Replay frame 1. '+derive(next[0]!.state).speech);
  }
  function seek(i:number) {
    const frame=frames?.[i];if(!frame)return;
    lesson.set(frame.state);setIndex(i);setRevision(v=>v+1);setReason('');
    setAnnouncement(`Replay frame ${i+1}. `+derive(frame.state).speech);
  }
  return {active:lesson.derived,state:lesson.state,frames,index,reason,announcement,revision,accept,attempt,reset,replay,seek};
}
export function ExperimentStatus<S>({experiment}:{experiment:{frames:readonly TraceFrame<S>[]|null;index:number;reason:string;announcement:string;seek(index:number):void}}) {
  return <>
    {experiment.reason&&<p data-rejection role="alert">{experiment.reason}</p>}
    <p data-current-frame>Frame {experiment.frames?experiment.index+1:1} / {experiment.frames?.length??1} · edits start from the displayed state.</p>
    {experiment.frames&&<TraceStepper frames={experiment.frames} index={experiment.index} onSeek={experiment.seek}/>}
    <p class="sr-only" data-announcement role="status" aria-live="polite" aria-atomic="true">{experiment.announcement}</p>
  </>;
}
