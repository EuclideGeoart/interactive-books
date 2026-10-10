#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <functional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace chapter60 {
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
struct Cell { int x, y, bucket; std::vector<std::string> ids; };
struct State {
  std::vector<Point> points;
  std::vector<std::string> pending, result;
  std::vector<Cell> cells; std::array<std::vector<std::string>,7> buckets;
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
// @begin hash
// @region hash — full cell keys survive hash bucket collisions.
inline std::string key(int x,int y) { return std::to_string(x) + "," + std::to_string(y); }
inline int bucket(int x,int y) { return ((31*x + 17*y)%7 + 7)%7; }
inline void insert(State& s, const std::string& id, const Options& o, const Observer& observe) {
  const Vec p = point(s,id).point;
  const int x = static_cast<int>(std::floor(p.x/o.cellSize)), y = static_cast<int>(std::floor(p.y/o.cellSize)); // @trace hash.map
  const int b = bucket(x,y);
  emit(observe,"hash.map",s);
  auto c = std::find_if(s.cells.begin(),s.cells.end(),[&](const Cell& v){ return v.x == x && v.y == y; });
  if (c == s.cells.end()) {
    s.cells.push_back({x,y,b,{}}); c = s.cells.end()-1;
    s.buckets[b].push_back(key(x,y));
  }
  c->ids.push_back(id); // @trace hash.store
  placed(s,id);
  emit(observe,"hash.store",s);
}
inline void remove(State& s, const std::string& id, const Observer& observe) {
  (void)point(s,id); // rejects unknown IDs before changing membership
  auto c = std::find_if(s.cells.begin(),s.cells.end(),[&](const Cell& v){ return std::find(v.ids.begin(),v.ids.end(),id) != v.ids.end(); });
  std::erase(c->ids,id); // @trace hash.remove
  if (c->ids.empty()) { std::erase(s.buckets[c->bucket],key(c->x,c->y)); s.cells.erase(c); }
  std::erase_if(s.points,[&](const Point& p){ return p.id == id; });
  emit(observe,"hash.remove",s);
}
inline void range(State& s, AABB query, const Options& o, const Observer& observe) {
  emit(observe,"hash.query",s); // @trace hash.query
  for (int x = static_cast<int>(std::floor(query.minX/o.cellSize)); x <= static_cast<int>(std::floor(query.maxX/o.cellSize)); ++x) {
    for (int y = static_cast<int>(std::floor(query.minY/o.cellSize)); y <= static_cast<int>(std::floor(query.maxY/o.cellSize)); ++y) {
      ++s.counts.visits; // @trace hash.cell
      emit(observe,"hash.cell",s);
      for (const auto& candidate : s.buckets[bucket(x,y)]) {
        ++s.counts.keyComparisons; // @trace hash.key
        emit(observe,"hash.key",s);
        if (candidate != key(x,y)) continue;
        const auto c = std::find_if(s.cells.begin(),s.cells.end(),[&](const Cell& v){ return key(v.x,v.y) == candidate; });
        for (const auto& id : c->ids) {
          ++s.counts.tests; // @trace hash.test
          emit(observe,"hash.test",s);
          if (contains(query,point(s,id).point)) {
            if (std::find(s.result.begin(),s.result.end(),id) == s.result.end()) s.result.push_back(id); // @trace hash.accept
            emit(observe,"hash.accept",s);
          }
        }
        break;
      }
    }
  }
}
} // namespace detail
inline State run(std::vector<Point> points, const std::string& operation = "range", Options o = {}, Observer observe = {}) {
  detail::validate(points,o);
  if (operation != "build" && operation != "insert" && operation != "remove" && operation != "update" && operation != "range") throw std::invalid_argument("unknown hash operation");
  if (operation == "range") detail::validate(o.query);
  if (operation == "insert" || operation == "update") detail::validate(o.point);
  if (operation == "insert" && points.size() == 12) throw std::invalid_argument("at most 12 points after insertion");
  State s; s.points = std::move(points);
  for (const auto& p : s.points) s.pending.push_back(p.id);
  const auto initial = s.pending;
  for (const auto& id : initial) detail::insert(s,id,o,observe);
  if (operation == "remove" || operation == "update") detail::remove(s,o.target,observe);
  if (operation == "insert" || operation == "update") {
    std::string id = o.target;
    if (operation == "insert") for (char c = 'A'; c <= 'Z'; ++c) {
      id = std::string(1,c);
      if (std::none_of(s.points.begin(),s.points.end(),[&](const Point& p){ return p.id == id; })) break;
    }
    s.points.push_back({id,o.point}); s.pending.push_back(id); detail::insert(s,id,o,observe);
  }
  if (operation == "range") detail::range(s,o.query,o,observe);
  std::sort(s.result.begin(),s.result.end());
  detail::emit(observe,"hash.done",s); // @trace hash.done
  return s;
}
// @end hash
} // namespace chapter60
