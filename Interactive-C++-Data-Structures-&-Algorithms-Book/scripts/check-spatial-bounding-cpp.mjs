import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
mkdirSync('.cpp-build', { recursive: true });
for (const [name, source] of [['chapter-64','cpp/chapter-64/main.cpp'],['chapter-65','cpp/chapter-65/main.cpp'],['chapter-66','cpp/chapter-66/main.cpp'],['spatial-bounding','cpp/validation/spatial-bounding.cpp']]) {
  const output = `.cpp-build/${name}`;
  execFileSync(process.env.CXX || 'g++', ['-std=c++20','-Wall','-Wextra','-Werror','-pedantic','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer',source,'-o',output], {stdio:'inherit'});
  execFileSync(output, {stdio:'inherit',env:{...process.env,ASAN_OPTIONS:process.env.ASAN_OPTIONS ?? 'detect_leaks=1'}});
  const chapter = /^chapter-(\d+)$/.exec(name);
  if (chapter) console.log(`Chapter ${chapter[1]}: C++20 ASan/UBSan example passed.`);
}
