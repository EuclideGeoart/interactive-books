#include "Graph.hpp"
using namespace graph_fundamentals;
int main() {
  Graph g{{"A", "B", "C", "D", "E"},
          {{0, 1, 1}, {0, 2, 1}, {1, 3, 1}, {1, 4, 1}},
          false};
  auto s = inspect(g);
  assert(s.output == std::vector<int>({1, 2}));
  auto added = edit(g, "add-vertex", 0, 1, "F");
  assert(added.graph.labels.size() == 6);
  assert(inspect(Graph{}).output.empty());

  bool rejected = false;
  try {
    initial(Graph{{"A"}, {{0, 1, 1}}, false});
  } catch (const std::invalid_argument &) {
    rejected = true;
  }
  assert(rejected);
}
