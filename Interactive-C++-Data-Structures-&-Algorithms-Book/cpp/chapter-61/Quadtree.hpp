#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <functional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace chapter61 {
// Finite teaching domain [-8,8]; closed bounds, including zero-extent queries.
struct Vec { double x = 0, y = 0, z = 0; };
using Vec2 = Vec;
struct AABB { double minX = -8, minY = -8, maxX = 8, maxY = 8, minZ = 0, maxZ = 0; };
using AABB2 = AABB;
struct Point { std::string id; Vec point; };
struct Options {
  int cellSize = 4, capacity = 2, maxDepth = 4;
  AABB query{-2,-2,3,3,0,0};
  Vec queryPoint{1,1,0}, point{1,1,0};
  std::string target = "A";
};
struct Counters { int visits = 0, tests = 0, prunes = 0, keyComparisons = 0, planeTests = 0; };
struct Node {
  int id = 0, parent = -1, depth = 0;
  AABB bounds;
  std::vector<int> children;
  std::vector<std::string> ids;
  bool leaf = true;
  char axis = '\0'; double split = 0;
};
struct State {
  std::vector<Point> points;
  std::vector<std::string> pending, result;
  std::vector<Node> nodes;
  Counters counts;
  double best = -1, plane = -1;
};
// Observers receive exact statement boundaries. Copy if retaining a snapshot;
// do not mutate or reenter the run. Exceptions destroy the local run state.
using Observer = std::function<void(const char*, const State&)>;
namespace detail {
inline void coordinate(double v) {
  if (!std::isfinite(v) || v < -8 || v > 8) throw std::invalid_argument("coordinate outside finite [-8,8]");
}
inline void validate(Vec p) { coordinate(p.x); coordinate(p.y); coordinate(p.z); if (p.z != 0) throw std::invalid_argument("2D z must be zero"); }
inline void validate(AABB b) {
  validate(Vec{b.minX,b.minY,b.minZ}); validate(Vec{b.maxX,b.maxY,b.maxZ});
  if (b.minX > b.maxX || b.minY > b.maxY || b.minZ > b.maxZ) throw std::invalid_argument("reversed bounds");
}
inline bool contains(AABB b, Vec p) {
  return p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY && p.z >= b.minZ && p.z <= b.maxZ;
}
inline bool overlaps(AABB a, AABB b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}
inline const Point& point(const State& s, const std::string& id) {
  const auto found = std::find_if(s.points.begin(),s.points.end(),[&](const Point& p){ return p.id == id; });
  if (found == s.points.end()) throw std::invalid_argument("unknown point ID");
  return *found;
}
inline void placed(State& s, const std::string& id) { std::erase(s.pending,id); }
inline void validate(const std::vector<Point>& points, const Options& o) {
  if (points.size() > 12) throw std::invalid_argument("at most 12 points");
  if (o.cellSize < 1 || o.cellSize > 8 || o.capacity < 1 || o.capacity > 8 || o.maxDepth < 0 || o.maxDepth > 6) throw std::invalid_argument("invalid teaching parameters");
  std::vector<std::string> ids;
  for (const auto& p : points) {
    validate(p.point);
    if (p.id.size() != 1 || p.id[0] < 'A' || p.id[0] > 'Z' || std::find(ids.begin(),ids.end(),p.id) != ids.end()) throw std::invalid_argument("unique A..Z IDs required");
    ids.push_back(p.id);
  }
}
inline void emit(const Observer& observe, const char* tag, const State& s) { if (observe) observe(tag,s); }
// @begin quad
// @region quad — closed drawing bounds, unique high-side point ownership.
inline int make_node(State& s, AABB bounds, int parent, int depth) {
  const int id = static_cast<int>(s.nodes.size());
  s.nodes.push_back({id,parent,depth,bounds,{},{},true,'\0',0});
  return id;
}
inline int slot(AABB b, Vec p) {
  return static_cast<int>(p.x >= (b.minX+b.maxX)/2) + 2*static_cast<int>(p.y >= (b.minY+b.maxY)/2) ;
}
inline AABB child_bounds(AABB b, int slot) {
  const double x = (b.minX+b.maxX)/2, y = (b.minY+b.maxY)/2;
  AABB result{slot&1 ? x : b.minX, slot&2 ? y : b.minY, slot&1 ? b.maxX : x, slot&2 ? b.maxY : y,0,0};
  return result;
}
inline void insert(State& s, const std::string& id, int index, const Options& o, const Observer& observe) {
  emit(observe,"quad.route",s); // @trace quad.route
  if (!s.nodes[index].leaf) {
    const int childSlot = slot(s.nodes[index].bounds,point(s,id).point);
    if (s.nodes[index].children[childSlot] < 0) {
      const int child = make_node(s,child_bounds(s.nodes[index].bounds,childSlot),index,s.nodes[index].depth+1); // @trace quad.child
      s.nodes[index].children[childSlot] = child;
      emit(observe,"quad.child",s);
    }
    insert(s,id,s.nodes[index].children[childSlot],o,observe); return;
  }
  s.nodes[index].ids.push_back(id); // @trace quad.store
  placed(s,id);
  emit(observe,"quad.store",s);
  if (static_cast<int>(s.nodes[index].ids.size()) <= o.capacity) return;
  if (s.nodes[index].depth >= o.maxDepth) {
    emit(observe,"quad.limit",s); // @trace quad.limit
    return; // duplicates legally overflow a depth-limited leaf
  }
  const auto moving = s.nodes[index].ids;
  s.nodes[index].leaf = false; // @trace quad.split
  s.nodes[index].children.assign(4,-1);
  s.nodes[index].ids.clear(); s.pending.insert(s.pending.end(),moving.begin(),moving.end());
  for (int slot = 0; slot < 4; ++slot) {
    const int child = make_node(s,child_bounds(s.nodes[index].bounds,slot),index,s.nodes[index].depth+1);
    s.nodes[index].children[slot] = child;
  }
  emit(observe,"quad.split",s);
  for (const auto& moved : moving) {
    emit(observe,"quad.redistribute",s); // @trace quad.redistribute
    insert(s,moved,index,o,observe);
  }
}
inline void range_node(State& s, int index, AABB query, const Observer& observe) {
  ++s.counts.visits; // @trace quad.visit
  emit(observe,"quad.visit",s);
  if (!overlaps(s.nodes[index].bounds,query)) {
    ++s.counts.prunes; // @trace quad.prune
    emit(observe,"quad.prune",s); return;
  }
  for (const auto& id : s.nodes[index].ids) {
    ++s.counts.tests; // @trace quad.test
    emit(observe,"quad.test",s);
    if (contains(query,point(s,id).point)) {
      s.result.push_back(id); // @trace quad.accept
      emit(observe,"quad.accept",s);
    }
  }
  for (int child : s.nodes[index].children) if (child >= 0) range_node(s,child,query,observe);
}
} // namespace detail
inline State run(std::vector<Point> points, const std::string& operation = "range", Options o = {}, Observer observe = {}) {
  detail::validate(points,o);
  if (operation != "build" && operation != "insert" && operation != "range" && operation != "point") throw std::invalid_argument("unknown subdivision operation");
  if (operation == "point") {
    detail::validate(o.queryPoint); const Vec p = o.queryPoint; o.query = {p.x,p.y,p.x,p.y,p.z,p.z};
  }
  if (operation == "range" || operation == "point") detail::validate(o.query);
  if (operation == "insert") { detail::validate(o.point); if (points.size() == 12) throw std::invalid_argument("at most 12 points after insertion"); }
  State s; s.points = std::move(points);
  for (const auto& p : s.points) s.pending.push_back(p.id);
  const int root = detail::make_node(s,{},-1,0); // @trace quad.root
  detail::emit(observe,"quad.root",s);
  const auto initial = s.pending;
  for (const auto& id : initial) detail::insert(s,id,root,o,observe);
  if (operation == "insert") {
    std::string id;
    for (char c = 'A'; c <= 'Z'; ++c) {
      id = std::string(1,c);
      if (std::none_of(s.points.begin(),s.points.end(),[&](const Point& p){ return p.id == id; })) break;
    }
    s.points.push_back({id,o.point}); s.pending.push_back(id); detail::insert(s,id,root,o,observe);
  }
  if (operation == "range" || operation == "point") {
    detail::emit(observe,"quad.query",s); // @trace quad.query
    detail::range_node(s,root,o.query,observe);
  }
  std::sort(s.result.begin(),s.result.end());
  detail::emit(observe,"quad.done",s); // @trace quad.done
  return s;
}
// @end quad
} // namespace chapter61
