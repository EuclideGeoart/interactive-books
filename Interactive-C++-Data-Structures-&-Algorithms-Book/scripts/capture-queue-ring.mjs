import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const output = process.env.QUEUE_RING_CAPTURE_DIR || '/tmp/part-ii-a-captures';
mkdirSync(output,{recursive:true});
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/opt/google/chrome/chrome'});
try {
  for (const width of [1440,1024,390]) for (const theme of ['light','dark']) for (const chapter of ['06-queue-deque','07-circular-buffer']) {
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce',isMobile:width===390,hasTouch:width===390});
    await page.goto(`http://127.0.0.1:${process.env.BOOK_TEST_PORT || '4332'}/chapters/${chapter}/`);
    await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
    const lab=page.locator(chapter.startsWith('06')?'#queue':'#ring');
    await lab.locator('[data-view="memory"]').click();
    if(chapter.startsWith('07')) await lab.locator('[data-jump="rp.wrap"]').click();
    else {await lab.locator('[data-operation="pop-front"]').click();await lab.locator('[data-jump="qo.shift"]').click();}
    await lab.screenshot({path:`${output}/${chapter}-${width}-${theme}.png`});
    const textClips=await lab.locator('[data-svg] svg').evaluate(svg=>{const v=svg.viewBox.baseVal;return [...svg.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<0||b.y<0||b.x+b.width>v.width+1||b.y+b.height>v.height+1;}).map(t=>t.textContent);});
    console.log(JSON.stringify({chapter,width,theme,textClips}));
    await page.close();
  }
} finally {await browser.close();}
