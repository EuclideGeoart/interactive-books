// Source-matched continuation: preserve 1,563 passing chapter checks; retry 12 failed audits and run pending gates.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {freshBuild} from '../scripts/production-state.mjs';
const previousPath='validation-results/milestone-2026-10-12T13-40-25-804Z/manifest.json';
const previous=JSON.parse(readFileSync(previousPath,'utf8'));
if(previous.results.at(-1)?.gate!=='all read-only chapter contracts + representative both-theme axe'||previous.results.at(-1).status!==1)throw new Error('Expected retained failed chapter gate.');
const pending=previous.commands.slice(previous.commands.findIndex(c=>c.gate==='all read-only chapter contracts + representative both-theme axe')+1);
const audit={gate:'repaired V.3/V.4 both-theme chapter accessibility audits',deployment:'root',command:[process.execPath,'node_modules/@playwright/test/cli.js','test','tests/e2e/chapters.spec.ts','--grep','(?:^|\\s)V\\.[34](?: |:).*axe','--trace','off']};
const dir='validation-results/m9m10-remaining-'+new Date().toISOString().replaceAll(/[:.]/g,'-');mkdirSync(dir,{recursive:true});
const manifest={...previous,mode:'milestone',partial:true,status:'running',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),continuationOf:['validation-results/milestone-2026-10-12T13-33-26-308Z/manifest.json',previousPath],coverage:'12 failed accessibility audits plus all previously unrun interaction/shell/subpath/visual gates; retained 1563 passing chapter checks and unchanged full mathematical evidence are reported separately',commands:[audit,...pending],results:[]};
const save=()=>writeFileSync(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');save();console.log('Scoped continuation manifest: '+dir+'/manifest.json');
for(const [i,item] of manifest.commands.entries()){
 const sub=item.deployment==='subpath',dist=sub?'dist-subpath':'dist',base=sub?'/math-foundations/':'/';
 if(!freshBuild(dist,base))throw new Error('Production output is not source-matched: '+dist);
 const command=[...item.command,'--output',dir+'/'+i+'-failures'];
 console.log('\n'+item.gate+': '+command.join(' '));const start=Date.now();
 const result=spawnSync(command[0],command.slice(1),{stdio:'inherit',env:{...process.env,BOOK_TEST_PORT:sub?'4452':'4451',BOOK_TEST_DIST:dist,BOOK_TEST_BASE:base}});
 manifest.results.push({gate:item.gate,command,status:result.status??1,wallMs:Date.now()-start,error:result.error?.message});save();
 if(result.error||result.status!==0){manifest.status='failed';save();process.exit(result.status??1);}
}
manifest.status='passed';save();console.log('Passed '+manifest.commands.length+' scoped continuation gates. Previous failures and partial coverage remain explicit.');
