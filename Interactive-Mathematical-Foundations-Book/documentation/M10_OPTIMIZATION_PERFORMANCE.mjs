// Run from the book root: node documentation/M10_OPTIMIZATION_PERFORMANCE.mjs
import {createServer} from 'vite';
import {performance} from 'node:perf_hooks';
const server=await createServer({configFile:false,server:{middlewareMode:true},cacheDir:'node_modules/.vite/optimization-benchmark'});
try {
 const {CANONICALS,optimizationTrace,deriveOptimization}=await server.ssrLoadModule('/src/lessons/optimization/optimization-lesson.ts');
 const result={runtime:process.version,scope:'Pure trace + adapter, warmed fixed landscape caches; excludes browser layout/paint',samples:200,budget:40,chapters:{}};
 for(const chapter of ['descent','momentum','stochastic','adam','constraints','diagnostics']){
  const base={...CANONICALS[chapter],iterations:40};deriveOptimization(base,chapter,0,optimizationTrace(base));
  const times=[];
  for(let i=0;i<result.samples;i++){const state={...base,x:(i%21-10)/4},start=performance.now(),trace=optimizationTrace(state);deriveOptimization(state,chapter,0,trace);times.push(performance.now()-start);}
  times.sort((a,b)=>a-b);result.chapters[chapter]={medianMs:times[100],p95Ms:times[190],maxMs:times.at(-1)};
 }
 console.log(JSON.stringify(result,null,2));
} finally {await server.close();}
