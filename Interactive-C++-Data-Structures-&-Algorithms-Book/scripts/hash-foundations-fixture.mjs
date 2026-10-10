import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Instrument the shipped canonical statements, not a second C++ implementation.
// Each hook serializes current bucket owners, replacement owners and live local
// unique_ptr roots, so half-rewired states are checked as well as final results.
export function compileHashFoundationsFixture() {
  const dir = resolve('.cpp-build/hash-foundations'); mkdirSync(dir, { recursive: true });
  const source = readFileSync('cpp/chapter-20/ChainedMap.hpp', 'utf8')
    .replace('#pragma once', '')
    .replace('#include "../chapter-18/TeachingHash.hpp"', `#include "${resolve('cpp/chapter-18/TeachingHash.hpp')}"`)
    .split('\n').map(line => {
      const tag = line.match(/@trace ([\w.-]+)/)?.[1]; if (!tag) return line;
      const code = line.replace(/\s*\/\/ @trace .*/, '');
      let registration = '';
      for (const name of ['fresh', 'entry', 'removed']) if (code.includes(`auto ${name} =`)) registration += ` BookOwner book_${name}("${name}", [&] { return static_cast<const void*>(${name}.get()); });`;
      if (tag === 'rehash.allocate') registration += ' book_replacement = &replacement;';
      if (tag === 'rehash.commit') registration += ' book_replacement = nullptr;';
      const hook = `book_trace("${tag}", *this);`;
      if (tag === 'find.found') return `if (equal) { ${hook} return current->value; }`;
      if (/\breturn\b/.test(code)) return `${hook} ${code}`;
      return `${code}${registration} ${hook}`;
    }).join('\n');
  const cpp = `#include <iostream>
#include <map>
#include <functional>
#include <string>
#include <sstream>
#include <memory>
#include <vector>
bool book_enabled = false;
const void* book_replacement = nullptr;
std::map<std::string, std::function<const void*()>> book_owners;
struct BookOwner {
 std::string name;
 BookOwner(std::string n, std::function<const void*()> f): name(std::move(n)) { book_owners[name] = std::move(f); }
 ~BookOwner() { book_owners.erase(name); }
};
template<class T> void book_trace(const char*, const T&);
${source}
void chain(const hashing::ChainedMap::Node* n) {
 std::cout << '['; bool first = true;
 while(n) { if(!first) std::cout << ','; first=false; std::cout << "[\\\"" << n->key << "\\\"," << n->value << ']'; n=n->next.get(); }
 std::cout << ']';
}
void heads(const std::vector<std::unique_ptr<hashing::ChainedMap::Node>>& buckets) {
 std::cout << '['; bool first=true;
 for (const auto& head:buckets) { if(!first) std::cout << ','; first=false; chain(head.get()); }
 std::cout << ']';
}
template<class T> void book_trace(const char* tag, const T& map) {
 if(!book_enabled) return;
 std::cout << tag << "|{\\\"buckets\\\":"; heads(map.buckets());
 std::cout << ",\\\"replacement\\\":";
 if(book_replacement) heads(*static_cast<const std::vector<std::unique_ptr<hashing::ChainedMap::Node>>*>(book_replacement)); else std::cout << "null";
 std::cout << ",\\\"locals\\\":{"; bool first=true;
 for(const auto& [name, get]: book_owners) if(get()) { if(!first) std::cout << ','; first=false; std::cout << '\\"' << name << "\\\":"; chain(static_cast<const hashing::ChainedMap::Node*>(get())); }
 std::cout << "},\\\"size\\\":" << map.size() << ",\\\"comparisons\\\":" << map.comparisons << "}\\n";
}
int main(int argc,char** argv) {
 if(argc<4) return 2;
 hashing::ChainedMap map;
 for(int i=4;i<argc;++i) { std::string entry=argv[i]; auto colon=entry.find(':'); map.insert_or_assign(entry.substr(0,colon),std::stoi(entry.substr(colon+1))); }
 map.comparisons=0; book_enabled=true;
 std::string op=argv[1], key=argv[2]; const int value=std::stoi(argv[3]);
 if(op=="insert" || op=="update") map.insert_or_assign(key,value);
 else if(op=="erase") map.erase(key);
 else if(op=="rehash") map.rehash(map.capacity()*2);
 else if(op=="contains") map.contains(key);
 else map.find(key);
 book_enabled=false;
}
`;
  // Template strings retain C++ escaping intentionally; only stringify JSON in C++.
  writeFileSync(`${dir}/fixture.cpp`, cpp);
  const binary = `${dir}/fixture`;
  execFileSync('g++', ['-std=c++20', '-O0', '-g', '-Wall', '-Wextra', '-Werror', '-pedantic', `${dir}/fixture.cpp`, '-o', binary], { stdio: 'pipe' });
  return binary;
}
export function compileHashArithmeticFixture() {
  const dir = resolve('.cpp-build/hash-foundations'); mkdirSync(dir, { recursive: true });
  const source = readFileSync('cpp/chapter-18/TeachingHash.hpp', 'utf8').replace('#pragma once', '').split('\n').map(line => {
    const tag = line.match(/@trace ([\w.-]+)/)?.[1]; if (!tag) return line;
    const code = line.replace(/\s*\/\/ @trace .*/, '');
    const expression = tag.startsWith('hash.') ? 'hash' : 'bucket';
    const hook = `std::cout << "${tag}|" << ${expression} << '\\n';`;
    return /\breturn\b/.test(code) ? `${hook} ${code}` : `${code} ${hook}`;
  }).join('\n');
  writeFileSync(`${dir}/arithmetic.cpp`, `#include <iostream>\n${source}\nint main(int argc,char** argv) { if(argc!=3)return 2; hashing::validate_key(argv[1]); auto hash=hashing::teaching_hash(argv[1]); hashing::bucket_index(hash,std::stoul(argv[2])); }\n`);
  execFileSync('g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', `${dir}/arithmetic.cpp`, '-o', `${dir}/arithmetic`], { stdio: 'pipe' });
  return `${dir}/arithmetic`;
}
