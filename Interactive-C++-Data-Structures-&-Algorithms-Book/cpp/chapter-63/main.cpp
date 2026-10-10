#include "KDTree.hpp"
#include <cassert>
#include <iostream>
int main() {
  using namespace chapter63;
  const std::vector<Point> points{{"A",{-1,0}},{"B",{1,0}},{"C",{5,5}},{"D",{6,6}}};
  Options o; o.queryPoint = {0,0};
  const auto nearest = run(points,"nearest",o);
  assert((nearest.result == std::vector<std::string>{"A"}) && nearest.best == 1);
  assert(nearest.counts.planeTests > 0);
  o.queryPoint = {1,0}; assert((run(points,"point",o).result == std::vector<std::string>{"B"}));
  assert(run({},"nearest",o).result.empty());
  assert(run(points,"build",o).pending.empty());
  std::cout << "KD-tree: median build, point lookup, plane comparisons, ID ties and empty query passed.\n";
}
