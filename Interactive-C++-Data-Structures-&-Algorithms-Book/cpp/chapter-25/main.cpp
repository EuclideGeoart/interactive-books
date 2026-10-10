#include "Representations.hpp"
using namespace graph_representations;
int main() {
  Graph g{{"A", "B", "C", "D", "E"},
          {{0, 1, 1}, {0, 2, 1}, {1, 3, 1}, {1, 4, 1}},
          false};
  auto s = inspect(g);
  auto m = inspect(g, 0, true);
  assert(s.output == m.output);
  assert(m.scans == 5);
  assert(inspect(Graph{}).output.empty());

  bool rejected = false;
  try {
    initial(Graph{{"A"}, {{0, 1, 1}}, false});
  } catch (const std::invalid_argument &) {
    rejected = true;
  }
  assert(rejected);
}
