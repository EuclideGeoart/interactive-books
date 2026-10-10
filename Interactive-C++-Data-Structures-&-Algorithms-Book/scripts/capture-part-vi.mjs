import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.BOOK_CAPTURE_URL||'http://127.0.0.1:4371';
const directory=process.env.BOOK_CAPTURE_DIR||'tests/visual/sorting';
mkdirSync(directory,{recursive:true});
const cases=[['37-linear-search','linear.compare'],['38-binary-search','binary.low'],['39-sorting-fundamentals','explore.inversion'],['40-elementary-sorts','insertion.shift'],['41-merge-sort','merge.output'],['42-quick-sort','quick.place'],['43-heap-sort','heap.shrink'],['44-counting-radix-sort','radix.output']];
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const records=[];
try {
  for(const width of [1440,1024,390]) {
    const page=await browser.newPage({viewport:{width,height:width===390?844:1000},isMobile:width===390,hasTouch:width===390,reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const [slug,tag] of cases) {
      await page.goto(`${base}/chapters/${slug}/`);
      const lab=page.locator('[data-chapter-lab]').first();
      await lab.locator('[data-svg] svg').waitFor();
      if(slug.startsWith('40'))await lab.locator('[data-operation="insertion"]').click();
      if(slug.startsWith('44')) {
        await lab.locator('[name="values"]').fill('170,45,75,90,802,24,2,66');
        await lab.locator('[data-operation="radix"]').click();
      }
      await lab.locator(`[data-jump="${tag}"]`).click();
      await page.addStyleTag({content:'.topbar,.skip-link{visibility:hidden}.playback-controls{position:static}'});
      for(const theme of ['light','dark'])for(const view of ['logical','memory']) {
        await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
        await lab.locator(`[data-view="${view}"]`).click();
        const active=lab.locator('[data-sort-storage]').first().locator('.sort-active').first();
        const node=await active.count()?active:lab.locator('[data-sort-row="array"],[data-sort-row="input"]').first();
        await node.focus();await node.press('Enter');
        assert(await node.evaluate(el=>document.activeElement===el),'Keyboard selection lost focus');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${slug} overflow at ${width}`);
        const file=`${slug}-${width}-${theme}-${view}.png`;
        await lab.locator('[data-diagram]').screenshot({path:`${directory}/${file}`});
        records.push({slug,width,theme,view,tag,step:await lab.getAttribute('data-step'),file});
      }
    }
    assert.deepEqual(errors,[]);await page.close();
  }
} finally {await browser.close();}
writeFileSync(`${directory}/manifest.json`,JSON.stringify(records,null,2)+'\n');
console.log(`${records.length} mutation/view/theme/viewport captures; keyboard focus and page containment passed.`);
