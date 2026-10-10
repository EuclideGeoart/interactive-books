import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
export function compileDagFixture() {
  const dir = resolve(".cpp-build/graph-dag");
  mkdirSync(dir, { recursive: true });
  const source = `#include "${resolve("cpp/chapter-30/Kahn.hpp")}"
#include <iostream>
template<class T> void array(const T& values){std::cout<<"[";bool first=true;for(const auto v:values){if(!first)std::cout<<",";first=false;std::cout<<v;}std::cout<<"]";}
int main(int argc,char** argv){if(argc<2)return 2;std::vector<dependency::Edge> edges;for(int i=2;i+1<argc;i+=2)edges.push_back({std::stoul(argv[i]),std::stoul(argv[i+1])});
dependency::kahn(dependency::Graph{std::stoul(argv[1]),edges},[](const char* tag,const dependency::State& s){std::cout<<tag<<"|[";array(s.indegree);std::cout<<",";array(s.counted);std::cout<<",";array(s.removed);std::cout<<",";array(s.queue);std::cout<<",";array(s.output);std::cout<<","<<s.current<<","<<s.edge<<",\\\""<<s.phase<<"\\\","<<s.cycle<<","<<s.scans<<","<<s.pops<<","<<s.writes<<"]\\n";});}
`;
  writeFileSync(`${dir}/trace.cpp`, source);
  execFileSync(process.env.CXX || "g++", [
    "-std=c++20",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-pedantic",
    `${dir}/trace.cpp`,
    "-o",
    `${dir}/trace`,
  ]);
  return `${dir}/trace`;
}
