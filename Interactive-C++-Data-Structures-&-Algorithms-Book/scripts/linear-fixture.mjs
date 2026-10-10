import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Instrument the actual header, including nested helper evaluation BEFORE caller conditions.
// Debug fields exist only in the temporary fixture, never in the canonical implementation.
export function compileLinearFixture(chapter = 'stack') {
  const build = resolve('.cpp-build'); mkdirSync(build, { recursive: true });
  const stack = chapter === 'stack';
  let source = readFileSync(stack ? 'cpp/chapter-02/Stack.hpp' : 'cpp/chapter-03/DoublyLinkedList.hpp', 'utf8').replace('#pragma once', '');
  const nodeDebug = `
    std::vector<Node*> book_nodes;
    int book_id(const Node* p) const {
      if (!p) return -1;
      for (std::size_t i = 0; i < book_nodes.size(); ++i) if (book_nodes[i] == p) return static_cast<int>(i);
      return -2;
    }
    std::string book_state() const {
      std::ostringstream out;
      out << "[" << book_id(${stack ? 'topNode' : 'head'})${stack ? '' : ' << "," << book_id(tail)'} << ",[";
      for (std::size_t i = 0; i < book_nodes.size(); ++i) {
        if (i) out << ",";
        const Node* p = book_nodes[i];
        if (!p) { out << "null"; continue; }
        out << "[" << p->data << "," ${stack ? '' : '<< book_id(p->prev) << ","'} << book_id(p->next) << "]";
      }
      out << "]]"; return out.str();
    }
`;
  if (stack) {
    source = source.replace('    int topIndex = -1;', `    std::string book_state() const { std::ostringstream out; out << "[" << topIndex << ",["; for (int i = 0; i < 5; ++i) { if(i) out << ","; out << data[i]; } out << "]]"; return out.str(); }\n    int topIndex = -1;`);
    source = source.replace('    Node* topNode = nullptr;', `    Node* topNode = nullptr;\n${nodeDebug}\npublic: void book_reverse_ids() { std::reverse(book_nodes.begin(), book_nodes.end()); }`);
  } else source = source.replace('    Node* tail = nullptr;', `    Node* tail = nullptr;\n${nodeDebug}`);
  source = source.split('\n').map(line => {
    const tag = line.match(/\/\/ @trace ([\w.-]+)/)?.[1]; if (!tag) return line;
    const code = line.replace(/\s*\/\/ @trace .*/, '');
    const emit = `book_trace("${tag}", book_state())`;
    if (/\b(if|while) \(/.test(code)) return code.replace(/(if|while) \((.*)\) \{/, `$1 ([&] { bool condition = ($2); ${emit}; return condition; }()) {`);
    if (/\b(return|throw)\b/.test(code)) return `${emit}; ${code}`;
    if (/new Node/.test(code)) return `${code} book_nodes.push_back(newNode); ${emit};`;
    if (/delete (oldTop|curr)/.test(code)) {
      const variable = code.match(/delete (\w+)/)[1];
      return `book_nodes[book_id(${variable})] = nullptr; ${code} ${emit};`;
    }
    return `${code} ${emit};`;
  }).join('\n');
  const driver = `#include <iostream>
#include <sstream>
#include <algorithm>
#include <string>
#include <vector>
bool tracing = false;
void book_trace(const char* tag, const std::string& state) { if(tracing) std::cout << tag << '|' << state << '\\n'; }
${source}
int main(int argc, char** argv) {
 if(argc < 4) return 2;
 std::string kind = argv[1], op = argv[2]; int value = std::stoi(argv[3]);
 ${stack ? `ArrayStack array; LinkedStack linked;
 for(int i=4; i<argc; ++i) { array.push(std::stoi(argv[i])); linked.push(std::stoi(argv[i])); }
 linked.book_reverse_ids();
 auto run = [&](auto& s) { tracing = true; try { if(op == "push") s.push(value); else if(op == "pop") s.pop(); else if(op == "top") (void)s.top(); else if(op == "empty") (void)s.empty(); else if(op == "clear") s.clear(); } catch(const std::exception&) {} tracing = false; };
 if(kind == "array") run(array); else run(linked);` : `DoublyLinkedList list;
 for(int i=4; i<argc; ++i) list.push_back(std::stoi(argv[i]));
 tracing = true;
 if(op == "push-front") list.push_front(value); else if(op == "push-back") list.push_back(value); else if(op == "delete-head") list.pop_front(); else if(op == "delete-tail") list.pop_back(); else if(op == "delete-middle") list.erase(value); else if(op == "forward") (void)list.forward(); else if(op == "backward") (void)list.backward(); else if(op == "clear") list.clear();
 tracing = false;`}
}
`;
  const path = `${build}/${chapter}-trace`;
  writeFileSync(`${path}.cpp`, driver);
  execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', `${path}.cpp`, '-o', path]);
  return path;
}
