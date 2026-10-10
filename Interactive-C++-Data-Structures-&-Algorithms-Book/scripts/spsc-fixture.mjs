import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Instrument actual canonical statements. This probe reads storage only during
// single-threaded parity runs. Concurrent tests use a different, nonreading hook.
export function buildSpscFixture() {
  const folder = resolve('.cpp-build/spsc-parity');
  mkdirSync(folder, { recursive: true });
  const source = readFileSync('cpp/chapter-59/SpscRing.hpp', 'utf8').replace(/\/\/ @trace (spsc\.(?:push|pop)\.[\w]+)/g, (_, tag) => `\n        probe("${tag}", read_, write_, slots_);`);
  writeFileSync(`${folder}/SpscRing.hpp`, source);
  writeFileSync(`${folder}/fixture.cpp`, `#include <array>
#include <atomic>
#include <iostream>
#include <string>
#include <vector>
#include <cassert>
bool capture = false;
template<std::size_t N> void probe(const char* tag, const std::atomic<std::size_t>& read, const std::atomic<std::size_t>& write, const std::array<int,N>& slots) {
  if (!capture) return;
  std::cout << "{\\\"tag\\\":\\\"" << tag << "\\\",\\\"read\\\":" << read.load() << ",\\\"write\\\":" << write.load() << ",\\\"slots\\\":[";
  for (std::size_t i=0;i<N;++i) { if(i) std::cout << ','; std::cout << slots[i]; }
  std::cout << "]}\\n";
}
#include "SpscRing.hpp"
template<std::size_t N> void run(const std::vector<int>& initial, const std::vector<std::string>& actions) {
  SpscRing<N> ring;
  capture = false;
  for (int value : initial) assert(ring.try_push(value));
  capture = true;
  for (const auto& action : actions) {
    if (action[0]=='P') ring.try_push(std::stoi(action.substr(1)));
    else { int value=0; ring.try_pop(value); }
  }
  capture = false;
}
int main() {
  int count, n, m;
  while (std::cin >> count >> n) {
    std::vector<int> initial(static_cast<std::size_t>(n));
    for(auto& value:initial) std::cin >> value;
    std::cin >> m;
    std::vector<std::string> actions(static_cast<std::size_t>(m));
    for(auto& action:actions) std::cin >> action;
    std::cout << "CASE\\n";
    switch(count) {
      case 2: run<2>(initial,actions); break; case 3: run<3>(initial,actions); break;
      case 4: run<4>(initial,actions); break; case 5: run<5>(initial,actions); break;
      case 6: run<6>(initial,actions); break; case 7: run<7>(initial,actions); break;
      case 8: run<8>(initial,actions); break; default: return 2;
    }
  }
}
`);
  const binary = `${folder}/fixture`;
  execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', '-pthread', `${folder}/fixture.cpp`, '-o', binary]);
  return cases => {
    const input = cases.map(c => `${c.count} ${c.initial.length} ${c.initial.join(' ')} ${c.actions.length} ${c.actions.map(a => a.type === 'push' ? `P${a.value}` : 'C').join(' ')}`).join('\n') + '\n';
    return execFileSync(binary, { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('CASE\n').slice(1).map(group => group.trim().split('\n').filter(Boolean).map(line => JSON.parse(line)));
  };
}
