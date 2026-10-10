import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Instrument the actual shipped header, never a hand-written native substitute.
export function instrumentOwnership(source, chapter) {
  return source.replace('#pragma once', '').split('\n').map(line => {
    const tag = line.match(/\/\/ @trace ([\w.-]+)/)?.[1];
    if (!tag) return line;
    const code = line.replace(/\s*\/\/ @trace .*/, '');
    const blockInScope = /^(allocate\.(block|head|reserve|return)|deallocate\.(block|link|free|head))$/.test(tag);
    const call = chapter === 'pool' ? `ownership_pool("${tag}", ${blockInScope ? 'block' : 'nullptr'})` : tag.startsWith('walk.') ? `ownership_walk("${tag}", current, result)` : `ownership_trace("${tag}")`;
    const emit = `${call};`;
    if (/\b(if|while) \(/.test(code)) return code.replace(/(if|while) \((.*)\) \{/, `$1 ((${call}, $2)) {`);
    if (/\b(return|throw)\b/.test(code) || tag.endsWith('.validate')) return `${emit} ${code}`;
    return `${code} ${emit}`;
  }).join('\n');
}
export function compileOwnershipFixture(chapter) {
  const dir = join(tmpdir(), `book-ownership-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const header = chapter === 'pool' ? 'cpp/chapter-04/Pool.hpp' : 'cpp/chapter-05/IntrusiveList.hpp';
  const harness = readFileSync(chapter === 'pool' ? 'cpp/chapter-04/parity.cpp' : 'cpp/chapter-05/parity.cpp', 'utf8');
  const instrumented = instrumentOwnership(readFileSync(header, 'utf8'), chapter);
  const cpp = join(dir, `${chapter}.cpp`); const binary = join(dir, chapter);
  writeFileSync(cpp, harness.replace(/#include "(?:Pool|IntrusiveList)\.hpp"/, instrumented));
  execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', cpp, '-o', binary], { stdio: 'pipe' });
  return binary;
}
