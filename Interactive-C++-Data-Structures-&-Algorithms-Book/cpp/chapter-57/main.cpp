#include "DirtyWorkList.hpp"
#include <cassert>
#include <iostream>
#include <set>
#include <type_traits>
static_assert(!std::is_copy_constructible_v<chapter57::DirtyWorkList> && !std::is_copy_assignable_v<chapter57::DirtyWorkList>
           && !std::is_move_constructible_v<chapter57::DirtyWorkList> && !std::is_move_assignable_v<chapter57::DirtyWorkList>);
int main() {
  chapter57::DirtyWorkList work; std::set<int> expected;
  for (int id : {0,1,0,2,2,7,1}) assert(work.mark(id) == expected.insert(id).second);
  assert(work.begin_wave()); assert(work.process_one());
  assert(work.mark(0)); assert(work.mark(2)); assert(!work.mark(0));
  assert((work.state().current == std::vector<int>{0,1,2,7}));
  bool rejected = false; try { work.finish_wave(); } catch (const std::logic_error&) { rejected = true; } assert(rejected);
  rejected = false; try { work.clear(); } catch (const std::logic_error&) { rejected = true; } assert(rejected);
  while (work.process_one()) {} work.finish_wave();
  assert((work.state().processed == std::vector<int>{0,1,2,7})); assert((work.state().current == std::vector<int>{0,2}));
  for (int wave = 0; wave < 3; ++wave) { assert(work.begin_wave()); while (work.process_one()) { const int id = work.state().active; work.mark(id); } work.finish_wave(); }
  assert(!work.state().current.empty()); // Bounded processing does not imply convergence.
  work.clear(); assert(!work.begin_wave());
  rejected = false; try { work.mark(8); } catch (const std::out_of_range&) { rejected = true; } assert(rejected);
  rejected = false; try { work.process_one(); } catch (const std::logic_error&) { rejected = true; } assert(rejected);
  chapter57::DirtyWorkList bad; bad.mark(1); bad.break_flag(1); assert(!bad.state().current_flags[1] && bad.state().current[0] == 1);
  chapter57::DirtyWorkList duplicate; duplicate.mark(1); duplicate.break_duplicate(1); assert(duplicate.state().current.size() == 2);
  std::cout << "chapter57: independent dedupe set, frozen wave, next-wave marks, bounded requeue and errors passed\n";
}
