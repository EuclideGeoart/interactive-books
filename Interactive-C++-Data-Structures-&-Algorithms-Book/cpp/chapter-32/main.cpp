#include "Cycles.hpp"
using namespace graph_cycle;
int main() {
  Graph g{{"A", "B", "C", "D", "E"},
          {{0, 1, 1}, {0, 2, 1}, {1, 3, 1}, {1, 4, 1}},
          false};
  auto s = dfs(g, 0, true, true);
  assert(!s.cycle);
  g.edges.push_back({3, 0, 1});
  assert(dfs(g, 0, true, true).cycle);
  g.directed = true;
  assert(dfs(g, 0, true, true).cycle);
  assert(dfs(Graph{}).output.empty());
  Graph loop{{"A"}, {{0, 0, 1}}, false};
  assert(dfs(loop, 0, true, true).cycle);
  loop.directed = true;
  assert(dfs(loop, 0, true, true).cycle);
  bool rejected = false;
  try {
    initial(Graph{{"A"}, {{0, 1, 1}}, false});
  } catch (const std::invalid_argument &) {
    rejected = true;
  }
  assert(rejected);
}
