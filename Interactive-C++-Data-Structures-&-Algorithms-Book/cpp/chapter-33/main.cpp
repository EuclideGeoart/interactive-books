#include "Dijkstra.hpp"
#include <cassert>
using namespace chapter33;
int main() {
  Graph g{{"A", "B", "C", "D", "E"},
          {{0, 1, 9}, {0, 2, 2}, {2, 1, 1}, {1, 3, 2}, {2, 3, 8}},
          true};
  int stale = 0;
  const auto s = dijkstra(g, 0, [&](const char *tag, const State &) {
    if (std::string(tag) == "dj.stale")
      ++stale;
  });
  assert(s.distance[1] == 3 && s.distance[3] == 5 && !s.distance[4] &&
         stale == 2);
  assert(dijkstra({{}, {}, true}).distance.empty());
  assert(dijkstra({{"A"}, {{0, 0, 0}}, true}).distance[0] == 0);
  bool rejected = false;
  g.edges[0].weight = -1;
  try {
    (void)dijkstra(g);
  } catch (const std::invalid_argument &) {
    rejected = true;
  }
  assert(rejected);
  bool overflow = false;
  try {
    (void)checked_add(std::numeric_limits<long long>::max(), 1);
  } catch (const std::overflow_error &) {
    overflow = true;
  }
  assert(overflow);
}
