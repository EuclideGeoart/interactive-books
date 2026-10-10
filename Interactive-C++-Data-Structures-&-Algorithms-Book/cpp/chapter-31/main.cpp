#include "Components.hpp"
using namespace graph_components;
int main() {
  Graph g{{"A", "B", "C", "D", "E"},
          {{0, 1, 1}, {0, 2, 1}, {1, 3, 1}, {1, 4, 1}},
          false};
  g.labels.push_back("F");
  auto s = components(g);
  assert(s.launches == 2);
  assert(s.component == std::vector<int>({0, 0, 0, 0, 0, 1}));
  assert(components(Graph{}).output.empty());

  bool rejected = false;
  try {
    initial(Graph{{"A"}, {{0, 1, 1}}, false});
  } catch (const std::invalid_argument &) {
    rejected = true;
  }
  assert(rejected);
}
