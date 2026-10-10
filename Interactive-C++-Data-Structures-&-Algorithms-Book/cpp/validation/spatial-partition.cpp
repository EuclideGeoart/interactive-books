#include "../chapter-60/SpatialHash.hpp"
#include "../chapter-61/Quadtree.hpp"
#include "../chapter-62/Octree.hpp"
#include "../chapter-63/KDTree.hpp"
#include <cassert>
#include <iomanip>
#include <iostream>
#include <limits>
#include <random>
#include <sstream>

void strings(const std::vector<std::string>& values) {
  std::cout << '['; bool first = true;
  for (const auto& v : values) { if (!first) std::cout << ','; first = false; std::cout << '"' << v << '"'; }
  std::cout << ']';
}
void node_id(int id) { if (id < 0) std::cout << "null"; else std::cout << "\"n" << id << '"'; }
template<class State> void snapshot(const char* tag,const State& s) {
  std::cout << "[\"" << tag << "\",{\"points\":["; bool first = true;
  for (const auto& p : s.points) {
    if (!first) std::cout << ',';
    first = false;
    std::cout << "[\"" << p.id << "\"," << p.point.x << ',' << p.point.y << ',' << p.point.z << ']';
  }
  std::cout << "],\"pending\":"; strings(s.pending); std::cout << ",\"cells\":[";
  if constexpr (requires { s.cells; }) {
    first = true;
    for (const auto& c : s.cells) {
      if (!first) std::cout << ',';
      first = false;
      std::cout << '[' << c.x << ',' << c.y << ',' << c.bucket << ','; strings(c.ids); std::cout << ']';
    }
  }
  std::cout << "],\"nodes\":[";
  if constexpr (requires { s.nodes; }) {
    first = true;
    for (const auto& n : s.nodes) {
      if (!first) std::cout << ',';
      first = false;
      std::cout << '['; node_id(n.id); std::cout << ','; node_id(n.parent); std::cout << ',' << n.depth << ','; strings(n.ids); std::cout << ",[";
      bool firstChild = true;
      for (int child : n.children) { if (!firstChild) std::cout << ','; firstChild = false; node_id(child); }
      std::cout << "]," << (n.leaf ? "true" : "false") << ",\"";
      if (n.axis) std::cout << n.axis;
      std::cout << "\",";
      if (n.axis) std::cout << n.split; else std::cout << "null";
      const auto b = n.bounds;
      std::cout << ",[" << b.minX << ',' << b.minY << ',' << b.maxX << ',' << b.maxY << ',' << b.minZ << ',' << b.maxZ << "]]";
    }
  }
  std::cout << "],\"result\":"; strings(s.result);
  const auto c = s.counts;
  std::cout << ",\"counts\":[" << c.visits << ',' << c.tests << ',' << c.prunes << ',' << c.keyComparisons << ',' << c.planeTests << "],\"best\":";
  if (s.best < 0) std::cout << "null"; else std::cout << s.best;
  std::cout << ",\"plane\":";
  if (s.plane < 0) std::cout << "null"; else std::cout << s.plane;
  std::cout << "}]\n";
}

