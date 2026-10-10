import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
export const weightedFiles={dijkstra:['33','Dijkstra'], 'bellman-ford':['34','BellmanFord'],kruskal:['35','Kruskal'],'union-find':['36','UnionFind']};
export function compileWeightedFixture(kind) {
  const [chapter,name]=weightedFiles[kind];
  const dir=resolve('.cpp-build');mkdirSync(dir,{recursive:true});
  const path=resolve(dir,`graph-weighted-${chapter}`);
  const driver=`#include <iostream>
#include <sstream>
#include "${resolve(`cpp/chapter-${chapter}/${name}.hpp`)}"
using namespace chapter${chapter};
void val(int x){std::cout<<x;} void val(long long x){std::cout<<x;}
void val(const std::optional<long long>& x){if(x)std::cout<<*x;else std::cout<<"null";}
void val(const std::pair<long long,int>& x){std::cout<<"["<<x.first<<","<<x.second<<"]";}
template<class T>void val(const std::vector<T>& v){std::cout<<"[";bool comma=false;for(const auto& x:v){if(comma)std::cout<<",";comma=true;val(x);}std::cout<<"]";}
bool tracing=true;
void snapshot(const char* tag,const State& s){if(!tracing)return;std::cout<<tag<<"|[";
#define FIELD(x) val(s.x);std::cout<<",";
FIELD(distance) FIELD(pred) FIELD(predEdge) FIELD(settled) FIELD(queue) FIELD(order) FIELD(parent) FIELD(size) FIELD(path) FIELD(accepted) FIELD(rejected) FIELD(active) FIELD(edge) FIELD(candidate) FIELD(pass) FIELD(changed) FIELD(negative) FIELD(components) FIELD(total) FIELD(scans) FIELD(writes) FIELD(queueOps) FIELD(traversals)
val(s.answer);std::cout<<"]\\n";
}
int main(int argc,char** argv){try{if(argc<5)return 2;const int n=std::stoi(argv[1]);std::vector<std::string> labels;for(int i=0;i<n;++i)labels.push_back(std::string(1,static_cast<char>('A'+i)));
${kind==='union-find'?`tracing=false;UnionFind d(labels,snapshot);for(int i=5;i+1<argc;i+=2)d.unite(std::stoi(argv[i]),std::stoi(argv[i+1]));tracing=true;const std::string op=argv[2];const int a=std::stoi(argv[3]),b=std::stoi(argv[4]);if(op=="find")d.find(a);else if(op=="union")d.unite(a,b);else if(op=="connected")d.connected(a,b);else if(op=="make-set")d.make_set(std::string(1,static_cast<char>('A'+n)));else return 3;`:`Graph g{labels,{},std::stoi(argv[2])!=0};const int source=std::stoi(argv[3]);for(int i=5;i+2<argc;i+=3)g.edges.push_back({std::stoi(argv[i]),std::stoi(argv[i+1]),std::stoll(argv[i+2])});(void)source;(void)${kind==='dijkstra'?'dijkstra(std::move(g),source,snapshot)':kind==='bellman-ford'?'bellman_ford(std::move(g),source,snapshot)':'kruskal(std::move(g),snapshot)'};`}
}catch(const std::exception& e){std::cerr<<e.what();return 4;}}
`;
  writeFileSync(`${path}.cpp`,driver);
  execFileSync(process.env.CXX||'g++',['-std=c++20','-Wall','-Wextra','-Werror','-pedantic',`${path}.cpp`,'-o',path]);
  return path;
}
