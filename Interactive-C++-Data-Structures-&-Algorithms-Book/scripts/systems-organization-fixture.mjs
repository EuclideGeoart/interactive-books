import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
export function compileOrganizationFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'organization-native-'));
  const source = join(directory, 'fixture.cpp'), binary = join(directory, 'fixture');
  const includes = [[54,'SparseSet'],[56,'ECSStorage'],[57,'DirtyWorkList'],[58,'CommandBuffer']].map(([n,name]) => `#include "${resolve(`cpp/chapter-${n}/${name}.hpp`)}"`).join('\n');
  writeFileSync(source, includes + String.raw`
#include <iostream>
#include <string>
template<class A> void array(const A& a) { std::cout << '['; bool first=true; for(auto v:a) { if(!first) std::cout << ','; first=false; std::cout << v; } std::cout << ']'; }
void start(const char* tag) { std::cout << tag << "|{"; }
void sparse(const char* tag, const chapter54::State& s) {
 start(tag); std::cout << "\"sparse\":"; array(s.sparse); std::cout << ",\"dense\":"; array(s.dense);
 std::cout << ",\"active\":" << s.active << ",\"index\":" << s.index << ",\"moved\":" << s.moved << ",\"lookups\":" << s.lookups << ",\"moves\":" << s.moves << ",\"writes\":" << s.writes << ",\"pending\":" << s.pending << ",\"broken\":" << s.broken << ",\"found\":" << s.found << "}\n";
}
void pool(const chapter56::Pool& p) { std::cout << "{\"sparse\":"; array(p.sparse); std::cout << ",\"dense\":"; array(p.dense); std::cout << ",\"values\":"; array(p.values); std::cout << '}'; }
void ecs(const char* tag, const chapter56::State& s) {
 start(tag); std::cout << "\"slots\":["; for(int i=0;i<8;++i) { if(i)std::cout<<','; std::cout << "{\"generation\":" << s.slots[i].generation << ",\"alive\":" << s.slots[i].alive << '}'; }
 std::cout << "],\"position\":"; pool(s.position); std::cout << ",\"velocity\":"; pool(s.velocity);
 std::cout << ",\"active\":" << s.active << ",\"pool\":" << s.pool << ",\"index\":" << s.index << ",\"moved\":" << s.moved << ",\"validations\":" << s.validations << ",\"probes\":" << s.probes << ",\"updates\":" << s.updates << ",\"pending\":" << s.pending << "}\n";
}
void dirty(const char* tag, const chapter57::State& s) {
 start(tag); std::cout << "\"current\":"; array(s.current); std::cout << ",\"next\":"; array(s.next); std::cout << ",\"processed\":"; array(s.processed); std::cout << ",\"current_flags\":"; array(s.current_flags); std::cout << ",\"next_flags\":"; array(s.next_flags);
 std::cout << ",\"cursor\":" << s.cursor << ",\"wave\":" << s.wave << ",\"active\":" << s.active << ",\"marks\":" << s.marks << ",\"dedupes\":" << s.dedupes << ",\"visits\":" << s.visits << ",\"processing\":" << s.processing << ",\"broken\":" << s.broken << "}\n";
}
void handle(chapter58::Handle h) { std::cout << "{\"index\":" << h.index << ",\"generation\":" << h.generation << '}'; }
void commands(const char* tag, const chapter58::State& s) {
 start(tag); std::cout << "\"slots\":["; for(int i=0;i<8;++i) { if(i)std::cout<<','; std::cout << "{\"generation\":" << s.slots[i].generation << ",\"value\":"; if(s.slots[i].value) std::cout << *s.slots[i].value; else std::cout << "null"; std::cout << '}'; }
 std::cout << "],\"commands\":["; bool first=true; for(auto c:s.commands) { if(!first)std::cout<<',';first=false;std::cout << "{\"kind\":" << static_cast<int>(c.kind) << ",\"target\":";handle(c.target);std::cout << ",\"value\":" << c.value << '}'; }
 std::cout << "],\"reports\":["; first=true; for(auto r:s.reports) { if(!first)std::cout<<',';first=false;std::cout << "{\"command\":" << r.command << ",\"code\":" << r.code << ",\"handle\":";handle(r.handle);std::cout << '}'; }
 std::cout << "],\"cursor\":" << s.cursor << ",\"recorded\":" << s.recorded << ",\"executed\":" << s.executed << ",\"failures\":" << s.failures << ",\"validations\":" << s.validations << ",\"flushing\":" << s.flushing << "}\n";
}
int main(int argc, char** argv) {
 try {
  if(argc<8)return 2; std::cout << std::boolalpha;
  const std::string kind=argv[1], op=argv[2]; const int id=std::stoi(argv[3]), gen=std::stoi(argv[4]), value=std::stoi(argv[5]), p=std::stoi(argv[6]), waves=std::stoi(argv[7]);
  std::vector<int> ids; for(int i=8;i<argc;++i)ids.push_back(std::stoi(argv[i]));
  if(kind=="sparse") {
   chapter54::SparseSet s(sparse);for(int v:ids)s.insert(v);
   if(op=="insert")s.insert(id);else if(op=="contains")s.contains(id);else if(op=="iterate")s.iterate();else if(op=="remove"||op=="stale"){s.erase(id);if(op=="stale")s.contains(id);}else if(op=="break-map")s.break_mapping(id);else if(op=="break-duplicate")s.break_duplicate(id);else return 2;
  } else if(kind=="ecs") {
   chapter56::Registry r(ecs);for(int i=0;i<3;++i)r.create();for(int i=0;i<3;++i)r.add({i,1},0,(i+1)*10);r.add({0,1},1,1);r.add({2,1},1,3);
   chapter56::Handle h{id,gen};if(op=="query")r.tick();else if(op=="add")r.add(h,p,value);else if(op=="remove")r.remove(h,p);else if(op=="destroy")r.destroy(h);else if(op=="reuse"){r.destroy(h);r.create();r.add(h,p,value);}else return 2;
  } else if(kind=="dirty") {
   chapter57::DirtyWorkList w(dirty);for(int v:ids)w.mark(v);
   if(op=="mark")w.mark(id);else if(op=="clear")w.clear();else if(op=="break-duplicate")w.break_duplicate(id);else if(op=="break-flag")w.break_flag(id);
   else if(op=="wave"||op=="repeat")for(int i=0;i<waves && w.begin_wave();++i){while(w.process_one()){if(w.state().cursor==1||op=="repeat"){const int target=op=="repeat"?w.state().active:id;w.mark(target);w.mark(target);}}w.finish_wave();}else return 2;
  } else if(kind=="commands") {
   using namespace chapter58;CommandBuffer b(commands);std::vector<Command> log;
   if(op=="ordered"||op=="record"||op=="replay")log={{Kind::Create,{},11},{Kind::Move,{1,1},value},{Kind::Delete,{0,1},0},{Kind::Move,{0,1},value},{Kind::Create,{},22},{Kind::Move,{0,2},value}};
   else if(op=="stale")log={{Kind::Delete,{id,gen},0},{Kind::Move,{id,gen},value},{Kind::Create,{},value}};
   else if(op=="move")log={{Kind::Move,{id,gen},value}};else if(op=="full")for(int i=0;i<9;++i)log.push_back({Kind::Create,{},value});else return 2;
   for(auto c:log)b.record(c);if(op!="record")b.flush();
  } else return 2;
 } catch(const std::exception& e) {std::cerr << e.what();return 1;}
}
`);
  execFileSync('c++', ['-std=c++20', '-Wall', '-Wextra', '-Werror', '-Wno-misleading-indentation', '-pedantic', source, '-o', binary]);
  return binary;
}
