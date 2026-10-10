import {beforeAll,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {compileHashProbingFixture} from '../../scripts/hash-probing-fixture.mjs';
import {openState,openTrace,openSnapshot,type OpenOperation} from '../../src/visualizers/open-addressing/model';
import {robinState,robinTrace,robinSnapshot,type RobinOperation} from '../../src/visualizers/robin-hood/model';
import {contractState,contractTrace,contractSnapshot,type ContractOperation} from '../../src/visualizers/unordered-map/model';
const binaries:Record<string,string>={};
beforeAll(()=>{for(const kind of ['open','robin','contract'])binaries[kind]=compileHashProbingFixture(kind);},30000);
const native=(kind:string,args:string[])=>execFileSync(binaries[kind]!,args,{encoding:'utf8'}).trim().split('\n').filter(Boolean).map(line=>{const [tag,state]=line.split('|');return [tag,JSON.parse(state!)];});
const presets:[number,string[]][]=[[1,[]],[1,['a']],[4,['a','e','i','m']],[8,[]],[8,['a','i','q']],[8,['a','b','i','q']],[8,['g','o','w','a']],[8,['cat','dog','owl']],[8,['zzzzzzzzzzzz','aaaaaaaaaaaa']]];
for(const kind of ['open','robin'])for(const [capacity,keys] of presets)for(const op of ['insert','find','contains','erase','rehash'])for(const key of ['a','i','q','z'])it(`${kind} native ${op} ${key} capacity ${capacity} keys ${keys}`,()=>{
 const trace=kind==='open'?openTrace(op as OpenOperation,openState(keys,capacity),key,9,16):robinTrace(op as RobinOperation,robinState(keys,capacity),key,9,16);
 const snap=kind==='open'?openSnapshot:robinSnapshot;
 const expected=native(kind,[op,key,'9',String(capacity),'16',keys.join(','),'']);
 expect(trace.steps.map(step=>[step.source,snap(step.state as never)])).toEqual(expected);
 expect(trace.steps.at(-1)!.state.probes).toBe(expected.filter(([tag])=>String(tag).endsWith('.probe')||String(tag).endsWith('.inspect')).length);
});
for(const keys of [['a','i','q'],['a','i','q','y']])for(const erased of [['a'],['i'],['a','i','q']])for(const op of ['insert','find','erase','rehash'])it(`tombstones native ${op} ${keys} erased ${erased}`,()=>{
 const t=openTrace(op as OpenOperation,openState(keys,8,erased),'q',9,8);
 expect(t.steps.map(x=>[x.source,openSnapshot(x.state)])).toEqual(native('open',[op,'q','9','8','8',keys.join(','),erased.join(',')]));
});
for(const op of ['insert','find','contains','erase','reserve','rehash','max-load'])for(const keys of [[],['cat'],['cat','dog']])for(const key of ['cat','owl'])it(`library boundary ${op} ${key} in ${keys}`,()=>{
 const t=contractTrace(op as ContractOperation,contractState(keys),key,9,16,0.5);
 expect(t.steps.map(x=>[x.source,contractSnapshot(x.state)])).toEqual(native('contract',[op,key,'9','16','0.5',...keys]));
});
