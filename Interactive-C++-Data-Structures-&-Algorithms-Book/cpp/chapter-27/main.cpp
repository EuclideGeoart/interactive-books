#include "DFS.hpp"
using namespace graph_dfs;
int main() {
  Graph g{{"A", "B", "C", "D", "E"},
          {{0, 1, 1}, {0, 2, 1}, {1, 3, 1}, {1, 4, 1}},
          false};
  auto s = dfs(g);
  assert(s.output == std::vector<int>({0, 1, 3, 4, 2}));
  assert(s.frames.empty());
  assert(dfs(Graph{}).output.empty());

  bool rejected = false;
  try {
    initial(Graph{{"A"}, {{0, 1, 1}}, false});
  } catch (const std::invalid_argument &) {
    rejected = true;
  }
  assert(rejected);
}
