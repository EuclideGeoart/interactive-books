import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Instrument shipped statements; no alternate algorithm is supplied by the fixture.
export function compileQueueRingFixture(kind) {
  const ring = kind === 'ring';
  let source=readFileSync(ring ? 'cpp/chapter-07/RingBuffer.hpp' : 'cpp/chapter-06/QueueDeque.hpp','utf8').replace('#pragma once','');
  const state = ring ? 'out << head << "," << tail << "," << count;' : 'out << count << "," << book_cursor;';
  source=source.replace('public:', `int book_cursor = -1;
    std::string book_state() const { std::ostringstream out; out << "["; ${state} out << ",["; for(std::size_t i=0;i<data.size();++i) { if(i) out << ","; out << data[i]; } out << "]]"; return out.str(); }
public:`);
  source=source.split('\n').map(line => {
    const tag=line.match(/\/\/ @trace ([\w.-]+)/)?.[1]; if(!tag) return line;
    const code=line.replace(/\s*\/\/ @trace .*/,'');
    const emit=`book_trace("${tag}",book_state())`;
    if (/\b(if|while) \(/.test(code)) return code.replace(/(if|while) \((.*)\) \{/,`$1 ([&] { const bool result = ($2); ${emit}; return result; }()) {`);
    const returned = code.match(/\breturn (.*);/);
    if (returned) return `const auto book_return_value = (${returned[1]}); book_trace_value("${tag}",book_state(),book_return_value); return book_return_value;`;
    if (/\bthrow\b/.test(code)) return `${emit}; ${code}`;
    const cursor = /q[fo]\.(start|previous|next)/.test(tag) ? 'book_cursor = static_cast<int>(i);' : '';
    return `${code} ${cursor} ${emit};`;
  }).join('\n');
  const driver=`#include <iostream>
#include <sstream>
#include <string>
bool tracing = false;
void book_trace(const char* tag,const std::string& state) { if(tracing) std::cout << tag << '|' << state << '\\n'; }
template<class T> void book_trace_value(const char* tag,const std::string& state,T value) { if(tracing) std::cout << tag << '|' << state << '|' << std::boolalpha << value << '\\n'; }
${source}
int main(int argc,char** argv) {
 if(argc<5) return 2;
 const std::string op=argv[1]; const int value=std::stoi(argv[2]);
 ${ring ? `RingBuffer s;
 const int head=std::stoi(argv[3]);
 for(int i=0;i<head;++i) { s.push(0); s.pop(); }
 for(int i=5;i<argc;++i) s.push(std::stoi(argv[i]));
 tracing=true;
 try {
 if(op=="push") s.push(value,std::string(argv[4])=="overwrite" ? RingBuffer::Policy::overwrite : RingBuffer::Policy::reject);
 else if(op=="pop") s.pop(); else if(op=="front") (void)s.front(); else if(op=="back") (void)s.back(); else if(op=="empty") (void)s.empty(); else if(op=="size") (void)s.size(); else if(op=="full") (void)s.full();
 } catch(const std::exception&) {}` : `ArrayDeque s;
 for(int i=5;i<argc;++i) s.push_back(std::stoi(argv[i]));
 tracing=true;
 try {
 if(op=="push-front") s.push_front(value); else if(op=="push-back") s.push_back(value); else if(op=="pop-front") s.pop_front(); else if(op=="pop-back") s.pop_back(); else if(op=="front") (void)s.front(); else if(op=="back") (void)s.back(); else if(op=="empty") (void)s.empty(); else if(op=="size") (void)s.size();
 } catch(const std::exception&) {}`}
 tracing=false;
}
`;
  const build=resolve('.cpp-build');mkdirSync(build,{recursive:true});const path=`${build}/${kind}-chapter-trace`;
  writeFileSync(`${path}.cpp`,driver);
  execFileSync(process.env.CXX || 'g++',['-std=c++20','-Wall','-Wextra','-Werror','-pedantic',`${path}.cpp`,'-o',path]);
  return path;
}
