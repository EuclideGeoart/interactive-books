#include "../chapter-64/RTree.hpp"
#include "../chapter-65/BVH.hpp"
#include "../chapter-66/BroadPhase.hpp"
#include <cassert>
#include <iostream>
#include <limits>
#include <random>

// Independent interval oracle: deliberately does not call header overlap helpers.
template<class Box> bool oracle(Box a,Box b) {
  return !(a.maxX<b.minX || b.maxX<a.minX || a.maxY<b.minY || b.maxY<a.minY);
}
template<class State> void hierarchy(const State& s,int capacity=0) {
  if(s.objects.empty()) { assert(s.root==-1 && s.nodes.empty()); return; }
  assert(s.root>=0 && s.nodes[s.root].parent==-1);
  std::vector<int> seen(s.objects.size()); std::set<int> depths; std::set<int> reachable;
  const auto walk=[&](auto&& self,int id,int depth)->void {
    assert(reachable.insert(id).second); const auto& n=s.nodes[id];
    if(capacity) { const int count=static_cast<int>(n.children.empty()?n.items.size():n.children.size()); assert(count<=capacity); assert(count>=(id==s.root?(n.children.empty()?1:2):(capacity+1)/2)); }
    else assert(n.children.empty()?n.items.size()==1:n.children.size()==2 && n.items.empty());
    const auto encloses=[&](auto b){assert(n.bounds.minX<=b.minX && n.bounds.minY<=b.minY && n.bounds.maxX>=b.maxX && n.bounds.maxY>=b.maxY);};
    for(int c:n.children) {assert(s.nodes[c].parent==id);encloses(s.nodes[c].bounds);self(self,c,depth+1);}
    for(int i:n.items) {++seen[i];encloses(s.objects[i].bounds);}
    if(n.children.empty()) depths.insert(depth);
  };
  walk(walk,s.root,0); assert(reachable.size()==s.nodes.size());
  for(int n:seen) assert(n==1);
  if(capacity) assert(depths.size()==1);
}
template<class Tree,class Box> void query_check(Tree& tree,Box q) {
  std::vector<std::string> want; for(const auto& o:tree.state().objects) if(oracle(o.bounds,q)) want.push_back(o.id);
  auto got=tree.query(q); std::sort(want.begin(),want.end()); std::sort(got.begin(),got.end()); assert(got==want);
}
template<class F> void rejects(F f) {bool rejected=false;try{f();}catch(const std::invalid_argument&){rejected=true;}assert(rejected);}
const std::vector<chapter64::Object> fixture{{"A",{-6,-6,-4,-4}},{"B",{-4,-4,-2,-2}},{"C",{-2,-2,0,0}},{"D",{0,0,2,2}},{"E",{2,2,4,4}},{"F",{4,4,6,6}},{"G",{-3,1,1,3}},{"H",{-1,-1,1,1}},{"I",{0,0,0,0}},{"J",{6,-6,8,-4}}};
template<class State> void dump(const State& s,const std::vector<std::string>& tags) {
  std::cout<<"root "<<s.root<<'\n';
  for(std::size_t i=0;i<s.nodes.size();++i) {const auto& n=s.nodes[i];std::cout<<"node N"<<i<<' '<<n.parent<<' '<<n.bounds.minX<<','<<n.bounds.minY<<','<<n.bounds.maxX<<','<<n.bounds.maxY<<" children";for(int c:n.children)std::cout<<" N"<<c;std::cout<<" items";for(int item:n.items)std::cout<<' '<<s.objects[item].id;std::cout<<'\n';}
  auto result=s.results;std::sort(result.begin(),result.end());std::cout<<"results";for(const auto& r:result)std::cout<<' '<<r;std::cout<<"\ncounts "<<s.visits<<' '<<s.tests<<' '<<s.prunes<<' '<<s.updates<<"\ntags";for(const auto& t:tags)std::cout<<' '<<t;std::cout<<'\n';
}
// Snapshot serialization compares the actual half-updated hierarchy after every tag.
// The scene fixture supplies pending objects not yet inserted in the native R-tree.
template<class State> void snapshot(const char* tag,const State& s) {
  std::cout<<"event "<<tag<<'\n';
  auto scene=fixture;
  for(const auto& o:s.objects) {
    auto found=std::find_if(scene.begin(),scene.end(),[&](const auto& p){return p.id==o.id;});
    chapter64::Object copy{o.id,{o.bounds.minX,o.bounds.minY,o.bounds.maxX,o.bounds.maxY}};
    if(found==scene.end()) scene.push_back(copy);else *found=copy;
  }
  for(const auto& o:scene)std::cout<<"object "<<o.id<<' '<<o.bounds.minX<<','<<o.bounds.minY<<','<<o.bounds.maxX<<','<<o.bounds.maxY<<'\n';
  dump(s,{});
}
void snapshot_grid(const char* tag,const chapter66::State& s,int dimension) {
  std::cout<<"event "<<tag<<'\n';
  for(const auto& o:s.objects){std::cout<<"object "<<o.id;for(int a=0;a<dimension;++a)std::cout<<' '<<o.bounds.min[a];for(int a=0;a<dimension;++a)std::cout<<' '<<o.bounds.max[a];std::cout<<'\n';}
  for(const auto& c:s.cells){std::cout<<"cell";for(int a=0;a<dimension;++a)std::cout<<' '<<c.coords[a];std::cout<<" items";for(int i:c.items)std::cout<<' '<<s.objects[i].id;std::cout<<'\n';}
  std::cout<<"candidates";for(const auto& p:s.candidates)std::cout<<' '<<p.first<<','<<p.second;
  std::cout<<"\nexact";for(const auto& p:s.exact)std::cout<<' '<<p.first<<','<<p.second;
  std::cout<<"\ncounts "<<s.memberships<<' '<<s.pair_attempts<<' '<<s.tests<<'\n';
}
int main(int argc,char** argv) {
  if(argc>=4 && (std::string(argv[1])=="--parity" || std::string(argv[1])=="--snapshots")) {
    const bool snapshots=std::string(argv[1])=="--snapshots";
    const std::string kind=argv[2],op=argv[3];std::vector<std::string> tags;
    if(kind=="r-tree") {chapter64::RTree t(argc>5?std::stoi(argv[5]):2,[&](const char* tag,const auto& state){tags.emplace_back(tag);if(snapshots)snapshot(tag,state);});for(auto o:fixture)t.insert(o);if(op=="insert")t.insert({"new",{1,1,3,3}});if(op=="query")t.query({-2,-2,3,3});else t.finish();if(!snapshots)dump(t.state(),tags);}
    else if(kind=="bvh") {std::vector<chapter65::Object> objects;for(auto o:fixture)objects.push_back({o.id,{o.bounds.minX,o.bounds.minY,o.bounds.maxX,o.bounds.maxY}});chapter65::BVH t(objects,[&](const char* tag,const auto& state){tags.emplace_back(tag);if(snapshots)snapshot(tag,state);});if(op=="query")t.query({-2,-2,3,3});else if(op=="refit" || op=="rebuild")t.move("A",{1,1,3,3},op=="rebuild");else t.finish();if(!snapshots)dump(t.state(),tags);}
    else {const int dimension=argc>4?std::stoi(argv[4]):2;std::vector<chapter66::Object> objects;int i=0;for(auto o:fixture){double z=i++%3-1;objects.push_back({o.id,{{o.bounds.minX,o.bounds.minY,z},{o.bounds.maxX,o.bounds.maxY,z+1}}});}auto s=chapter66::broad_phase(objects,dimension,4,op=="filter",[&](const char* tag,const auto& state){tags.emplace_back(tag);if(snapshots)snapshot_grid(tag,state,dimension);});if(snapshots)return 0;std::cout<<"candidates";for(const auto& p:s.candidates)std::cout<<' '<<p.first<<','<<p.second;std::cout<<"\nexact";for(const auto& p:s.exact)std::cout<<' '<<p.first<<','<<p.second;std::cout<<"\ncounts "<<s.memberships<<' '<<s.pair_attempts<<' '<<s.tests<<"\ntags";for(auto t:tags)std::cout<<' '<<t;std::cout<<'\n';}
    return 0;
  }
  std::mt19937 random(64066);
  for(int run=0;run<140;++run) {
    int count=run%17;std::vector<chapter65::Object> objects;chapter64::RTree tree(2+run%5);
    for(int i=0;i<count;++i) {double x=static_cast<int>(random()%15)-7,y=static_cast<int>(random()%15)-7;double w=random()%2,h=random()%2;std::string id=std::to_string(i);tree.insert({id,{x,y,x+w,y+h}});objects.push_back({id,{x,y,x+w,y+h}});hierarchy(tree.state(),2+run%5);}
    chapter65::BVH bvh(objects);hierarchy(bvh.state());
    for(int q=0;q<8;++q){double x=static_cast<int>(random()%13)-6,y=static_cast<int>(random()%13)-6;query_check(tree,chapter64::AABB{x,y,x+2,y+2});query_check(bvh,chapter65::AABB{x,y,x+2,y+2});}
    if(count){bvh.move("0",{-8,-8,8,8});hierarchy(bvh.state());query_check(bvh,chapter65::AABB{0,0,0,0});bvh.move("0",{-8,-8,8,8},true);hierarchy(bvh.state());query_check(bvh,chapter65::AABB{0,0,0,0});}
    for(int dim:{2,3}) {
      std::vector<chapter66::Object> boxes;for(const auto& o:objects){double z=static_cast<int>(random()%15)-7;boxes.push_back({o.id,{{o.bounds.minX,o.bounds.minY,z},{o.bounds.maxX,o.bounds.maxY,z+1}}});}
      auto s=chapter66::broad_phase(boxes,dim,1+run%8);std::set<chapter66::Pair> exact,candidates(s.candidates.begin(),s.candidates.end());
      for(std::size_t i=0;i<boxes.size();++i)for(std::size_t j=i+1;j<boxes.size();++j){bool hit=true;for(int a=0;a<dim;++a)if(boxes[i].bounds.max[a]<boxes[j].bounds.min[a] || boxes[j].bounds.max[a]<boxes[i].bounds.min[a])hit=false;if(hit)exact.insert(std::minmax(boxes[i].id,boxes[j].id));}
      assert(std::set<chapter66::Pair>(s.exact.begin(),s.exact.end())==exact);assert(s.tests==static_cast<int>(s.candidates.size()));assert(candidates.size()==s.candidates.size());for(const auto& p:exact)assert(candidates.contains(p));
    }
  }
  for(int count:{8,12,16}) {
    chapter64::RTree sorted(2);
    for(int i=0;i<count;++i)sorted.insert({std::string(1,static_cast<char>('A'+i)),{double(i-8),0,double(i-7),1}});
    hierarchy(sorted.state(),2);
    auto results=sorted.query({-8,-8,8,8});
    int height=0;for(const auto& node:sorted.state().nodes){int depth=0;for(int parent=node.parent;parent>=0;parent=sorted.state().nodes[parent].parent)++depth;height=std::max(height,depth);}
    const int nodes=count*(count-1)/2;
    assert(static_cast<int>(sorted.state().nodes.size())==nodes);
    assert(height==count-2 && sorted.state().visits==nodes && sorted.state().tests==nodes+count);
    assert(static_cast<int>(results.size())==count);
    std::cout<<"Sorted R-tree M=2: n="<<count<<" nodes="<<nodes<<" depth="<<height<<" full-query visits="<<sorted.state().visits<<'\n';
  }
  chapter64::RTree identical;for(int i=0;i<16;++i)identical.insert({std::to_string(i),{0,0,0,0}});hierarchy(identical.state(),2);assert(identical.query({0,0,0,0}).size()==16);
  rejects([]{chapter64::RTree bad(1);});rejects([]{chapter64::RTree t;t.insert({"A",{1,0,0,1}});});rejects([]{chapter65::BVH t({{"A",{0,0,1,1}},{"A",{0,0,1,1}}});});
  rejects([]{chapter65::BVH t({});t.move("missing",{0,0,1,1});});
  rejects([]{chapter66::broad_phase({{"A",{{-8,-8,-8},{8,8,8}}}},3,1);});
  rejects([]{chapter66::broad_phase({},4);});rejects([]{chapter66::broad_phase({},2,std::numeric_limits<double>::quiet_NaN());});
  rejects([]{chapter64::validate({0,0,std::numeric_limits<double>::infinity(),1});});
  std::cout<<"Spatial bounding validation: 140 deterministic scenes, exhaustive query/pair oracles, occupancy, refit/rebuild, guards passed\n";
}
