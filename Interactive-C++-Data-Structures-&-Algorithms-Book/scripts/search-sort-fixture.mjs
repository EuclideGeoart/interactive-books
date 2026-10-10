import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
export function compileSearchSortFixture() {
  const build=resolve('.cpp-build/search-sort');mkdirSync(build,{recursive:true});
  const source=`#include "chapter-37/LinearSearch.hpp"
#include "chapter-38/BinarySearch.hpp"
#include "chapter-39/Fundamentals.hpp"
#include "chapter-40/ElementarySorts.hpp"
#include <iostream>
#include <iomanip>
using namespace search_sort;
void items(const std::vector<Item>& a){std::cout<<"[";bool first=true;for(const auto& x:a){if(!first)std::cout<<",";first=false;std::cout<<"["<<x.key<<","<<x.id<<"]";}std::cout<<"]";}
void observe(const char* tag,const State& s){
 std::cout<<tag<<"|[";items(s.a);std::cout<<",";items(s.original);std::cout<<",";
 if(s.held)std::cout<<"["<<s.held->key<<","<<s.held->id<<"]";else std::cout<<"null";
 std::cout<<","<<std::quoted(s.algorithm)<<","<<std::quoted(s.fault)<<","<<s.target<<","<<s.i<<","<<s.j<<","<<s.low<<","<<s.high<<","<<s.mid<<","<<s.minimum<<","<<s.boundary<<","<<s.result<<","<<s.checked<<","<<s.inversions<<","<<std::boolalpha<<s.descending<<","<<s.condition<<","<<s.done<<","<<s.changed<<",[";
 bool first=true;for(const auto& p:s.pairs){if(!first)std::cout<<",";first=false;std::cout<<"["<<p.first<<","<<p.second<<"]";}
 std::cout<<"],["<<s.counts.comparisons<<","<<s.counts.swaps<<","<<s.counts.shifts<<","<<s.counts.writes<<","<<s.counts.passes<<"]]\\n";
}
int main(int argc,char** argv){
 if(argc<7) return 2;
 const std::string op=argv[1],mode=argv[3];const int target=std::stoi(argv[2]),left=std::stoi(argv[5]),right=std::stoi(argv[6]);const bool desc=std::string(argv[4])=="1";
 std::vector<int> a;for(int i=7;i<argc;++i)a.push_back(std::stoi(argv[i]));
 if(op=="linear")linear(a,target,observe);
 else if(op=="binary")binary(a,target,mode,observe);
 else if(op=="fundamentals")fundamentals(a,desc,left,right,observe);
 else if(op=="bubble")bubble(a,desc,mode=="unstable-ties",observe);
 else if(op=="selection")selection(a,desc,observe);
 else if(op=="insertion")insertion(a,desc,observe);
 else return 3;
}
`;
  writeFileSync(`${build}/trace.cpp`,source);
  execFileSync(process.env.CXX||'g++',['-std=c++20','-Wall','-Wextra','-Werror','-pedantic','-I',resolve('cpp'),`${build}/trace.cpp`,'-o',`${build}/trace`]);
  return `${build}/trace`;
}
