import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
export function compileOptimizationFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'optimization-native-'));
  const cpp = `
#include "${resolve('cpp/chapter-48/Greedy.hpp')}"
#include "${resolve('cpp/chapter-49/DynamicProgramming.hpp')}"
#include "${resolve('cpp/chapter-50/MemoTabulation.hpp')}"
#include <iostream>
#include <string>
template<class T> void array(const std::vector<T>& a) {
  std::cout << '['; bool first=true;
  for (const auto& x:a) { if (!first) std::cout << ','; first=false; std::cout << x; }
  std::cout << ']';
}
void greedy(const char* tag, const chapter48::State& s) {
  std::cout << tag << "|{\\"order\\":"; array(s.order);
  std::cout << ",\\"accepted\\":"; array(s.accepted);
  std::cout << ",\\"rejected\\":"; array(s.rejected);
  std::cout << ",\\"chosen\\":"; array(s.chosen);
  std::cout << ",\\"active\\":" << s.active << ",\\"remaining\\":" << s.remaining
    << ",\\"checks\\":" << s.checks << ",\\"answer\\":" << s.answer << "}\\n";
}
template<class S> void dp(const char* tag, const S& s) {
  std::cout << tag << "|{\\"values\\":[";
  bool first=true; for (auto v:s.values) { if (!first) std::cout << ','; first=false; if(v) std::cout << *v; else std::cout << "null"; }
  std::cout << "],\\"stack\\":["; first=true;
  for (auto f:s.frames) { if(!first) std::cout << ','; first=false;
    std::cout << '[' << f.id << ',' << f.amount << ',' << f.best << ',' << f.pending << ',' << f.returned << ']'; }
  std::cout << "],\\"active\\":" << s.active << ",\\"dependency\\":" << s.dependency
    << ",\\"candidate\\":" << s.candidate << ",\\"best\\":" << s.best
    << ",\\"calls\\":" << s.calls << ",\\"hits\\":" << s.hits << ",\\"misses\\":" << s.misses
    << ",\\"checks\\":" << s.checks << ",\\"writes\\":" << s.writes << ",\\"maxDepth\\":" << s.max_depth
    << ",\\"answer\\":" << s.answer << ",\\"collapsed\\":" << (s.collapsed?"true":"false") << "}\\n";
}
int main(int argc, char** argv) {
  try {
    if(argc<3) return 2;
    std::string mode=argv[1]; int target=std::stoi(argv[2]);
    std::vector<int> coins; for(int i=3;i<argc;++i) coins.push_back(std::stoi(argv[i]));
    if(mode=="intervals") {
      std::vector<chapter48::Interval> intervals;
      for(std::size_t i=0;i+1<coins.size();i+=2) intervals.push_back({coins[i],coins[i+1]});
      chapter48::schedule(intervals,greedy);
    } else if(mode=="greedy") chapter48::largest_first(coins,target,greedy);
    else if(mode=="fibonacci") chapter49::fibonacci(target,dp<chapter49::State>);
    else if(mode=="coins") chapter49::min_coins(coins,target,dp<chapter49::State>);
    else if(mode=="memo") chapter50::memoize(coins,target,dp<chapter50::State>);
    else if(mode=="tabulation") chapter50::tabulate(coins,target,dp<chapter50::State>);
    else return 2;
  } catch(const std::exception& e) { std::cerr << e.what(); return 1; }
}
`;
  const source = join(directory, 'fixture.cpp'), binary = join(directory, 'fixture');
  writeFileSync(source, cpp);
  execFileSync('c++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', source, '-o', binary]);
  return binary;
}
