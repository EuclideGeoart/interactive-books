import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
export function compileGraphStructureFixture() {
  const build = resolve(".cpp-build/graph-structure");
  mkdirSync(build, { recursive: true });
  const chapters = [
    [24, "Graph", "graph_fundamentals"],
    [25, "Representations", "graph_representations"],
    [26, "BFS", "graph_bfs"],
    [27, "DFS", "graph_dfs"],
    [28, "Directed", "graph_directed"],
    [31, "Components", "graph_components"],
    [32, "Cycles", "graph_cycle"],
  ];
  let source = `#include <iostream>\n#include <iomanip>\n#include <string>\n#include <vector>\n#include <sstream>\n`;
  source += `template<class T> void array(const T& values){std::cout<<"[";bool first=true;for(const auto& v:values){if(!first)std::cout<<",";first=false;std::cout<<v;}std::cout<<"]";}
 template<class S> void book_trace(const char* tag,const S& s){
 std::cout<<tag<<"|[[";bool first=true;for(const auto& label:s.graph.labels){if(!first)std::cout<<",";first=false;std::cout<<std::quoted(label);}std::cout<<"],[";
 first=true;for(const auto& e:s.graph.edges){if(!first)std::cout<<",";first=false;std::cout<<"["<<e.from<<","<<e.to<<","<<e.weight<<"]";}
 std::cout<<"],"<<(s.graph.directed?"true":"false")<<",";array(s.distance);std::cout<<",";array(s.pred);std::cout<<",";array(s.color);std::cout<<",";array(s.component);std::cout<<",";array(s.output);std::cout<<",";array(s.queue);std::cout<<",[";
 first=true;for(const auto& f:s.frames){if(!first)std::cout<<",";first=false;std::cout<<"["<<f.vertex<<","<<f.next<<","<<f.parent_edge<<"]";}
 std::cout<<"],"<<s.active<<","<<s.edge<<","<<s.scans<<","<<s.launches<<","<<(s.cycle?"true":"false")<<"]\\n";
 }
`;
  for (const [chapter, name] of chapters) {
    const header = readFileSync(`cpp/chapter-${chapter}/${name}.hpp`, "utf8");
    source +=
      header
        .replace(/^#pragma once\n/m, "")
        .split("\n")
        .map((line) => {
          const tag = line.match(/\/\/ @trace ([\w.-]+)/)?.[1];
          return tag
            ? line.replace(/\s*\/\/ @trace .*/, ` book_trace("${tag}",s);`)
            : line;
        })
        .join("\n") + "\n";
  }
  source += `template<class G> G parse(int argc,char** argv){G g;g.directed=std::string(argv[3])=="1";int n=std::stoi(argv[4]);for(int i=0;i<n;++i)g.labels.push_back(std::string(1,static_cast<char>('A'+i)));for(int i=6;i+2<argc;i+=3)g.edges.push_back({std::stoi(argv[i]),std::stoi(argv[i+1]),std::stoi(argv[i+2])});return g;}
int main(int argc,char** argv){if(argc<6)return 2;int chapter=std::stoi(argv[1]),start=std::stoi(argv[5]);std::string op=argv[2];
`;
  for (const [chapter, , ns] of chapters) {
    source += `if(chapter==${chapter}) {auto g=parse<${ns}::Graph>(argc,argv);`;
    if (chapter === 24)
      source += `if(op=="inspect"||op=="matrix")${ns}::inspect(g,start,op=="matrix");else ${ns}::edit(g,op,0,static_cast<int>(g.labels.size())-1,"NEW",-2);`;
    else if (chapter === 25) source += `${ns}::inspect(g,start,op=="matrix");`;
    else if (chapter === 26) source += `${ns}::bfs(g,start);`;
    else if (chapter === 28)
      source += `if(op=="inspect"||op=="matrix")${ns}::inspect(g,start,op=="matrix");else ${ns}::bfs(g,start);`;
    else if (chapter === 31) source += `${ns}::components(g);`;
    else source += `${ns}::dfs(g,start,op!="dfs",op=="cycle");`;
    source += "return 0;}\n";
  }
  source += "return 3;}\n";
  writeFileSync(`${build}/trace.cpp`, source);
  execFileSync(process.env.CXX || "g++", [
    "-std=c++20",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-pedantic",
    `${build}/trace.cpp`,
    "-o",
    `${build}/trace`,
  ]);
  return `${build}/trace`;
}
