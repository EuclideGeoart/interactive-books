#include "DynamicProgramming.hpp"
#include <cassert>
#include <iostream>
#include <queue>

int main() {
  using namespace chapter49;
  // Independent shortest-path oracle: amounts are vertices, each coin costs one edge.
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
    for (int target = 0; target <= 16; ++target) assert(min_coins(coins,target).answer == distance[target]);
  }
  assert(min_coins({1,3,4},6).answer == 2);
  assert(min_coins({2,4},7).answer == -1);
  const std::vector<int> fib{0,1,1,2,3,5,8};
  for (int n = 0; n <= 6; ++n) assert(fibonacci(n).answer == fib[n]);
  assert(fibonacci(5).calls == 15);
  bool rejected = false;
  try { min_coins({0},6); } catch (const std::invalid_argument&) { rejected = true; }
  assert(rejected);
  std::cout << "chapter49: BFS oracle across 544 fixtures and Fibonacci passed\n";
}
