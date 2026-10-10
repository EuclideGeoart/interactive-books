import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export function compileFixture() {
  const build = resolve('.cpp-build');
  mkdirSync(build, { recursive: true });
  const source = readFileSync('cpp/chapter-01/SinglyLinkedList.hpp', 'utf8');
  const instrumented = source.split('\n').map(line => {
    const tag = line.match(/\/\/ @trace ([\w.-]+)/)?.[1];
    if (!tag) return line;
    const code = line.replace(/\s*\/\/ @trace .*/, '');
    const emit = `book_trace("${tag}", values())`;
    if (/\b(if|while) \(/.test(code)) return code.replace(/(if|while) \((.*)\) \{/, `$1 ((${emit}, $2)) {`);
    if (/\breturn\b/.test(code)) return `${emit}; ${code}`;
    return `${code} ${emit};`;
  }).join('\n').replace('#pragma once', '');
  const harness = `#include <iostream>
#include <string>
#include <vector>
bool tracing = false;
void book_trace(const char* id, const std::vector<int>& values) {
  if (!tracing) return;
  std::cout << id << '|';
  for (int value : values) std::cout << value << ',';
  std::cout << '\\n';
}
${instrumented}
int main(int argc, char** argv) {
  if (argc < 4) return 2;
  SinglyLinkedList list;
  for (int i = 4; i < argc; ++i) list.insert_tail(std::stoi(argv[i]));
  std::string op = argv[1];
  int value = std::stoi(argv[2]), after = std::stoi(argv[3]);
  tracing = true;
  if (op == "insert-head") list.insert_head(value);
  else if (op == "insert-tail") list.insert_tail(value);
  else if (op == "insert-after") list.insert_after(after, value);
  else if (op == "delete") list.erase(value);
  else if (op == "search") list.find(value);
  else if (op == "clear") list.clear();
  tracing = false;
  book_trace("unused", {});
}
`;
  writeFileSync(`${build}/trace-driver.cpp`, harness);
  execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', `${build}/trace-driver.cpp`, '-o', `${build}/trace-driver`]);
  return `${build}/trace-driver`;
}
