import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const base = process.env.BOOK_DEPLOYMENT_URL || 'http://127.0.0.1:45642/book';
const cases = [
 ['18','18-hashing-fundamentals','TeachingHash.hpp'], ['19','19-hash-tables','HashTable.hpp'],
 ['20','20-separate-chaining','ChainedMap.hpp'], ['21','21-open-addressing','OpenAddressing.hpp'],
 ['22','22-robin-hood-hashing','RobinHood.hpp'], ['23','23-unordered-map','UnorderedMap.hpp'],
];
const target = resolve('.cpp-build/downloaded-hashing');
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
for(const [chapter,slug,header] of cases){
 await page.goto(`${base}/chapters/${slug}/`);
 await page.locator('[data-chapter-lab] svg').first().waitFor();
 assert.equal(await page.locator('[data-section]').count(),13);
 assert.equal(await page.locator('[data-chapter-lab]').first().getAttribute('data-step'),'0');
 const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
 for(const link of links.filter(x=>x.startsWith('/')&&!x.startsWith('//')))assert(link.startsWith('/book/'),`${slug}: missing prefix ${link}`);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const file of [header,'main.cpp']){
  const response=await fetch(`${base}/source/chapter-${chapter}/${file}`);assert(response.ok);
  const source=await response.text();assert(!/@(?:trace|begin|end)/.test(source));
  mkdirSync(`${target}/chapter-${chapter}`,{recursive:true});writeFileSync(`${target}/chapter-${chapter}/${file}`,source);
 }
}
assert.deepEqual(errors,[]);await browser.close();
for(const [chapter] of cases){
 const binary=`${target}/chapter-${chapter}/example`;
 execFileSync(process.env.CXX||'g++',['-std=c++20','-Wall','-Wextra','-Werror','-pedantic','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer',`${target}/chapter-${chapter}/main.cpp`,'-o',binary]);
 execFileSync(binary,{stdio:'inherit',env:{...process.env,ASAN_OPTIONS:'detect_leaks=1'}});
}
console.log('Prefix deployment: all six chapters mounted, 78 sections, correct links, no overflow/errors; twelve downloaded sources compile/run with all dependencies and sanitizers.');
