import { useRef,useState } from 'preact/hooks';
import { useLesson } from '../../ui/useLesson';
import TraceStepper from '../../ui/TraceStepper';
import type { TraceFrame } from '../../platform/trace';
export function useExperiment<S extends object,D extends {speech:string}>(canonical:S,derive:(state:S)=>D) {
  const lesson=useLesson(canonical,derive);
  const [frames,setFrames]=useState<readonly TraceFrame<S>[]|null>(null),[index,setIndex]=useState(0);
  const [revision,setRevision]=useState(0),[dragRevision,setDragRevision]=useState(0),[reason,reject]=useState(''),[announcement,setAnnouncement]=useState('');
  const latest=useRef(lesson.derived);latest.current=lesson.derived;
  const dragEpoch=useRef(0);
  function invalidateDrag(){dragEpoch.current+=1;setDragRevision(dragEpoch.current);}
  function announce(message:string){setAnnouncement(previous=>message+(previous.endsWith('\u200b')?'':'\u200b'));}
  function accept(next:S,speak=true){
    const active=derive(next);latest.current=active;lesson.set(next);setFrames(null);setIndex(0);reject('');
    if(speak){invalidateDrag();announce('Changed. '+active.speech);}return active;
  }
  function attempt(action:()=>void){try{action();}catch(error){reject(error instanceof Error?error.message:'Change cannot be represented. Previous state preserved.');}}
  function replace(next:S,prefix:string){const active=accept(next,false);setRevision(v=>v+1);invalidateDrag();announce(prefix+active.speech);}
  function reset(){replace(canonical,'Reset. ');}
  function replay(next:readonly TraceFrame<S>[]){
    if(!next.length)throw new RangeError('Replay needs a complete state.');
    next.forEach(frame=>derive(frame.state));
    lesson.set(next[0]!.state);latest.current=derive(next[0]!.state);setFrames(next);setIndex(0);setRevision(v=>v+1);invalidateDrag();reject('');
    announce('Replay frame 1. '+latest.current.speech);
  }
  function seek(i:number){
    const frame=frames?.[i];if(!frame)return;
    const active=derive(frame.state);lesson.set(frame.state);latest.current=active;setIndex(i);setRevision(v=>v+1);invalidateDrag();reject('');
    announce('Replay frame '+(i+1)+'. '+active.speech);
  }
  return {active:lesson.derived,frames,index,revision,dragRevision,dragEpoch,reason,announcement,accept,attempt,replace,reset,replay,seek,announce};
}
export function ExperimentStatus<S>({experiment}:{experiment:{frames:readonly TraceFrame<S>[]|null;index:number;reason:string;announcement:string;seek(i:number):void}}) {
  return <>
    {experiment.reason&&<p role="alert" data-rejection>{experiment.reason}</p>}
    <p data-current-frame>Frame {experiment.frames?experiment.index+1:1} / {experiment.frames?.length??1} · edits begin at the displayed state.</p>
    {experiment.frames&&<TraceStepper frames={experiment.frames} index={experiment.index} onSeek={experiment.seek}/>}
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-announcement>{experiment.announcement}</p>
  </>;
}
