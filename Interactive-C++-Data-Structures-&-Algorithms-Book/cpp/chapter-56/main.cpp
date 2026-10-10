#include "ECSStorage.hpp"
#include <cassert>
#include <iostream>
#include <map>
#include <type_traits>
static_assert(!std::is_copy_constructible_v<chapter56::Registry> && !std::is_copy_assignable_v<chapter56::Registry>
           && !std::is_move_constructible_v<chapter56::Registry> && !std::is_move_assignable_v<chapter56::Registry>);
int main() {
  chapter56::Pool signed_mapping; signed_mapping.dense.push_back(0); signed_mapping.values.push_back(10);
  signed_mapping.sparse[0] = -1; assert(!signed_mapping.contains(0));
  signed_mapping.sparse[0] = 8; assert(!signed_mapping.contains(0));
  signed_mapping.sparse[0] = 0; assert(signed_mapping.contains(0));
  assert(!signed_mapping.contains(-1) && !signed_mapping.contains(8));
  chapter56::Registry registry;
  auto a = *registry.create(), b = *registry.create(), c = *registry.create();
  assert(registry.add(a,0,10)); assert(registry.add(b,0,20)); assert(registry.add(c,0,30));
  assert(registry.add(a,1,1)); assert(registry.add(c,1,3));
  assert(!registry.add(a,0,99)); registry.tick();
  assert((registry.state().position.values == std::vector<int>{11,20,33}));
  registry.remove(b,0); assert((registry.state().position.dense == std::vector<int>{0,2}));
  assert(registry.state().position.sparse[2] == 1); assert(registry.destroy(a));
  auto replacement = *registry.create(); assert(replacement.index == a.index && replacement.generation != a.generation);
  assert(!registry.add(a,0,90)); assert(!registry.destroy(a)); assert(!registry.valid({-1,1}));
  std::map<int,int> oracle; oracle[2] = 33;
  unsigned seed = 23;
  for (int step = 0; step < 1000; ++step) {
    seed = seed * 1664525u + 1013904223u;
    const auto h = (seed & 2) ? replacement : c;
    if (seed & 1) { const int value = static_cast<int>((seed >> 12) % 100); assert(registry.add(h,0,value) == oracle.emplace(h.index,value).second); }
    else assert(registry.remove(h,0) == (oracle.erase(h.index) != 0));
    const auto& p = registry.state().position; assert(p.dense.size() == oracle.size());
    for (std::size_t i = 0; i < p.dense.size(); ++i) assert(oracle.at(p.dense[i]) == p.values[i] && p.sparse[p.dense[i]] == static_cast<int>(i));
  }
  bool rejected = false; try { registry.add(c,2,1); } catch (const std::invalid_argument&) { rejected = true; } assert(rejected);
  rejected = false; try { registry.add(c,0,101); } catch (const std::out_of_range&) { rejected = true; } assert(rejected);
  chapter56::Registry full; for (int i = 0; i < 8; ++i) assert(full.create()); assert(!full.create());
  chapter56::Registry retirement;
  for (int generation = 1; generation < 65535; ++generation) { auto h = *retirement.create(); assert(h.index == 0 && h.generation == generation); assert(retirement.destroy(h)); }
  assert(retirement.create()->index == 1); assert(!retirement.valid({0,1}));
  std::cout << "chapter56: map oracle, join, row repair, stale identity, exhaustion and retirement passed\n";
}
