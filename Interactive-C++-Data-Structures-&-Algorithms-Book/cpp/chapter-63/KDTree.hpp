#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <functional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace chapter63 {
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
// @begin kd
// @region kd — median total order and nearest-neighbor plane pruning.
inline double axis_value(Vec p,char axis) { return axis == 'x' ? p.x : p.y; }
inline int build(State& s, std::vector<std::string> ids, AABB bounds, int parent, int depth, int side, const Observer& observe) {
  if (ids.empty()) return -1;
  const char axis = depth%2 ? 'y' : 'x';
  std::sort(ids.begin(),ids.end(),[&](const std::string& a,const std::string& b) {
    const double av = axis_value(point(s,a).point,axis), bv = axis_value(point(s,b).point,axis);
    return av < bv || (av == bv && a < b);
  });
  const auto mid = ids.size()/2; const std::string id = ids[mid];
  const double split = axis_value(point(s,id).point,axis);
  const int index = static_cast<int>(s.nodes.size());
  s.nodes.push_back({index,parent,depth,bounds,{-1,-1},{id},false,axis,split}); // @trace kd.median
  if (parent >= 0) s.nodes[parent].children[side] = index;
  placed(s,id);
  emit(observe,"kd.median",s);
  AABB low = bounds, high = bounds;
  if (axis == 'x') { low.maxX = split; high.minX = split; } else { low.maxY = split; high.minY = split; }
  const int left = build(s,{ids.begin(),ids.begin()+static_cast<std::ptrdiff_t>(mid)},low,index,depth+1,0,observe);
  s.nodes[index].children[0] = left;
  const int right = build(s,{ids.begin()+static_cast<std::ptrdiff_t>(mid)+1,ids.end()},high,index,depth+1,1,observe);
  s.nodes[index].children[1] = right;
  return index;
}
inline void range_node(State& s, int index, AABB query, const Observer& observe) {
  ++s.counts.visits; // @trace kd.visit
  emit(observe,"kd.visit",s);
  if (!overlaps(s.nodes[index].bounds,query)) {
    ++s.counts.prunes; // @trace kd.prune
    emit(observe,"kd.prune",s); return;
  }
  const auto& id = s.nodes[index].ids[0];
  ++s.counts.tests; // @trace kd.test
  emit(observe,"kd.test",s);
  if (contains(query,point(s,id).point)) {
    s.result.push_back(id); // @trace kd.accept
    emit(observe,"kd.accept",s);
  }
  for (int child : s.nodes[index].children) if (child >= 0) range_node(s,child,query,observe);
}
inline double distance_squared(Vec a,Vec b) { return (a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y); }
inline void nearest(State& s,int index,Vec query,const Observer& observe) {
  ++s.counts.visits; // @trace kd.nearVisit
  emit(observe,"kd.nearVisit",s);
  const Node& n = s.nodes[index]; // no allocation while traversing
  const auto& p = point(s,n.ids[0]);
  ++s.counts.tests; const double distance = distance_squared(p.point,query); // @trace kd.distance
  emit(observe,"kd.distance",s);
  if (s.best < 0 || distance < s.best || (distance == s.best && p.id < s.result[0])) {
    s.best = distance; s.result = {p.id}; // @trace kd.best
    emit(observe,"kd.best",s);
  }
  const double delta = axis_value(query,n.axis)-n.split;
  const int nearSide = delta < 0 ? 0 : 1, farSide = 1-nearSide;
  if (n.children[nearSide] >= 0) nearest(s,n.children[nearSide],query,observe);
  if (n.children[farSide] >= 0) {
    ++s.counts.planeTests; s.plane = delta*delta; // @trace kd.plane
    emit(observe,"kd.plane",s);
    if (s.plane <= s.best) nearest(s,n.children[farSide],query,observe);
    else { ++s.counts.prunes; // @trace kd.farPrune
      emit(observe,"kd.farPrune",s); }
  }
}
} // namespace detail
inline State run(std::vector<Point> points, const std::string& operation = "range", Options o = {}, Observer observe = {}) {
  detail::validate(points,o);
  if (operation != "build" && operation != "range" && operation != "point" && operation != "nearest") throw std::invalid_argument("unknown KD operation");
  if (operation == "point" || operation == "nearest") detail::validate(o.queryPoint);
  if (operation == "point") { const Vec p = o.queryPoint; o.query = {p.x,p.y,p.x,p.y,0,0}; }
  if (operation == "range" || operation == "point") detail::validate(o.query);
  State s; s.points = std::move(points);
  for (const auto& p : s.points) s.pending.push_back(p.id);
  detail::build(s,s.pending,{},-1,0,0,observe);
  if (operation != "build") {
    detail::emit(observe,"kd.query",s); // @trace kd.query
    if (!s.nodes.empty()) {
      if (operation == "nearest") detail::nearest(s,0,o.queryPoint,observe);
      else detail::range_node(s,0,o.query,observe);
    }
  }
  std::sort(s.result.begin(),s.result.end());
  detail::emit(observe,"kd.done",s); // @trace kd.done
  return s;
}
// @end kd
} // namespace chapter63
