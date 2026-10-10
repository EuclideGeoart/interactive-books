import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const base=`http://127.0.0.1:${process.env.BOOK_TEST_PORT||'45641'}`;
mkdirSync('tests/visual/hashing/states',{recursive:true});
for(const width of [1440,1024,390]){
 const page=await browser.newPage({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce',colorScheme:'light'});
 async function load(slug,id){await page.goto(`${base}/chapters/${slug}/`);await page.addStyleTag({content:'.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}'});const lab=page.locator(`#${id}-lab`);await lab.locator('svg').waitFor();return lab;}
 async function jump(lab,tag){await lab.locator(`[data-code-region]:not([hidden]) [data-jump="${tag}"]`).first().click();}
 async function shot(lab,name){await page.waitForTimeout(80);await lab.screenshot({path:`tests/visual/hashing/states/${name}-${width}.png`});}
 let lab=await load('20-separate-chaining','chaining');
 await lab.locator('[name="entries"]').fill('aa:1,aq:2,bb:3,br:4,cc:5,cs:6');
 await lab.locator('[name="key"]').fill('bb');await lab.locator('[data-operation="erase"]').click();await jump(lab,'erase.reconnect');await shot(lab,'chain-reconnect');
 await lab.locator('[data-view="memory"]').click();await shot(lab,'chain-reconnect-memory');
 await lab.locator('[data-operation="rehash"]').click();await jump(lab,'rehash.publish');await shot(lab,'chain-rehash');
 lab=await load('21-open-addressing','open-addressing');await lab.locator('[data-operation="find"]').click();await lab.locator('[data-phase="after"]').click();await shot(lab,'tombstone-find');
 await lab.locator('[data-operation="rehash"]').click();await jump(lab,'oa.rehash.remap');await shot(lab,'open-rehash');
 await lab.locator('[name="capacity"]').fill('32');await lab.locator('[data-operation="find"]').click();const last=lab.locator('[data-node]').last();await last.focus();await last.press('Enter');await shot(lab,'large-table-keyboard-inspector');
 lab=await load('22-robin-hood-hashing','robin-hood');await jump(lab,'rh.insert.swap');await shot(lab,'robin-displaced');
 await lab.locator('[name="keys"]').fill('a,i,q');await lab.locator('[name="key"]').fill('a');await lab.locator('[data-operation="erase"]').click();await jump(lab,'rh.erase.hole');await shot(lab,'robin-hole');await jump(lab,'rh.erase.shift');await shot(lab,'robin-shift');
 lab=await load('23-unordered-map','unordered-map');await lab.locator('[data-operation="reserve"]').click();await lab.locator('[data-phase="after"]').click();await shot(lab,'unordered-reserve');
 const point=page.locator('[data-point-contract]');await point.locator('[name="policy"]').selectOption('broken');await shot(point,'point-invalid-equality');
 await page.close();
}
await browser.close();
