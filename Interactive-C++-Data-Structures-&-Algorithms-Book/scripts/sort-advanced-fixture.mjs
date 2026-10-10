import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
export const advancedFiles = {
  merge: ['41', 'MergeSort', 'merge_sort'], quick: ['42', 'QuickSort', 'quick_sort'],
  heap: ['43', 'HeapSort', 'heap_sort'], integer: ['44', 'CountingRadix', 'integer_sort'],
};
export function compileAdvancedFixture(kind) {
  const [chapter, file, ns] = advancedFiles[kind];
  const dir = resolve('.cpp-build/sort-advanced', String(process.pid), kind); mkdirSync(dir, { recursive: true });
  const source = `#include "${resolve(`cpp/chapter-${chapter}/${file}.hpp`)}"
${kind === 'heap' ? `#include "${resolve('cpp/chapter-09/BinaryHeap.hpp')}"` : ''}
#include <iostream>
#include <iomanip>
using namespace ${ns};
template<class T> void array(const T& a) {std::cout<<'[';bool first=true;for(const auto& x:a){if(!first)std::cout<<',';first=false;std::cout<<x;}std::cout<<']';}
void item(const Item& x){std::cout<<'['<<x.key<<','<<x.id<<']';}
template<class T> void items(const T& a){std::cout<<'[';bool first=true;for(const auto& x:a){if(!first)std::cout<<',';first=false;if constexpr(requires {x.has_value();}) {if(x)item(*x);else std::cout<<"null";}else item(x);}std::cout<<']';}
void snapshot(const char* tag,const State& s){
std::cout<<tag<<"|[";items(s.a);std::cout<<',';items(s.tmp);std::cout<<',';array(s.counts);std::cout<<",[";
bool first=true;for(const auto& [lo,hi]:s.stack){if(!first)std::cout<<',';first=false;std::cout<<'['<<lo<<','<<hi<<']';}std::cout<<']';
for(const auto x:{s.lo,s.mid,s.hi,s.i,s.j,s.k,s.pivot,s.pivotId,s.heapSize,s.child,s.right,s.divisor,s.maximum,s.digit,static_cast<int>(s.condition)})std::cout<<','<<x;
std::cout<<','<<std::quoted(s.phase)<<','<<std::quoted(s.fault);
const auto& c=s.counters;for(const auto x:{c.comparisons,c.swaps,c.writes,c.bufferWrites,c.passes,c.maxDepth,c.digitReads,c.maximumScans})std::cout<<','<<x;
std::cout<<"]\\n";
}
int main(int argc,char** argv){
try { if(argc<3)return 2;const std::string op=argv[1];const int option=std::stoi(argv[2]);
std::vector<std::int32_t> values;for(int i=3;i<argc;++i){const auto v=std::stoll(argv[i]);if(v < -2147483648LL || v > 2147483647LL)return 3;values.push_back(static_cast<std::int32_t>(v));}
${kind === 'integer' ? '(void)(op=="counting"?counting(values,option,snapshot):radix(values,option!=0,snapshot));' : kind === 'quick' ? '(void)op;(void)sort(values,static_cast<Fault>(option),snapshot);' : kind === 'heap' ? '(void)option;if(op=="legacy"){std::vector<int> keys(values.begin(),values.end());BinaryHeap h;h.buildHeap(keys);array(h.values());}else (void)sort(values,snapshot);' : '(void)op;(void)option;(void)sort(values,snapshot);'}
} catch(const std::exception& e){std::cerr<<e.what();return 3;}}
`;
  writeFileSync(`${dir}/trace.cpp`, source);
  execFileSync(process.env.CXX || 'g++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-pedantic', `${dir}/trace.cpp`, '-o', `${dir}/trace`]);
  return `${dir}/trace`;
}