template<class Point,class Options,class Run> void fixture(const std::string& operation,Run run) {
  std::size_t size; Options o;
  if (!(std::cin >> size) || size > 12) throw std::invalid_argument("invalid fixture size");
  std::vector<Point> points(size);
  for (auto& p : points) std::cin >> p.id >> p.point.x >> p.point.y >> p.point.z;
  std::cin >> o.cellSize >> o.capacity >> o.maxDepth >> o.target;
  std::cin >> o.query.minX >> o.query.minY >> o.query.maxX >> o.query.maxY >> o.query.minZ >> o.query.maxZ;
  std::cin >> o.queryPoint.x >> o.queryPoint.y >> o.queryPoint.z >> o.point.x >> o.point.y >> o.point.z;
  if (!std::cin) throw std::invalid_argument("invalid fixture input");
  run(points,operation,o,[](const char* tag,const auto& s){ snapshot(tag,s); });
}
// Independent scan oracle: no production contains/overlaps/hash/split helper is called.
template<class Point,class Options,class Run> void oracle(Run run,int dimension,bool kd,bool hash) {
  std::mt19937 random(630062);
  for (int scene = 0; scene < 160; ++scene) {
    std::vector<Point> points;
    const int count = scene%13;
    for (int i = 0; i < count; ++i) {
      const auto coord = [&](){ return static_cast<double>(static_cast<int>(random()%33)-16)/2; };
      Point p; p.id = std::string(1,static_cast<char>('A'+i)); p.point = {coord(),coord(),dimension == 3 ? coord() : 0};
      if (scene%5 == 0) p.point = {0,0,0};
      points.push_back(p);
    }
    Options o; o.cellSize = 1+scene%8; o.capacity = 1+scene%4; o.maxDepth = scene%7;
    const auto low = [&](){ return static_cast<double>(static_cast<int>(random()%17)-8); };
    const double x = low(), y = low(), z = dimension == 3 ? low() : 0;
    o.query = {x,y,std::min(8.0,x+3),std::min(8.0,y+3),z,dimension == 3 ? std::min(8.0,z+3) : 0};
    std::vector<std::string> expected;
    for (const auto& p : points) if (p.point.x >= o.query.minX && p.point.x <= o.query.maxX && p.point.y >= o.query.minY && p.point.y <= o.query.maxY && p.point.z >= o.query.minZ && p.point.z <= o.query.maxZ) expected.push_back(p.id);
    assert(run(points,"range",o,{}).result == expected);
    if (kd) {
      o.queryPoint = {x,y,0}; std::string best; double distance = std::numeric_limits<double>::infinity();
      for (const auto& p : points) {
        const double dx = p.point.x-x, dy = p.point.y-y, candidate = dx*dx+dy*dy;
        if (candidate < distance || (candidate == distance && p.id < best)) { best = p.id; distance = candidate; }
      }
      const auto s = run(points,"nearest",o,{});
      assert(s.result == (best.empty() ? std::vector<std::string>{} : std::vector<std::string>{best}));
      if (!best.empty()) assert(s.best == distance);
    }
    if (hash && !points.empty()) {
      o.target = points.front().id; o.point = {7,-7,0};
      const auto moved = run(points,"update",o,{});
      assert(moved.points.back().point.x == 7 && moved.points.back().point.y == -7);
      assert(run(points,"remove",o,{}).points.size()+1 == points.size());
    }
    if (!kd && count < 12) assert(run(points,"insert",o,{}).points.size() == points.size()+1);
  }
  Options bad; bad.cellSize = 0; bool rejected = false;
  try { (void)run({},"build",bad,{}); } catch (const std::invalid_argument&) { rejected = true; }
  assert(rejected);
  Point p; p.id = "A"; p.point.x = std::numeric_limits<double>::quiet_NaN(); rejected = false;
  try { (void)run({p},"build",Options{},{}); } catch (const std::invalid_argument&) { rejected = true; }
  assert(rejected);
  const auto rejects = [&](const std::vector<Point>& values, const std::string& operation, Options options) {
    bool threw = false;
    try { (void)run(values,operation,options,{}); } catch (const std::invalid_argument&) { threw = true; }
    assert(threw);
  };
  Point valid; valid.id = "A";
  rejects({valid,valid},"build",Options{});
  valid.point.x = 9; rejects({valid},"build",Options{});
  rejects({},"unknown",Options{});
  Options reversed; reversed.query.minX = 4; reversed.query.maxX = -4;
  rejects({},"range",reversed);
  Options deep; deep.maxDepth = 7; rejects({},"build",deep);
  std::vector<Point> oversized(13);
  for (int i = 0; i < 13; ++i) oversized[i].id = std::string(1,static_cast<char>('A'+i));
  rejects(oversized,"build",Options{});
  if (hash) { Options absent; absent.target = "Z"; rejects({},"remove",absent); }
}
int main(int argc,char** argv) {
  std::cout << std::setprecision(17);
  try {
    if (argc == 2 && std::string(argv[1]) == "--self-test") {
      oracle<chapter60::Point,chapter60::Options>(chapter60::run,2,false,true);
      oracle<chapter61::Point,chapter61::Options>(chapter61::run,2,false,false);
      oracle<chapter62::Point,chapter62::Options>(chapter62::run,3,false,false);
      oracle<chapter63::Point,chapter63::Options>(chapter63::run,2,true,false);
      std::cout << "640 deterministic native scenes: independent range/nearest oracles, mutations and guards passed.\n";
      return 0;
    }
    if (argc != 3) throw std::invalid_argument("usage: fixture kind operation, or --self-test");
    const std::string kind = argv[1], operation = argv[2];
    if (kind == "spatial-hash") fixture<chapter60::Point,chapter60::Options>(operation,chapter60::run);
    else if (kind == "quadtree") fixture<chapter61::Point,chapter61::Options>(operation,chapter61::run);
    else if (kind == "octree") fixture<chapter62::Point,chapter62::Options>(operation,chapter62::run);
    else if (kind == "kd-tree") fixture<chapter63::Point,chapter63::Options>(operation,chapter63::run);
    else throw std::invalid_argument("unknown kind");
  } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
