import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
mkdirSync('.cpp-build', { recursive: true });
for (const chapter of ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23']) {
execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', '-pthread', '-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer', `cpp/chapter-${chapter}/main.cpp`, '-o', `.cpp-build/chapter-${chapter}`]);
execFileSync(`.cpp-build/chapter-${chapter}`, { stdio: 'inherit', env: { ...process.env, ASAN_OPTIONS: process.env.ASAN_OPTIONS || 'detect_leaks=1' } });

console.log(`Chapter ${chapter}: C++20, warnings-as-errors, ASan/UBSan and leak checks passed.`);
}

execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', '-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer', 'cpp/validation/trees.cpp', '-o', '.cpp-build/trees-integrated']);
execFileSync('.cpp-build/trees-integrated', { stdio: 'inherit', env: { ...process.env, ASAN_OPTIONS: 'detect_leaks=1' } });

execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', '-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer', 'cpp/validation/hashing.cpp', '-o', '.cpp-build/hashing-integrated']);
execFileSync('.cpp-build/hashing-integrated', { stdio: 'inherit', env: { ...process.env, ASAN_OPTIONS: 'detect_leaks=1' } });
console.log('Hashing integrated: 20,000 mixed oracle operations, ownership/copy/capacity checks and ASan/UBSan/leak checks passed.');

// Part V validation stays in a graph-owned runner.
await import('./check-graphs-cpp.mjs');

// Part VII owns its bounded algorithm-technique validation.
await import('./check-techniques-cpp.mjs');

// Part VI keeps searching/sorting validation domain-owned.
await import('./check-sorting-cpp.mjs');

// Part IX keeps spatial oracle and geometry checks domain-owned.
const { runPartitionChecks } = await import('./check-spatial-partition-cpp.mjs');
runPartitionChecks();
await import('./check-spatial-bounding-cpp.mjs');

// Part VIII keeps lifetime, storage and SPSC checks domain-owned.
await import('./check-systems-cpp.mjs');
