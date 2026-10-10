#include "Octree.hpp"
#include <cassert>
#include <iostream>
int main() {
  using namespace chapter62;
  const std::vector<Point> points{{"A",{0,0,-3}},{"B",{0,0,3}},{"C",{0,0,3}},{"D",{8,8,8}}};
  Options o; o.capacity = 1; o.maxDepth = 3; o.query = {-1,-1,1,1,2,4};
  const auto s = run(points,"range",o);
  assert((s.result == std::vector<std::string>{"B","C"}));
  assert(s.pending.empty());
  assert(std::count(s.nodes[0].children.begin(),s.nodes[0].children.end(),-1) > 0);
  for (const auto& n : s.nodes) assert(n.depth <= 3 && (n.leaf || n.children.size() == 8));
  assert(run({},"build").nodes.size() == 1);
  std::cout << "Octree: real z separation, sparse octants, depth guard and duplicate points passed.\n";
}
