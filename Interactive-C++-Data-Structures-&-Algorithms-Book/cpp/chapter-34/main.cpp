#include "BellmanFord.hpp"
#include <cassert>
using namespace chapter34;
int main() {
  auto s = bellman_ford({{"A", "B", "C", "D"},
                         {{0, 1, 4}, {0, 2, 5}, {2, 1, -3}, {1, 3, 2}},
                         true});
  assert(s.distance[1] == 2 && s.distance[3] == 4 && !s.negative);
  s = bellman_ford(
      {{"A", "B", "C"}, {{0, 1, 1}, {1, 2, -2}, {2, 1, -2}}, true});
  assert(s.negative);
  s = bellman_ford({{"A", "B", "C"}, {{1, 2, -2}, {2, 1, -2}}, true});
  assert(!s.negative && !s.distance[1]);
  assert(bellman_ford({{"A"}, {{0, 0, -1}}, true}).negative);
  assert(bellman_ford({{}, {}, true}).distance.empty());
  bool overflow = false;
  try {
    (void)checked_add(std::numeric_limits<long long>::min(), -1);
  } catch (const std::overflow_error &) {
    overflow = true;
  }
  assert(overflow);
}
