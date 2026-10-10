#include "Quadtree.hpp"
#include <cassert>
#include <iostream>
int main() {
  using namespace chapter61;
  const std::vector<Point> points{{"A",{0,0}},{"B",{0,0}},{"C",{8,8}},{"D",{-8,-8}}};
  Options o; o.capacity = 1; o.maxDepth = 3; o.query = {0,0,0,0};
  const auto s = run(points,"range",o);
  assert((s.result == std::vector<std::string>{"A","B"}));
  assert(s.pending.empty());
  for (const auto& n : s.nodes) assert(n.depth <= 3 && (n.leaf || n.children.size() == 4));
  assert(run({},"build").nodes.size() == 1);
  assert(run(points,"insert",o).points.size() == 5);
  std::cout << "Quadtree: closed boundaries, duplicates, max-depth overflow, four children and insertion passed.\n";
}
