#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <functional>
#include <map>
#include <set>
#include <stdexcept>
#include <string>
#include <tuple>
#include <utility>
#include <vector>

namespace chapter65 {
// Closed, finite bounds; zero extent and boundary touches are valid.
struct AABB { double minX, minY, maxX, maxY; };
struct Object { std::string id; AABB bounds; };
inline void validate(AABB b) {
  for (double x : {b.minX,b.minY,b.maxX,b.maxY})
    if (!std::isfinite(x) || std::abs(x)>8) throw std::invalid_argument("coordinates finite in [-8,8]");
  if (b.minX>b.maxX || b.minY>b.maxY) throw std::invalid_argument("reversed box");
}
inline bool overlaps(AABB a,AABB b) { return a.minX<=b.maxX && a.maxX>=b.minX && a.minY<=b.maxY && a.maxY>=b.minY; }
inline AABB unite(AABB a,AABB b) { return {std::min(a.minX,b.minX),std::min(a.minY,b.minY),std::max(a.maxX,b.maxX),std::max(a.maxY,b.maxY)}; }
inline double center(AABB b,int axis) { return axis==0 ? (b.minX+b.maxX)/2 : (b.minY+b.maxY)/2; }
inline void validate_objects(const std::vector<Object>& objects) {
  if (objects.size()>16) throw std::invalid_argument("at most 16 objects");
  std::set<std::string> ids;
  for (const auto& o:objects) { validate(o.bounds); if(o.id.empty() || !ids.insert(o.id).second) throw std::invalid_argument("unique nonempty IDs"); }
}
struct Node { int parent=-1; AABB bounds{}; std::vector<int> children,items; };
struct State { std::vector<Object> objects; std::vector<Node> nodes; int root=-1; std::vector<std::string> results; int visits=0,tests=0,prunes=0,updates=0; };
// Observer references live only during the callback. Copy to retain history;
// observers must be nonthrowing and nonreentrant. Algorithms work without one.
using Observer=std::function<void(const char*,const State&)>;
// @region bvh
// @begin bvh
class BVH {
  State s; Observer observe;
  void emit(const char* tag) const { if(observe) observe(tag,s); }
  AABB bounds(int id) const {
    const auto& n=s.nodes.at(id);
    if(!n.children.empty()) { AABB b=s.nodes[n.children[0]].bounds; for(int c:n.children) b=unite(b,s.nodes[c].bounds); return b; }
    AABB b=s.objects.at(n.items.at(0)).bounds; for(int i:n.items) b=unite(b,s.objects[i].bounds); return b;
  }
  void update(int id) { s.nodes[id].bounds=bounds(id); ++s.updates; // @trace bvh.bounds
    emit("bvh.bounds"); }
  int build(std::vector<int> items,int parent) {
    if(items.empty()) return -1;
    int id=static_cast<int>(s.nodes.size()); s.nodes.push_back({parent,{}, {},items}); s.nodes[id].bounds=bounds(id); // @trace bvh.node
    emit("bvh.node");
    if(items.size()>1) {
      std::array<double,2> extent{};
      for(int axis=0;axis<2;++axis) { double lo=center(s.objects[items[0]].bounds,axis),hi=lo; for(int i:items) {lo=std::min(lo,center(s.objects[i].bounds,axis));hi=std::max(hi,center(s.objects[i].bounds,axis));} extent[axis]=hi-lo; }
      int axis=extent[1]>extent[0]?1:0;
      std::sort(items.begin(),items.end(),[&](int a,int b){return std::pair{center(s.objects[a].bounds,axis),s.objects[a].id}<std::pair{center(s.objects[b].bounds,axis),s.objects[b].id};}); // @trace bvh.partition
      emit("bvh.partition");
      const auto mid=items.begin()+static_cast<std::ptrdiff_t>(items.size()/2);
      int left=build({items.begin(),mid},id),right=build({mid,items.end()},id);
      s.nodes[id].items.clear(); s.nodes[id].children={left,right}; update(id);
    }
    return id;
  }
  void visit(int id,AABB query) {
    ++s.visits; ++s.tests; // @trace bvh.visit
    emit("bvh.visit");
    if(!overlaps(s.nodes[id].bounds,query)) { ++s.prunes; // @trace bvh.prune
      emit("bvh.prune"); return; }
    for(int i:s.nodes[id].items) {
      ++s.tests; // @trace bvh.test
      emit("bvh.test");
      if(overlaps(s.objects[i].bounds,query)) { s.results.push_back(s.objects[i].id); // @trace bvh.accept
        emit("bvh.accept"); }
    }
    for(int c:s.nodes[id].children) visit(c,query);
  }
public:
  explicit BVH(std::vector<Object> objects,Observer observer={}):observe(std::move(observer)) {
    validate_objects(objects); s.objects=std::move(objects); std::vector<int> items; for(int i=0;i<static_cast<int>(s.objects.size());++i) items.push_back(i); s.root=build(items,-1);
  }
  const State& state() const { return s; }
  void move(const std::string& id,AABB box,bool rebuild=false) {
    validate(box); auto found=std::find_if(s.objects.begin(),s.objects.end(),[&](const Object& o){return o.id==id;}); if(found==s.objects.end()) throw std::invalid_argument("unknown object");
    int item=static_cast<int>(found-s.objects.begin()); found->bounds=box; // @trace bvh.move
    emit("bvh.move");
    if(rebuild) {
      s.nodes.clear(); s.root=-1; // @trace bvh.clear
      emit("bvh.clear");
      std::vector<int> items; for(int i=0;i<static_cast<int>(s.objects.size());++i) items.push_back(i); s.root=build(items,-1);
    } else {
      int leaf=-1; for(int i=0;i<static_cast<int>(s.nodes.size());++i) if(s.nodes[i].items==std::vector<int>{item}) leaf=i;
      for(int n=leaf;n>=0;n=s.nodes[n].parent) update(n);
    }
    finish();
  }
  std::vector<std::string> query(AABB box) { validate(box); s.results.clear(); s.visits=s.tests=s.prunes=0; if(s.root>=0) visit(s.root,box); finish(); return s.results; }
  void finish() const { emit("bvh.done"); } // @trace bvh.done
};
// @end bvh
} // namespace chapter65
