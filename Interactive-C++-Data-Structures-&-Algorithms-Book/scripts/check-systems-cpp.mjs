import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('.cpp-build', { recursive: true });
const cxx = process.env.CXX || 'g++';
for (let number = 51; number <= 59; number++) {
  const binary = `.cpp-build/chapter-${number}`;
  execFileSync(cxx, ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', '-pthread', '-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer', `cpp/chapter-${number}/main.cpp`, '-o', binary]);
  execFileSync(binary, { stdio: 'inherit', timeout: 60000, env: { ...process.env, ASAN_OPTIONS: 'detect_leaks=1' } });
  console.log(`Chapter ${number}: C++20, warnings-as-errors, ASan/UBSan and leak checks passed.`);
}
await import('./check-spsc-concurrency.mjs');

// TSan is a separate build: ASan and TSan cannot be combined. Unsupported
// runtimes are reported explicitly; race reports and other failures still fail.
const tsanBinary = '.cpp-build/chapter-59-tsan';
const compiled = spawnSync(cxx, ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', '-pthread', '-g', '-fsanitize=thread', 'cpp/chapter-59/main.cpp', '-o', tsanBinary], { encoding: 'utf8' });
if (compiled.status !== 0) {
  if (/unrecognized .*sanitize=thread|unsupported .*sanitize.*thread|cannot find -ltsan/i.test(compiled.stderr ?? '')) console.log(`ThreadSanitizer unavailable: ${compiled.stderr.trim()}`);
  else throw new Error(`ThreadSanitizer compilation failed: ${compiled.error ?? compiled.stderr}`);
} else {
  const result = spawnSync(tsanBinary, [], { encoding: 'utf8', timeout: 60000, env: { ...process.env, TSAN_OPTIONS: 'halt_on_error=1' } });
  if (result.status === 0) {
    process.stdout.write(result.stdout);
    console.log('Chapter 59: ThreadSanitizer passed the uninstrumented 100,000-value two-thread FIFO test. This does not prove race freedom for every execution.');
  } else if (/FATAL: ThreadSanitizer: unexpected memory mapping|ThreadSanitizer: unsupported/i.test(result.stderr ?? '')) console.log(`ThreadSanitizer runtime unavailable: ${result.stderr.trim()}`);
  else throw new Error(`ThreadSanitizer failed: ${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
}
