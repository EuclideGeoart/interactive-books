#include "Backtracking.hpp"
#include <cassert>
#include <iostream>
int main() {
  const auto result = chapter46::combinations(4, 2);
  const std::vector<std::vector<int>> expected{{1,2},{1,3},{1,4},{2,3},{2,4},{3,4}};
  assert(result.solutions == expected);
  assert(result.partial.empty() && result.stack.empty());
  assert(chapter46::combinations(0, 0).solutions.size() == 1);
  assert(chapter46::combinations(2, 3).solutions.empty());
  std::cout << result.solutions.size() << " combinations\n";
}
