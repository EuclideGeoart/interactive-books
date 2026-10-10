import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function compilePartitionFixture(directory, sanitizers = false) {
  mkdirSync(directory, { recursive: true });
  const binary = resolve(directory, 'spatial-partition-fixture');
  execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', '-g',
    ...(sanitizers ? ['-fsanitize=address,undefined', '-fno-omit-frame-pointer', '-fno-pie', '-no-pie'] : []),
    'cpp/validation/spatial-partition.cpp', '-o', binary], { stdio: 'pipe' });
  return binary;
}
export function runPartitionChecks() {
  const directory = '.cpp-build/spatial-partition';
  const binary = compilePartitionFixture(directory, true);
  const env = { ...process.env, ASAN_OPTIONS: 'detect_leaks=1', UBSAN_OPTIONS: 'halt_on_error=1:print_stacktrace=1' };
  execFileSync(binary, ['--self-test'], { stdio: 'inherit', env });
  for (const chapter of [60, 61, 62, 63]) {
    const output = resolve(directory, `chapter-${chapter}`);
    execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', '-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer', '-fno-pie', '-no-pie', `cpp/chapter-${chapter}/main.cpp`, '-o', output]);
    execFileSync(output, [], { stdio: 'inherit', env });
    console.log(`Chapter ${chapter}: C++20 ASan/UBSan example passed.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runPartitionChecks();
