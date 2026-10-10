#include "MemoTabulation.hpp"
#include <cassert>
#include <iostream>
#include <queue>

int main() {
  using namespace chapter50;
  for (unsigned mask = 0; mask < 32; ++mask) {
    std::vector<int> coins;
    for (int c = 1; c <= 5; ++c) if (mask & (1u << (c-1))) coins.push_back(c);
    std::vector<int> distance(17,-1); distance[0] = 0;
    std::queue<int> queue; queue.push(0);
    while (!queue.empty()) {
      const int a = queue.front(); queue.pop();
      for (int c : coins) if (a+c <= 16 && distance[a+c] == -1) {
        distance[a+c] = distance[a]+1; queue.push(a+c);
      }
    }
    for (int target = 0; target <= 16; ++target) {
      assert(memoize(coins,target).answer == distance[target]);
      assert(tabulate(coins,target).answer == distance[target]);
    }
  }
  const auto unreachable = memoize({2,4},7);
  assert(unreachable.answer == -1 && unreachable.hits > 0);
  assert(!unreachable.values[0].has_value()); // Zero was never needed.
  assert(unreachable.values[1] == -1); // Computed unreachable, not unknown.
  assert(memoize({1,3,4},6).frames.empty());
  bool rejected = false;
  try { memoize({1,1},6); } catch (const std::invalid_argument&) { rejected = true; }
  assert(rejected);
  std::cout << "chapter50: both strategies vs BFS oracle; cache and unknown states passed\n";
}
