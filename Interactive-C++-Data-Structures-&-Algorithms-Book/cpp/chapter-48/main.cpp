#include "Greedy.hpp"
#include <cassert>
#include <iostream>

int main() {
  using namespace chapter48;
  const auto oracle = [](const std::vector<Interval>& a) {
    int best = 0;
    for (unsigned mask = 0; mask < (1u << a.size()); ++mask) {
      bool valid = true; int count = 0;
      for (std::size_t i = 0; i < a.size(); ++i) if (mask & (1u << i)) {
        ++count;
        for (std::size_t j = 0; j < i; ++j) if ((mask & (1u << j)) &&
          a[i].start < a[j].finish && a[j].start < a[i].finish) valid = false;
      }
      if (valid) best = std::max(best, count);
    }
    return best;
  };
  const std::vector<Interval> pool{{0,1},{0,3},{1,2},{1,3},{2,3},{3,4}};
  for (unsigned mask = 0; mask < (1u << pool.size()); ++mask) {
    std::vector<Interval> input;
    for (std::size_t i = 0; i < pool.size(); ++i) if (mask & (1u << i)) input.push_back(pool[i]);
    assert(schedule(input).answer == oracle(input));
  }
  assert((schedule({{0,2},{1,2},{2,3}}).accepted == std::vector<int>{0,2}));
  assert((largest_first({1,3,4},6).chosen == std::vector<int>{4,1,1}));
  assert(largest_first({3,4},6).answer == -1); // Greedy stuck despite 3+3.
  assert(largest_first({},0).answer == 0);
  assert(largest_first({},7).answer == -1);
  bool rejected = false;
  try { schedule({{2,2}}); } catch (const std::invalid_argument&) { rejected = true; }
  assert(rejected);
  std::cout << "chapter48: subset oracle, stable ties, counterexample, edges passed\n";
}
