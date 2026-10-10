#include "Directed.hpp"
using namespace graph_directed;
int main() {
  Graph g{{"A", "B", "C", "D", "E"},
          {{0, 1, 1}, {0, 2, 1}, {1, 3, 1}, {1, 4, 1}},
          false};
  g.directed = true;
  auto s = bfs(g, 4);
  assert(s.output == std::vector<int>({4}));
  assert(inspect(g, 0).output == std::vector<int>({1, 2}));
  assert(bfs(Graph{}).output.empty());

  bool rejected = false;
  try {
    initial(Graph{{"A"}, {{0, 1, 1}}, false});
  } catch (const std::invalid_argument &) {
    rejected = true;
  }
  assert(rejected);
}
