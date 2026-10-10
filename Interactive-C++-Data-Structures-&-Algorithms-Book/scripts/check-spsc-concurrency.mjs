import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const folder = resolve('.cpp-build/spsc-concurrency');
mkdirSync(folder, { recursive: true });
// Pause at canonical statement boundaries without inspecting ordinary payload
// storage from the other thread. These gates deliberately constrain schedules.
writeFileSync(`${folder}/SpscRing.hpp`, readFileSync('cpp/chapter-59/SpscRing.hpp', 'utf8').replace(/\/\/ @trace (spsc\.(?:push|pop)\.[\w]+)/g, (_, tag) => `\n        spsc_test_hook("${tag}");`));
writeFileSync(`${folder}/gated.cpp`, `#include <atomic>
#include <cassert>
#include <cstring>
#include <iostream>
#include <semaphore>
#include <thread>
std::atomic<int> gate_mode{0};
std::binary_semaphore reached{0}, resume_worker{0};
void spsc_test_hook(const char* tag) {
  const int mode=gate_mode.load();
  if ((mode==1 && std::strcmp(tag,"spsc.push.payload")==0) ||
      (mode==2 && std::strcmp(tag,"spsc.pop.payload")==0)) {
    reached.release(); resume_worker.acquire();
  }
}
#include "SpscRing.hpp"
int main() {
  {
    SpscRing<2> queue;
    gate_mode.store(1);
    std::jthread producer([&] { assert(queue.try_push(42)); });
    reached.acquire();
    int value=-7;
    assert(!queue.try_pop(value) && value==-7);
    resume_worker.release(); producer.join(); gate_mode.store(0);
    assert(queue.try_pop(value) && value==42);
  }
  {
    SpscRing<2> queue;
    assert(queue.try_push(11));
    gate_mode.store(2);
    std::jthread consumer([&] { int value=0; assert(queue.try_pop(value) && value==11); });
    reached.acquire();
    assert(!queue.try_push(22));
    resume_worker.release(); consumer.join(); gate_mode.store(0);
    assert(queue.try_push(22));
    int value=0; assert(queue.try_pop(value) && value==22);
  }
  std::cout << "Controlled publication and slot-reuse schedules passed.\\n";
}
`);
const binary = `${folder}/gated`;
execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', '-pthread', '-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer', `${folder}/gated.cpp`, '-o', binary]);
execFileSync(binary, { stdio: 'inherit', timeout: 30000, env: { ...process.env, ASAN_OPTIONS: 'detect_leaks=1' } });
console.log('The gates establish these two schedules only; they are not an exhaustive C++ memory-model proof. The uninstrumented example separately exercises real concurrent FIFO transfer.');
