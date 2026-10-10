#include "SparseSet.hpp"
#include <cassert>
#include <iostream>
#include <set>
#include <type_traits>
static_assert(!std::is_copy_constructible_v<chapter54::SparseSet> && !std::is_copy_assignable_v<chapter54::SparseSet>
           && !std::is_move_constructible_v<chapter54::SparseSet> && !std::is_move_assignable_v<chapter54::SparseSet>);
int main() {
  chapter54::SparseSet set; std::set<int> oracle;
  unsigned seed = 7;
  for (int step = 0; step < 2000; ++step) {
    seed = seed * 1664525u + 1013904223u; const int id = static_cast<int>((seed >> 12) % 16);
    if (seed & 1) assert(set.insert(id) == oracle.insert(id).second);
    else assert(set.erase(id) == (oracle.erase(id) != 0));
    for (int candidate = 0; candidate < 16; ++candidate) assert(set.contains(candidate) == oracle.contains(candidate));
    assert(std::set<int>(set.state().dense.begin(), set.state().dense.end()) == oracle);
    for (std::size_t i = 0; i < set.state().dense.size(); ++i) assert(set.state().sparse[set.state().dense[i]] == static_cast<int>(i));
  }
  chapter54::SparseSet swap; for (int id : {1,9,4}) swap.insert(id);
  swap.erase(9); assert((swap.state().dense == std::vector<int>{1,4})); assert(swap.state().sparse[4] == 1); assert(!swap.contains(9));
  swap.erase(4); swap.erase(1); assert(swap.state().dense.empty());
  bool rejected = false; try { set.contains(16); } catch (const std::out_of_range&) { rejected = true; } assert(rejected);
  rejected = false; try { set.insert(-1); } catch (const std::out_of_range&) { rejected = true; } assert(rejected);
  chapter54::SparseSet bad; bad.insert(2); bad.break_mapping(2); assert(!bad.contains(2));
  chapter54::SparseSet duplicate; duplicate.insert(2); duplicate.break_duplicate(2); assert(duplicate.state().dense.size() == 2);
  std::cout << "chapter54: std::set oracle, swap/tail/empty, invalid IDs, safe corruption passed\n";
}
