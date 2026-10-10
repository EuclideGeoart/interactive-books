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

namespace chapter64 {
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
// @region rtree
// @begin rtree
class RTree {
  State s; int capacity; Observer observe;
  void emit(const char* tag) const { if(observe) observe(tag,s); }
  double area(AABB b) const { return (b.maxX-b.minX)*(b.maxY-b.minY); }
  AABB bounds(int id) const {
    const auto& n=s.nodes.at(id);
    if(!n.children.empty()) { AABB b=s.nodes[n.children[0]].bounds; for(int c:n.children) b=unite(b,s.nodes[c].bounds); return b; }
    AABB b=s.objects.at(n.items.at(0)).bounds; for(int i:n.items) b=unite(b,s.objects[i].bounds); return b;
  }
  int node(std::vector<int> items,std::vector<int> children,int parent) {
    const int id=static_cast<int>(s.nodes.size()); s.nodes.push_back({parent,{},std::move(children),std::move(items)});
    s.nodes[id].bounds=bounds(id); for(int c:s.nodes[id].children) s.nodes[c].parent=id; return id;
  }
  void update(int id) { s.nodes[id].bounds=bounds(id); ++s.updates; // @trace rt.bounds
    emit("rt.bounds"); }
  int descend(int id,int item) {
    if(!s.nodes[id].children.empty()) {
      const auto score=[&](int c) { const auto b=s.nodes[c].bounds; return std::tuple{area(unite(b,s.objects[item].bounds))-area(b),area(b),c}; };
      int chosen=*std::min_element(s.nodes[id].children.begin(),s.nodes[id].children.end(),[&](int a,int b){return score(a)<score(b);}); // @trace rt.choose
      emit("rt.choose");
      int sibling=descend(chosen,item); if(sibling>=0) s.nodes[id].children.push_back(sibling);
    } else { s.nodes[id].items.push_back(item); // @trace rt.append
      emit("rt.append"); }
    update(id);
    const bool internal=!s.nodes[id].children.empty();
    auto entries=internal?s.nodes[id].children:s.nodes[id].items;
    if(static_cast<int>(entries.size())<=capacity) return -1;
    // ponytail: x-center median is deterministic, not an R*-tree optimization.
    const auto key=[&](int i) { return std::pair{center(internal?s.nodes[i].bounds:s.objects[i].bounds,0),internal?"N"+std::to_string(i):s.objects[i].id}; };
    std::sort(entries.begin(),entries.end(),[&](int a,int b){return key(a)<key(b);});
    const auto mid=entries.begin()+static_cast<std::ptrdiff_t>(entries.size()/2);
    std::vector<int> left(entries.begin(),mid),right(mid,entries.end());
    if(internal) s.nodes[id].children=left; else s.nodes[id].items=left;
    int sibling=node(internal?std::vector<int>{}:right,internal?right:std::vector<int>{},s.nodes[id].parent);
    s.nodes[id].bounds=bounds(id); // @trace rt.split
    emit("rt.split"); return sibling;
  }
  void visit(int id,AABB query) {
    ++s.visits; ++s.tests; // @trace rt.visit
    emit("rt.visit");
    if(!overlaps(s.nodes[id].bounds,query)) { ++s.prunes; // @trace rt.prune
      emit("rt.prune"); return; }
    for(int i:s.nodes[id].items) {
      ++s.tests; // @trace rt.test
      emit("rt.test");
      if(overlaps(s.objects[i].bounds,query)) { s.results.push_back(s.objects[i].id); // @trace rt.accept
        emit("rt.accept"); }
    }
    for(int c:s.nodes[id].children) visit(c,query);
  }
public:
  explicit RTree(int maximum=2,Observer observer={}):capacity(maximum),observe(std::move(observer)) {
    if(capacity<2 || capacity>6) throw std::invalid_argument("capacity 2..6");
  }
  const State& state() const { return s; }
  void insert(Object object) {
    validate(object.bounds);
    if(s.objects.size()>=16 || object.id.empty() || std::any_of(s.objects.begin(),s.objects.end(),[&](const Object& o){return o.id==object.id;})) throw std::invalid_argument("unique ID; at most 16 objects");
    int item=static_cast<int>(s.objects.size()); s.objects.push_back(std::move(object));
    if(s.root<0) { s.root=node({item},{},-1); // @trace rt.root
      emit("rt.root"); }
    else { const int old=s.root; const int sibling=descend(old,item);
      if(sibling>=0) { s.root=node({}, {old,sibling},-1); // @trace rt.grow
        emit("rt.grow"); }
    }
  }
  std::vector<std::string> query(AABB box) { validate(box); s.results.clear(); s.visits=s.tests=s.prunes=0; if(s.root>=0) visit(s.root,box); finish(); return s.results; }
  void finish() const { emit("rt.done"); } // @trace rt.done
};
// @end rtree
} // namespace chapter64
