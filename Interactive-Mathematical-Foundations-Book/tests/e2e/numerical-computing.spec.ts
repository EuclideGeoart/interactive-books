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
