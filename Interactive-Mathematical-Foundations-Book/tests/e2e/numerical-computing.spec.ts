import {test,expect} from '@playwright/test';
import {entry,state,metrics,scanStage,exercises} from './calculus-helpers';
const cases=[['VIII.1','floating-point-representation','representation','nan'],['VIII.2','rounding-representation-error','rounding','integer'],['VIII.3','error-propagation-conditioning','conditioning','pole'],['VIII.4','catastrophic-cancellation','cancellation','large']] as const;
for(const [id,slug,chapter,preset]of cases){
 test(`${id}: exact input, numerical identity, immutable replay, keyboard and reset`,async({page})=>{
  await page.goto(`chapters/${slug}/`);const s=page.locator(`[data-stage="numerical-${chapter}"]`);await expect(s).toHaveAttribute('data-hydrated','true');
  const original=await metrics(s);await s.getByRole('button',{name:/^Next/}).click();await expect(s.locator('[data-trace-index]')).toHaveAttribute('data-trace-index','1');await s.getByRole('button',{name:/Previous/}).click();expect(await metrics(s)).toEqual(original);
  await entry(s,'text',chapter==='conditioning'?'3':'1');expect((await state(s)).text).toBe(chapter==='conditioning'?'3':'1');
  const bad=await entry(s,'text','1e9999');await expect(bad).toHaveAttribute('aria-invalid','true');expect((await state(s)).text).toBe(chapter==='conditioning'?'3':'1');
  await s.locator(`[data-preset="${preset}"]`).click();await expect(s.locator('[data-verdict]')).not.toBeEmpty();await s.locator('[data-action="reset"]').click();expect(await metrics(s)).toEqual(original);await expect(s.locator('[data-announcement]')).not.toBeEmpty();
  if(chapter==='representation'){const bits=(await metrics(s)).bits;await s.locator('[data-bit="0"]').focus();await s.locator('[data-bit="0"]').press('Enter');expect((await metrics(s)).bits[0]).not.toBe(bits[0]);await expect(s.locator('[data-quantity="sign"]')).toContainText('1');await s.getByLabel('binary64',{exact:true}).check();expect((await metrics(s)).bits).toHaveLength(64);}
  if(chapter==='rounding')expect(original.exact).toBe('1351079888211149/4503599627370496');if(chapter==='cancellation'){expect(original.naive).toBe(0);expect(original.stable).toBeGreaterThan(0);}
 });
 test(`${id}: both-theme exceptional-state accessibility`,async({page})=>{for(const scheme of ['light','dark'] as const){await page.emulateMedia({colorScheme:scheme});await page.goto(`chapters/${slug}/`);const s=page.locator(`[data-stage="numerical-${chapter}"]`);await expect(s).toHaveAttribute('data-hydrated','true');await s.locator(`[data-preset="${preset}"]`).click();await scanStage(page);}});
 test(`${id}: five exercise answers, feedback and worked solutions`,async({page})=>{await page.goto(`chapters/${slug}/`);await exercises(page,{
 'numerical-representation-1':['1/1024'],'numerical-representation-2':['-6'],'numerical-representation-3':['1'],
 'numerical-rounding-1':['8'],'numerical-rounding-2':['1/4','1/40'],'numerical-rounding-3':['1/2000'],
 'numerical-conditioning-1':['401/10000'],'numerical-conditioning-2':['2'],'numerical-conditioning-3':['1000000','500000'],
 'numerical-cancellation-1':['1'],'numerical-cancellation-2':['0','1/200000000'],'numerical-cancellation-3':['3/200','1/40']},`numerical-${chapter}-`);});
}
test('VIII.1: physical touch events select a stored bit and all four format labels fit',async({page},info)=>{
 test.skip(info.project.name!=='mobile','Touch emulation is provided by the mobile project.');
 await page.goto('chapters/floating-point-representation/');const s=page.locator('[data-stage="numerical-representation"]');await expect(s).toHaveAttribute('data-hydrated','true');
 await s.locator('[data-bit="0"]').tap();expect((await metrics(s)).bits[0]).toBe('1');await s.locator('[data-action="reset"]').tap();expect((await metrics(s)).bits[0]).toBe('0');
 const option=s.getByLabel('BF16 / bfloat16',{exact:true});await option.tap();expect((await state(s)).format).toBe('bf16');const b=(await option.boundingBox())!,box=(await s.boundingBox())!;expect(b.x+b.width).toBeLessThanOrEqual(box.x+box.width);
});
const blockB=[['VIII.5','overflow-underflow','range','overflow'],['VIII.6','stable-algorithms','stable','scaling-overflow'],['VIII.7','numerical-linear-algebra','solver','rounded-singular']] as const;
for(const [id,slug,chapter,preset]of blockB){
 test(`${id}: actual arithmetic, failure policies, exact input and immutable replay`,async({page})=>{
  await page.goto(`chapters/${slug}/`);const s=page.locator(`[data-stage="numerical-${chapter}"]`);await expect(s).toHaveAttribute('data-hydrated','true');
  const original=await metrics(s);await s.getByRole('button',{name:/^Next/}).click();await expect(s.locator('[data-trace-index]')).toHaveAttribute('data-trace-index','1');await s.getByRole('button',{name:/Previous/}).click();expect(await metrics(s)).toEqual(original);
  if(chapter==='range'){await s.locator('[data-preset="zero"]').click();expect((await metrics(s)).kind).toBe('zero');await expect(s.locator('[data-verdict]')).toContainText('Nonzero mathematics');await s.locator('[data-preset="mathematical-zero"]').click();await expect(s.locator('[data-verdict]')).not.toContainText('Nonzero mathematics');await entry(s,'text','1e40');expect((await metrics(s)).kind).toBe('infinity');await s.getByLabel('binary64',{exact:true}).check();expect((await metrics(s)).kind).toBe('normal');}
  if(chapter==='stable'){await s.locator('[data-preset="sum"]').click();expect(await metrics(s)).toMatchObject({naive:'0',stable:'1'});await s.getByRole('button',{name:/^Next/}).click();await expect(s.locator('[data-trace-detail]')).toContainText('correction');await s.locator('[data-preset="tail"]').click();expect((await metrics(s)).probabilities[1]).toBe(0);expect((await metrics(s)).logProbabilities[1]).toBe(-1000);await s.locator('[data-preset="scaling"]').click();await entry(s,'scalePower','0');expect((await metrics(s)).stable).toBe('0');const bad=await entry(s,'scalePower','25');await expect(bad).toHaveAttribute('aria-invalid','true');}
  if(chapter==='solver'){await s.locator('[data-preset="ill"]').click();expect(await metrics(s)).toMatchObject({solution:[1,1],numericalResidual:0,residual:'1/10000000000000000',forward:'1/10000'});await expect(s.locator('[data-quantity="forward-error"]')).toContainText('1/10000');await entry(s,'tolerance','1e-8');expect((await metrics(s)).nearSingular).toBe(true);await s.locator('[data-preset="pivot"]').click();expect((await metrics(s)).swapped).toBe(true);const bad=await entry(s,'matrix','1,2,3');await expect(bad).toHaveAttribute('aria-invalid','true');}
  await s.locator(`[data-preset="${preset}"]`).click();if(chapter==='stable')expect((await metrics(s)).stable).toBe('∞');if(chapter==='solver')expect(await metrics(s)).toMatchObject({exactKind:'unique',storedKind:'infinite',solution:null});await s.locator('[data-action="reset"]').click();expect(await metrics(s)).toEqual(original);
 });
 test(`${id}: both-theme exceptional-state accessibility`,async({page})=>{for(const scheme of ['light','dark'] as const){await page.emulateMedia({colorScheme:scheme});await page.goto(`chapters/${slug}/`);const s=page.locator(`[data-stage="numerical-${chapter}"]`);await expect(s).toHaveAttribute('data-hydrated','true');await s.locator(`[data-preset="${preset}"]`).click();await scanStage(page);}});
 test(`${id}: five graded exercises and worked feedback`,async({page})=>{await page.goto(`chapters/${slug}/`);await exercises(page,{'numerical-range-1':['1/16384'],'numerical-range-2':['1/16777216'],'numerical-range-3':['0'],'numerical-stable-1':['3/4','5'],'numerical-stable-2':['0','1'],'numerical-stable-3':['1/4096'],'numerical-solver-1':['1','1'],'numerical-solver-2':['1/10000'],'numerical-solver-3':['16/5']},`numerical-${chapter}-`);});
}
const blockC=[['VIII.8','sparse-matrices-structure','sparse','duplicates'],['VIII.9','vectorized-computation','broadcasting','incompatible'],['VIII.10','reproducibility-random-seeds','reproducibility','zero-reference']] as const;
for(const [id,slug,chapter,preset]of blockC){
 test(`${id}: actual values, index/state correspondence, keyboard inputs and immutable replay`,async({page})=>{
  await page.goto(`chapters/${slug}/`);const s=page.locator(`[data-stage="numerical-${chapter}"]`);await expect(s).toHaveAttribute('data-hydrated','true');const original=await metrics(s);
  await s.getByRole('button',{name:/^Next/}).click();await expect(s.locator('[data-trace-index]')).toHaveAttribute('data-trace-index','1');await s.getByRole('button',{name:/Previous/}).click();expect(await metrics(s)).toEqual(original);
  const w=page.locator(`[data-stage="numerical-worked-${chapter}"]`);await expect(w).toHaveAttribute('data-hydrated','true');const worked=await metrics(w);await w.getByRole('slider').press('ArrowRight');await expect(w.locator('[data-trace-index]')).toHaveAttribute('data-trace-index','1');expect(await metrics(w)).toEqual(worked);
  if(chapter==='sparse'){
   expect(original).toMatchObject({nnz:3,indptr:[0,1,2,3],result:['2','6','12'],costs:[72,48,52]});await s.locator('[data-cell="0,0"]').focus();await s.locator('[data-cell="0,0"]').press('Enter');expect((await metrics(s)).nnz).toBe(2);
   await s.locator('[data-preset="duplicates"]').click();expect(await metrics(s)).toMatchObject({nnz:1,duplicates:1,indptr:[0,0,1,1],result:['0','9','0']});await s.locator('[data-preset="near-zero"]').click();expect(await metrics(s)).toMatchObject({nnz:2,nearZero:1});await entry(s,'threshold','0');expect((await metrics(s)).nnz).toBe(2);expect((await metrics(s)).nearZero).toBe(0);
   const bad=await entry(s,'entries','3,0,1');await expect(bad).toHaveAttribute('aria-invalid','true');expect((await state(s)).entries).toBe('0,0,1e-8;1,1,3');
  }
  if(chapter==='broadcasting'){
   expect(original.outShape).toEqual([2,3]);expect(original.mappings[4]).toMatchObject({index:[1,1],aIndex:[1,1],bIndex:[1],a:'5',b:'11',value:'16'});expect(original.reduction).toEqual({kind:'valid',shape:[2],values:['39','48']});await expect(s.locator('tbody').nth(1).locator('tr').nth(4)).toContainText('16');
   await entry(s,'axis','-1');expect((await metrics(s)).reduction.values).toEqual(['39','48']);await entry(s,'axis','2');expect((await metrics(s)).reduction.kind).toBe('invalid');await s.locator('[data-preset="empty-axis"]').click();expect(await metrics(s)).toMatchObject({outShape:[0,3],operations:0,reduction:{kind:'valid',shape:[3],values:['0','0','0']}});
   const bad=await entry(s,'right','(2,3,4,4)');await expect(bad).toHaveAttribute('aria-invalid','true');expect((await state(s)).right).toBe('(1,3)');
  }
  if(chapter==='reproducibility'){
   expect(original).toMatchObject({seed:42,exactReplay:true,left:1,right:0,reference:'1',withinBudget:false});expect(original.records.slice(0,2).map((r:{after:number})=>r.after)).toEqual([1083814273,378494188]);
   await s.locator('[data-preset="resume"]').click();expect((await metrics(s)).records.map((r:{after:number})=>r.after)).toEqual(original.records.slice(2).map((r:{after:number})=>r.after));await entry(s,'seed','7');expect((await state(s)).seed).toBe(7);expect((await metrics(s)).records[0].after).toBe(1025555898);
   const bad=await entry(s,'seed','4294967296');await expect(bad).toHaveAttribute('aria-invalid','true');expect((await state(s)).seed).toBe(7);await s.locator('[data-preset="loose"]').click();expect((await metrics(s)).withinBudget).toBe(true);expect((await metrics(s)).left).toBe(1);expect((await metrics(s)).right).toBe(0);
  }
  await s.locator(`[data-preset="${preset}"]`).click();await expect(s.locator('[data-verdict]')).not.toBeEmpty();await s.locator('[data-action="reset"]').click();expect(await metrics(s)).toEqual(original);await expect(s.locator('[data-announcement]')).not.toBeEmpty();
 });
 test(`${id}: both-theme boundary-state accessibility`,async({page})=>{for(const scheme of ['light','dark'] as const){await page.emulateMedia({colorScheme:scheme});await page.goto(`chapters/${slug}/`);const s=page.locator(`[data-stage="numerical-${chapter}"]`);await expect(s).toHaveAttribute('data-hydrated','true');await s.locator(`[data-preset="${preset}"]`).click();await scanStage(page);}});
 test(`${id}: five exercises with corrective feedback and worked solutions`,async({page})=>{await page.goto(`chapters/${slug}/`);await exercises(page,{'numerical-sparse-1':['2','6','12'],'numerical-sparse-2':['0','0'],'numerical-sparse-3':['72','48','52'],'numerical-broadcasting-1':['2','3'],'numerical-broadcasting-2':['16'],'numerical-broadcasting-3':['39','48'],'numerical-reproducibility-1':['1','0'],'numerical-reproducibility-2':['10501/5000000'],'numerical-reproducibility-3':['1083814273/4294967296']},`numerical-${chapter}-`);});
}
test('VIII.8: touch toggles exact sparse cells with accessible target dimensions',async({page},info)=>{
 test.skip(info.project.name!=='mobile','Touch emulation is provided by the mobile project.');await page.goto('chapters/sparse-matrices-structure/');const s=page.locator('[data-stage="numerical-sparse"]');await expect(s).toHaveAttribute('data-hydrated','true');const cell=s.locator('[data-cell="0,1"]');const box=(await cell.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);await cell.tap();expect((await metrics(s)).nnz).toBe(4);expect((await metrics(s)).result).toEqual(['4','6','12']);await cell.tap();expect((await metrics(s)).nnz).toBe(3);
});
