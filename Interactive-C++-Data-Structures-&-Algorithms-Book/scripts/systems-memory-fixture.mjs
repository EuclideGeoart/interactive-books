import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function compileMemoryFixture() {
  const directory = mkdtempSync(join(tmpdir(),'systems-memory-'));
  const source = join(directory,'fixture.cpp'), binary = join(directory,'fixture');
  writeFileSync(source, `
#include "${resolve('cpp/chapter-51/FreeListStorage.hpp')}"
#include "${resolve('cpp/chapter-52/ByteArena.hpp')}"
#include "${resolve('cpp/chapter-53/ObjectPool.hpp')}"
#include "${resolve('cpp/chapter-55/HandleRegistry.hpp')}"
#include <iostream>
#include <iomanip>
#include <sstream>
#include <string>
void json(std::size_t v) { std::cout << v; }
void json(unsigned v) { std::cout << v; }
void json(int v) { std::cout << v; }
void json(bool v) { std::cout << (v ? "true" : "false"); }
void json(const std::optional<int>& v) { if(v) json(*v); else std::cout << "null"; }
void json(chapter53::Life v) { std::cout << std::quoted(std::array{"free","reserved","live","destroyed"}[static_cast<int>(v)]); }
void json(const chapter52::ByteArena::Block&);
void json(const chapter55::HandleRegistry<>::Slot&);
template<class T, std::size_t N> void json(const std::array<T,N>& values) { std::cout << '['; bool first=true; for(const auto& value:values) { if(!first) std::cout << ','; first=false; json(value); } std::cout << ']'; }
template<class T> void json(const std::vector<T>& values) { std::cout << '['; bool first=true; for(const auto& value:values) { if(!first) std::cout << ','; first=false; json(value); } std::cout << ']'; }
#define FIELD(name) std::cout << std::quoted(#name) << ':'; json(s.name)
#define NEXT(name) std::cout << ','; FIELD(name)
void json(const chapter51::FreeListStorage<>::Snapshot& s) { std::cout << '{'; FIELD(head); NEXT(next); NEXT(free); NEXT(pending); NEXT(reads); NEXT(writes); std::cout << '}'; }
void json(const chapter52::ByteArena::Block& s) { std::cout << '{'; FIELD(begin); NEXT(size); NEXT(alignment); NEXT(padding); std::cout << '}'; }
void json(const chapter52::ByteArena::Snapshot& s) { std::cout << '{'; FIELD(offset); NEXT(padding); NEXT(allocations); NEXT(resets); NEXT(candidate); NEXT(requested); NEXT(alignment); NEXT(blocks); std::cout << '}'; }
struct Point { int value; explicit Point(int v) : value(v) { if(v == -1000) throw std::runtime_error("constructor failed"); } };
void json(const chapter53::ObjectPool<Point>::Snapshot& s) { std::cout << '{'; FIELD(life); NEXT(next); NEXT(head); NEXT(constructions); NEXT(destructions); NEXT(rollbacks); std::cout << '}'; }
void json(const chapter55::Handle& s) { std::cout << '{'; FIELD(index); NEXT(generation); std::cout << '}'; }
void json(const chapter55::HandleRegistry<>::Slot& s) { std::cout << '{'; FIELD(generation); NEXT(alive); NEXT(retired); NEXT(next); NEXT(value); std::cout << '}'; }
void json(const chapter55::HandleRegistry<>::Snapshot& s) { std::cout << '{'; FIELD(slots); NEXT(head); NEXT(validations); NEXT(reuses); NEXT(checked); NEXT(valid); std::cout << '}'; }
template<class S> void observe(std::string_view tag,const S& s) { std::cout << '[' << std::quoted(std::string(tag)) << ','; json(s); std::cout << "]\\n"; }
template<class F> void attempt(F function) { try { function(); } catch(const std::exception&) {} }
int main(int argc,char** argv) {
  if(argc < 3) return 2;
  const std::string kind=argv[1], operation=argv[2];
  const int count=argc>3 ? std::stoi(argv[3]):3;
  const std::size_t index=argc>4 ? static_cast<std::size_t>(std::stoi(argv[4])):0;
  if(kind=="free-list") {
    using P=chapter51::FreeListStorage<>; P p(observe<P::Snapshot>);
    for(int i=0;i<count;++i) p.acquire();
    if(operation=="reuse") { attempt([&]{p.release(index);}); attempt([&]{p.acquire();}); }
    if(operation=="double-release") { attempt([&]{p.release(index);}); attempt([&]{p.release(index);}); }
    if(operation=="exhaustion") for(int i=count;i<=6;++i) attempt([&]{p.acquire();});
  } else if(kind=="arena") {
    using P=chapter52::ByteArena; P p(observe<P::Snapshot>);
    if(operation=="exhaustion") { p.allocate(64,1); attempt([&]{p.allocate(1,1);}); }
    else {
      std::vector<std::pair<std::size_t,std::size_t>> requests; std::stringstream input(argc>5 ? argv[5]:"5:1,8:4,7:8"); std::string token;
      while(std::getline(input,token,',')) { const auto split=token.find(':'); requests.emplace_back(std::stoul(token.substr(0,split)),std::stoul(token.substr(split+1))); }
      for(auto [size,alignment]:requests) attempt([&]{p.allocate(size,alignment);});
      if(operation=="reset") { p.reset(); attempt([&]{p.allocate(requests[0].first,requests[0].second);}); }
    }
  } else if(kind=="object-pool") {
    using P=chapter53::ObjectPool<Point>; P p(observe<P::Snapshot>); const int value=argc>5 ? std::stoi(argv[5]):42;
    if(operation=="rollback") { const auto i=p.reserve(); attempt([&]{p.construct(i,-1000);}); p.construct(p.reserve(),value); }
    else {
      for(int n=0;n<count;++n) p.construct(p.reserve(),value);
      if(operation=="lifecycle") { attempt([&]{p.destroy(index);}); attempt([&]{p.return_slot(index);}); attempt([&]{p.construct(p.reserve(),value);}); }
      if(operation=="double-release") { attempt([&]{p.destroy(index);}); attempt([&]{p.return_slot(index);}); attempt([&]{p.return_slot(index);}); }
      if(operation=="exhaustion") { for(int n=count;n<6;++n) p.construct(p.reserve(),value); attempt([&]{p.reserve();}); }
    }
  } else if(kind=="handles") {
    using P=chapter55::HandleRegistry<>; P p(3,observe<P::Snapshot>);
    if(operation=="exhaustion") { for(int n=0;n<7;++n) attempt([&]{p.create(42+n);}); }
    else {
      const auto old=p.create(42);
      if(operation=="validate") p.contains({index,static_cast<unsigned>(argc>5 ? std::stoi(argv[5]):1)});
      else if(operation=="retire") { auto h=old; for(int n=0;n<count;++n) { p.destroy(h); h=p.create(43+n); } p.contains(old); p.contains(h); }
      else { p.destroy(old); if(operation=="double-destroy") p.destroy(old); const auto replacement=p.create(99); p.contains(old); p.contains(replacement); }
    }
  } else return 2;
}
`);
  execFileSync('g++',['-std=c++20','-Wall','-Wextra','-Werror','-pedantic',source,'-o',binary]);
  return { binary, cleanup: () => rmSync(directory,{recursive:true,force:true}) };
}

export function validateMemoryNative({ sanitize = false } = {}) {
  const directory = mkdtempSync(join(tmpdir(),'systems-memory-native-'));
  try {
    for (const chapter of [51,52,53,55]) {
      const binary = join(directory,`chapter-${chapter}`);
      execFileSync('g++',['-std=c++20','-Wall','-Wextra','-Werror','-pedantic',...(sanitize ? ['-fsanitize=address,undefined','-fno-omit-frame-pointer','-fno-pie','-no-pie'] : []),resolve(`cpp/chapter-${chapter}/main.cpp`),'-o',binary]);
      process.stdout.write(execFileSync(binary,{encoding:'utf8'}));
    }
  } finally { rmSync(directory,{recursive:true,force:true}); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) validateMemoryNative({sanitize:process.argv.includes('--sanitize')});
