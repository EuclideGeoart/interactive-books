#include "Kruskal.hpp"
#include <cassert>
using namespace chapter35;
int main() {
  const auto s =
      kruskal({{"A", "B", "C", "D"},
               {{0, 1, 1}, {0, 2, 1}, {1, 3, 1}, {2, 3, 1}, {1, 2, 1}},
               false});
  assert(s.total == 3 && s.components == 1 &&
         (s.accepted == std::vector<int>{0, 1, 2}));
  const auto f =
      kruskal({{"A", "B", "C", "D", "E", "F"},
               {{0, 1, 3}, {1, 2, 1}, {0, 2, 2}, {3, 4, -2}, {4, 4, -5}},
               false});
  assert(f.total == 1 && f.components == 3 && f.accepted.size() == 3);
  assert(kruskal({{}, {}, false}).components == 0);
  assert(kruskal({{"A"}, {{0, 0, -8}}, false}).accepted.empty());
  bool rejected = false;
  try {
    (void)kruskal({{"A"}, {}, true});
  } catch (const std::invalid_argument &) {
    rejected = true;
  }
  assert(rejected);
}
