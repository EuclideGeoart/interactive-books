// Freeze Chapters 1–44 for independent acceptance while another task develops
// Part VII in the shared checkout. Never edit or delete the concurrent source.
// This captures current shared UI. Restore the review's checkpoint.tar.gz when
// reproducing its exact accepted source and pre-autofit screenshot baseline.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';
const source=process.cwd(), target=resolve(process.env.PART_VI_CHECKOUT||'/tmp/dsa-part-vi-checkout');
if(!target.startsWith('/tmp/dsa-part-vi-')) throw new Error('Use a dedicated /tmp/dsa-part-vi-* acceptance directory.');
mkdirSync(target,{recursive:true});
function accepted(path) {
  const rel=relative(source,path);
  if(/(^|\/)(?:techniques?(?:-|\/|\.)|Techniques|Technique|check-techniques|capture-techniques|PART_VII)/.test(rel))return false;
  const chapter=rel.match(/(?:chapter-|chapters\/)(\d{2})/);
  if(chapter && Number(chapter[1])>44)return false;
  if(/^tests\/visual(?:\/|$)/.test(rel))return false;
  if(/-snapshots\/(?:4[5-9]|50)-/.test(rel))return false;
  if(/(?:^|\/)(?:\.DS_Store|test-results|playwright-report)$/.test(rel))return false;
  return true;
}
for(const dir of ['src','cpp','tests','scripts','public']) {
  rmSync(join(target,dir),{recursive:true,force:true});
  cpSync(join(source,dir),join(target,dir),{recursive:true,filter:accepted});
}
for(const file of ['package.json','package-lock.json','astro.config.mjs','tsconfig.json','playwright.config.ts','vitest.config.ts','open-book.sh','AGENTS.md'])cpSync(join(source,file),join(target,file));
if(!existsSync(join(target,'node_modules')))symlinkSync(join(source,'node_modules'),join(target,'node_modules'),'dir');
const edits=[];
function edit(file,transform) { const path=join(target,file),before=readFileSync(path,'utf8'),after=transform(before);if(before!==after){writeFileSync(path,after);edits.push(file);} }
edit('src/content/book.ts',s=>s.split('\n').filter(line=>!(/number: '(\d+)'/.test(line)&&Number(line.match(/number: '(\d+)'/)[1])>44)).join('\n'));
edit('src/components/book/BookNav.astro',s=>{
  s=s.replace(/  <details class="nav-part" open=\{Number\(current\) >= 45[\s\S]*?<\/details>\n/,'');
  if(!s.includes("['VII',"))s=s.replace('const parts = [',"const parts = [\n  ['VII', 'Algorithmic techniques', 'Recursion · Backtracking · Greedy · Dynamic programming'],");
  return s;
});
edit('src/pages/source/[...path].ts',s=>s.replace(/, '\.\.\/\.\.\/\.\.\/cpp\/chapter-4\[5-9\]\/\*\.\{hpp,cpp\}'/g,'').replace(/, '\.\.\/\.\.\/\.\.\/cpp\/chapter-50\/\*\.\{hpp,cpp\}'/g,''));
edit('scripts/check-cpp.mjs',s=>s.replace(/\/\/ Part VII[^\n]*\nawait import\('\.\/check-techniques-cpp\.mjs'\);\n/g,''));
edit('scripts/validate-book-deployment.mjs',s=>s.replace('length: 50', 'length: 44'));
edit('tests/e2e/parts-iv-v-integration.spec.ts',s=>s
  .replace("const hasPartVI = chapters.some(c => c.number === '37');",'')
  .replace(/expect\(chapters.map\(c => Number\(c.number\)\)\).toEqual\([^\n]+/, 'expect(chapters.map(c => Number(c.number))).toEqual(Array.from({ length: 44 }, (_, i) => i + 1));')
  .replace('toHaveCount(hasPartVI ? 7 : 6)','toHaveCount(6)')
  .replace('[5, 4, 8, 6, 13, ...(hasPartVI ? [8] : []), 6]','[5, 4, 8, 6, 13, 8]')
  .replace('toHaveCount(7)', 'toHaveCount(6)')
  .replace('[5, 4, 8, 6, 13, 8, 6]', '[5, 4, 8, 6, 13, 8]')
  .replace('contains exactly Chapters 1–50 across Parts I–VII', 'contains exactly Chapters 1–44 across Parts I–VI')
  .replace(/\ntest\('Parts VI and VII preserve progress[\s\S]*$/, '\n')
  .replace("expect((await request.get('/chapters/45-recursion/')).ok()).toBe(true);","expect((await request.get('/chapters/45-recursion/')).status()).toBe(404);"));
// The general fit matrix follows the copied registry; its explicit Fibonacci
// case belongs only to the later Part and must not enter a 1–44 copy.
edit('tests/e2e/diagram-fit.spec.ts',s=>s.replace(/\ntest\('dense Fibonacci[\s\S]*$/, '\n'));
// Reconstruct the checkpoint's launcher requirement if concurrent integration
// advances it beyond Chapter 44. All original 1/23/36 checks remain intact.
edit('open-book.sh',s=>s.replace(/\$\{URL\}chapters\/50-memoization-tabulation\//g,'${URL}chapters/44-counting-radix-sort/').replace(/Chapters 1–50/g,'Chapters 1–44'));
edit('scripts/validate-book-launcher.mjs',s=>s.replace(/Chapters 1–50/g,'Chapters 1–44').replace(/\['50', '50-memoization-tabulation'\]/g,"['44', '44-counting-radix-sort']"));
const hashes={};
function inventory(dir) {for(const e of readdirSync(dir,{withFileTypes:true})){if(e.name==='node_modules'||e.name.startsWith('.')||['dist','playwright-report','test-results'].includes(e.name))continue;const path=join(dir,e.name);if(e.isDirectory())inventory(path);else hashes[relative(target,path)]=createHash('sha256').update(readFileSync(path)).digest('hex');}}
inventory(target);
mkdirSync('documentation/validation/part-vi',{recursive:true});
writeFileSync(join(target,'CHECKPOINT_SOURCE.json'),JSON.stringify({target,scope:'Fresh Chapters 1–44 copy of current shared UI; concurrent Part VII omitted only in this copy',checkpointEdits:edits,hashes},null,2)+'\n');
console.log(`Frozen ${Object.keys(hashes).length} files at ${target}; ${edits.length} checkpoint-only integration adjustments. Shared concurrent work untouched.`);
