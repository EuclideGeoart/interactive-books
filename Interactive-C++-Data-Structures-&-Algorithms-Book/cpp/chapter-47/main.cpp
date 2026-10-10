#include "DivideConquer.hpp"
#include <cassert>
#include <iostream>
int main() {
  const auto result = chapter47::merge_sort({7,2,5,2,9,1});
  assert((result.values == std::vector<int>{1,2,2,5,7,9}));
  assert((result.origins == std::vector<int>{5,1,3,2,0,4}));
  assert(chapter47::merge_sort({}).values.empty());
  for (int value : result.values) std::cout << value << ' ';
  std::cout << '\n';
}
