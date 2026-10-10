import { test, expect, type Locator } from '@playwright/test';
async function after(lab: Locator, operation?: string) {
  if (operation) await lab.locator(`[data-operation="${operation}"]`).click();
  await expect(lab.locator('[data-input-error]')).toBeHidden();
  await lab.locator('[data-phase="after"]').click();
}
async function jump(lab: Locator, source: string) {
  await lab.locator(`[data-code-region]:not([hidden]) [data-jump="${source}"]`).first().click();
  await expect(lab.locator(`[data-source="${source}"].executing`).first()).toBeVisible();
}
test('hash values are deterministic while capacity separates a collision', async ({ page }) => {
  await page.goto('/chapters/18-hashing-fundamentals/');
  const lab=page.locator('#hash-fundamentals-lab');
  await after(lab);
  await expect(lab.locator('[data-ascii]')).toContainText('Collision');
  await lab.locator('[name="capacity"]').selectOption('16');
  await after(lab);
  await expect(lab.locator('[data-ascii]')).toContainText('Different buckets');
  await expect(lab.locator('[data-ascii]')).toContainText('hash 97');
  await expect(lab.locator('[data-ascii]')).toContainText('bucket 9');
});
test('chaining rehash exposes replacement ownership and every controlled fault restores', async ({ page }) => {
  await page.goto('/chapters/20-separate-chaining/');
  const lab=page.locator('#chaining-lab');
  await jump(lab,'rehash.bucket');
  await expect(lab.locator('[data-node="new-0"]')).toHaveCount(1);
  await expect(lab.locator('[data-invariant-summary]')).not.toContainText('broken');
  await after(lab);
  await expect(lab.locator('[data-counters]')).toContainText('Capacity 16');
  await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');
  const fault=page.locator('[data-hash-break]');
  for (const kind of ['lost-link','duplicate','old-bucket']) {
    await fault.locator('[name="fault"]').selectOption(kind);
    await fault.locator('button[type="submit"]').click();
    await expect(fault.locator('.invariant-fail').first()).toBeVisible();
    await fault.locator('[data-restore]').click();
    await expect(fault.locator('.invariant-fail')).toHaveCount(0);
  }
});
test('linear probing searches beyond tombstones before updating or reusing', async ({ page }) => {
  await page.goto('/chapters/21-open-addressing/');
  const lab=page.locator('#open-addressing-lab');
  await after(lab);
  await expect(lab.locator('[data-ascii]')).toContainText('3: q=9');
  await expect(lab.locator('[data-counters]')).toContainText('3');
  await lab.locator('[name="key"]').fill('y');
  await after(lab,'insert');
  await expect(lab.locator('[data-ascii]')).toContainText('1: y=9');
  const fault=page.locator('#open-policy-break');
  await after(fault);
  await expect(fault.locator('[data-ascii]')).toContainText('Not found');
  await expect(fault.locator('[data-invariant-summary]')).toContainText('broken');
  await after(fault,'correct');
  await expect(fault.locator('[data-ascii]')).toContainText('Found q');
  await expect(fault.locator('[data-invariant-summary]')).toContainText('All invariants valid');
});
test('Robin Hood keeps displaced identity visible and repairs a deletion hole', async ({ page }) => {
  await page.goto('/chapters/22-robin-hood-hashing/');
  const lab=page.locator('#robin-hood-lab');
  await jump(lab,'rh.insert.swap');
  await expect(lab.locator('.hash-state-strip')).toContainText('INCOMING b');
  await expect(lab.locator('[data-step-title]')).toContainText('displaced b');
  await after(lab);
  await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');
  await lab.locator('[name="keys"]').fill('a,i,q');
  await lab.locator('[name="key"]').fill('a');
  await lab.locator('[data-operation="erase"]').click();
  await jump(lab,'rh.erase.hole');
  await expect(lab.locator('[data-invariant-summary]')).toContainText('temporary');
  await after(lab);
  await expect(lab.locator('[data-counters]')).toContainText('Backward shifts 2');
  await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');
  await expect(lab.locator('[data-ascii]')).toContainText('1: i=2, distance 0');
});
for(const [slug,id,expected] of [['21-open-addressing','open-addressing',6],['22-robin-hood-hashing','robin-hood',12]] as const) {
  test(`${id}: rehash counts real replacement probes and full-table lookup terminates`,async({page})=>{
    await page.goto(`/chapters/${slug}/`); const lab=page.locator(`#${id}-lab`);
    await lab.locator('[name="keys"]').fill('a,i,q');
    if(id==='open-addressing')await lab.locator('[name="erased"]').fill('');
    await lab.locator('[name="requested"]').fill('8');
    await after(lab,'rehash');
    await expect(lab.locator('[data-counters]')).toContainText(`inspections ${expected}`);
    await lab.locator('[name="keys"]').fill('a,c');
    await lab.locator('[name="capacity"]').fill('2');
    await lab.locator('[name="key"]').fill('e');
    await after(lab,'insert');
    await expect(lab.locator('[data-ascii]')).toContainText('Table full');
    await expect(lab.locator('[data-invariant-summary]')).toContainText('All invariants valid');
    await after(lab,'find');
    await expect(lab.locator('[data-step-title]')).toContainText(/Not found|Absent/);
  });
}
test('standard-map calls distinguish reference validity and custom equality obligations',async({page})=>{
  await page.goto('/chapters/23-unordered-map/');const lab=page.locator('#unordered-map-lab');
  await after(lab,'reserve');
  await expect(lab.locator('.hash-result')).toContainText('bucket count ≥ 16');
  await expect(lab.locator('[data-ascii]')).toContainText('reacquire saved iterator');
  await expect(lab.locator('[data-ascii]')).toContainText('Saved element reference: valid');
  await after(lab,'erase');
  await expect(lab.locator('[data-ascii]')).toContainText('reference invalidated by erase');
  const point=page.locator('[data-point-contract]');
  await point.locator('[name="policy"]').selectOption('broken');
  await expect(point.locator('[data-result]')).toContainText('BROKEN');
  await point.locator('[name="policy"]').selectOption('correct');
  await point.locator('[name="bx"]').fill('0');await point.locator('[name="by"]').fill('33');
  await point.locator('button[type="submit"]').click();
  await expect(point.locator('[data-result]')).toContainText('Implication holds');
  await expect(point.locator('[data-result]')).toContainText('Hash(A): 33. Hash(B): 33');
});
