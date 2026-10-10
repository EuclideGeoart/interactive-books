import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Instrument only a temporary copy of the actual shipped header. Conditions are
// evaluated once; nested helper tags run before the caller's completed statement.
export function compilePriorityHeapFixture(kind) {
  const priority = kind === 'priority', header = priority ? 'cpp/chapter-08/PriorityQueue.hpp' : 'cpp/chapter-09/BinaryHeap.hpp';
  let source = readFileSync(header, 'utf8').replace('#pragma once', '');
  source = source.split('\n').map(line => {
    const tag = line.match(/\/\/ @trace ([\w.-]+)/)?.[1]; if (!tag) return line;
    const code = line.replace(/\s*\/\/ @trace .*/, '');
    let locals = '-1,-1,-1,-1';
    if (tag.startsWith('hu.')) locals = tag === 'hu.loop' ? 'static_cast<long>(i),-1,-1,-1' : 'static_cast<long>(i),static_cast<long>(parent),-1,-1';
    if (tag.startsWith('hd.')) locals = tag === 'hd.loop' ? 'static_cast<long>(i),-1,-1,-1' : tag === 'hd.left' ? 'static_cast<long>(i),-1,static_cast<long>(child),-1' : 'static_cast<long>(i),-1,static_cast<long>(child),static_cast<long>(right)';
    if (['hb.start','hb.loop','hb.previous','hb.down'].includes(tag)) locals = 'static_cast<long>(i),-1,-1,-1';
    if (tag === 'pb.start' || tag.startsWith('pp.') || tag.startsWith('pe.')) locals = 'static_cast<long>(best),-1,-1,-1';
    if (tag.startsWith('pb.') && !['pb.empty','pb.throw','pb.start'].includes(tag)) locals = 'static_cast<long>(best),static_cast<long>(i),-1,-1';
    const call = detail => `book_trace("${tag}", data_, ${detail}, ${locals})`;
    if (/\b(if|while) \(/.test(code)) return code.replace(/(if|while) \((.*)\) \{/, (_, control, condition) => `${control} ([&] { const bool test = (${condition}); ${tag === 'pb.compare' ? '++book_comparisons;' : ''} ${call('test ? "true" : "false"')}; return test; }()) {`);
    if (/\breturn /.test(code)) return code.replace(/return (.*);/, (_, expression) => `const auto book_result = ${expression}; ${call('book_detail(book_result)')}; return book_result;`);
    if (/\b(throw|break)\b/.test(code)) return `${call(/\bthrow\b/.test(code) ? '"throw"' : '""')}; ${code}`;
    return `${code} ${['hu.swap','hd.swap'].includes(tag) ? '++book_swaps;' : ''} ${call('""')};`;
  }).join('\n');
  if (!priority) source = source.replace('return max_ ? a > b : a < b;', 'if (tracing) ++book_comparisons; return max_ ? a > b : a < b;');
  const driver = `#include <iostream>
#include <sstream>
#include <string>
#include <vector>
bool tracing = false; int book_comparisons = 0; int book_swaps = 0;
template<class T> std::string book_detail(const T& v) { if constexpr (requires { v.value; }) return std::to_string(v.value) + "," + std::to_string(v.priority); else return std::to_string(v); }
template<class T> void book_trace(const char* tag, const std::vector<T>& values, const std::string& detail, long a, long b, long c, long d) {
 if (!tracing) return;
 std::cout << tag << "|[";
 for(std::size_t i=0;i<values.size();++i) { if(i) std::cout << ','; if constexpr (requires { values[i].value; }) std::cout << '[' << values[i].value << ',' << values[i].priority << ']'; else std::cout << values[i]; }
 std::cout << "]|" << detail << '|' << book_comparisons << "," << book_swaps << '|' << a << "," << b << "," << c << "," << d << '\\n';
}
${source}
int main(int argc, char** argv) {
 if(argc<5) return 2;
 const std::string op=argv[1]; const bool mode=std::string(argv[2])=="true"; const int value=std::stoi(argv[3]);
 ${priority ? `PriorityQueue q(mode); const int priority=std::stoi(argv[4]);
 for(int i=5;i<argc;++i) { std::string p=argv[i]; auto colon=p.find(':'); q.insert(std::stoi(p.substr(0,colon)),std::stoi(p.substr(colon+1))); }
 tracing=true;
 try { if(op=="insert") q.insert(value,priority); else if(op=="peek") (void)q.peek(); else if(op=="extract") (void)q.extract(); } catch(const std::underflow_error&) {}` : `BinaryHeap q(mode); std::vector<int> values;
 for(int i=5;i<argc;++i) values.push_back(std::stoi(argv[i]));
 if(op!="build") q.buildHeap(values);
 tracing=true;
 try { if(op=="insert") q.insert(value); else if(op=="peek") (void)q.peek(); else if(op=="extract") (void)q.extract(); else if(op=="build") q.buildHeap(values); } catch(const std::underflow_error&) {}`}
 tracing=false;
}
`;
  const dir = join(tmpdir(), `book-priority-heap-${process.pid}`); mkdirSync(dir, {recursive:true});
  const cpp=join(dir, `${kind}.cpp`), binary=join(dir,kind); writeFileSync(cpp,driver);
  execFileSync(process.env.CXX || 'g++',['-std=c++20','-Wall','-Wextra','-Werror','-pedantic',cpp,'-o',binary],{stdio:'pipe'});
  return binary;
}
