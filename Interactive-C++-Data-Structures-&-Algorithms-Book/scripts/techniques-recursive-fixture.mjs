import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export function compileRecursiveFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'techniques-recursive-'));
  const source = join(directory, 'fixture.cpp');
  const binary = join(directory, 'fixture');
  writeFileSync(source, `
#include "${resolve('cpp/chapter-45/Recursion.hpp')}"
#include "${resolve('cpp/chapter-46/Backtracking.hpp')}"
#include "${resolve('cpp/chapter-47/DivideConquer.hpp')}"
#include <iostream>
#include <iomanip>
void json(int v) { std::cout << v; }
void json(bool v) { std::cout << (v ? "true" : "false"); }
void json(const std::string& v) { std::cout << std::quoted(v); }
void json(const chapter45::Returned&);
void json(const chapter46::Frame&);
void json(const chapter46::Node&);
void json(const chapter47::Frame&);
void json(const chapter47::Node&);
template<class T> void json(const std::vector<T>& v) {
  std::cout << '['; bool first = true;
  for (const auto& x : v) { if (!first) std::cout << ','; first = false; json(x); }
  std::cout << ']';
}
#define FIELD(name) std::cout << std::quoted(#name) << ':'; json(s.name)
#define NEXT(name) std::cout << ','; FIELD(name)
void json(const chapter45::Returned& s) { std::cout << '{'; FIELD(n); NEXT(value); std::cout << '}'; }
void json(const chapter46::Frame& s) { std::cout << '{'; FIELD(id); NEXT(start); NEXT(candidate); std::cout << '}'; }
void json(const chapter46::Node& s) { std::cout << '{'; FIELD(id); NEXT(parent); NEXT(depth); NEXT(partial); NEXT(status); std::cout << '}'; }
void json(const chapter47::Frame& s) { std::cout << '{'; FIELD(id); NEXT(lo); NEXT(hi); NEXT(mid); NEXT(i); NEXT(j); NEXT(output); NEXT(outputOrigins); NEXT(phase); std::cout << '}'; }
void json(const chapter47::Node& s) { std::cout << '{'; FIELD(id); NEXT(parent); NEXT(lo); NEXT(hi); NEXT(depth); NEXT(status); std::cout << '}'; }
void json(const chapter45::State& s) { std::cout << '{'; FIELD(n); NEXT(iterative); NEXT(stack); NEXT(returned); NEXT(operand); NEXT(value); NEXT(calls); NEXT(multiplications); NEXT(maxDepth); std::cout << '}'; }
void json(const chapter46::State& s) { std::cout << '{'; FIELD(n); NEXT(k); NEXT(partial); NEXT(solutions); NEXT(stack); NEXT(nodes); NEXT(calls); NEXT(choices); NEXT(prunes); NEXT(maxDepth); std::cout << '}'; }
void json(const chapter47::State& s) { std::cout << '{'; FIELD(original); NEXT(values); NEXT(origins); NEXT(stack); NEXT(nodes); NEXT(calls); NEXT(comparisons); NEXT(writes); NEXT(maxDepth); std::cout << '}'; }
template<class T> void observe(const char* tag, const T& s) {
  std::cout << '[' << std::quoted(tag) << ','; json(s); std::cout << "]\\n";
}
int main(int argc, char** argv) {
  try {
    if (argc < 2) return 2;
    const std::string kind = argv[1];
    if (kind == "recursive" || kind == "iterative") {
      if (argc != 3) return 2;
      const int n = std::stoi(argv[2]);
      if (kind == "recursive") chapter45::factorial_recursive(n, observe<chapter45::State>);
      else chapter45::factorial_iterative(n, observe<chapter45::State>);
    } else if (kind == "combinations") {
      if (argc != 4) return 2;
      chapter46::combinations(std::stoi(argv[2]), std::stoi(argv[3]), observe<chapter46::State>);
    } else if (kind == "merge-sort") {
      std::vector<int> values;
      for (int i = 2; i < argc; ++i) values.push_back(std::stoi(argv[i]));
      chapter47::merge_sort(values, observe<chapter47::State>);
    } else return 2;
  } catch (const std::exception&) { return 1; }
}
`);
  execFileSync('g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', source, '-o', binary]);
  return binary;
}
