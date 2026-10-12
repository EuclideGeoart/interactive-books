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
