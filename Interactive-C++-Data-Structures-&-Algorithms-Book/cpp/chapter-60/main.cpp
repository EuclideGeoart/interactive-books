#include "SpatialHash.hpp"
#include <cassert>
#include <iostream>
int main() {
  using namespace chapter60;
  const std::vector<Point> points{{"A",{-0.1,-0.1}},{"B",{0,0}},{"C",{8,8}},{"D",{0,0}}};
  Options o; o.query = {-1,-1,0,0};
  assert((run(points,"range",o).result == std::vector<std::string>{"A","B","D"}));
  o.target = "A"; o.point = {5,5};
  const auto moved = run(points,"update",o);
  assert(moved.points.front().id == "B" && moved.points.back().point.x == 5);
  assert(run(points,"remove",o).points.size() == 3);
  assert(run({},"range",o).result.empty());
  bool rejected = false; try { o.cellSize = 0; (void)run(points,"build",o); } catch (const std::invalid_argument&) { rejected = true; }
  assert(rejected);
  std::cout << "Spatial hash: negative cells, duplicate coordinates, range, update, removal, empty and guards passed.\n";
}
