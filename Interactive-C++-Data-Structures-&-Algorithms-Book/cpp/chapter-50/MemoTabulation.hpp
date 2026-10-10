#pragma once
#include <algorithm>
#include <functional>
#include <optional>
#include <stdexcept>
#include <utility>
#include <vector>

namespace chapter50 {
// nullopt = unknown; -1 = proved unreachable; nonnegative = optimal count.
struct Frame { int id, amount, best = -1, pending = -1, returned = -1; };
struct State {
  std::vector<int> coins;
  std::vector<std::optional<int>> values;
  std::vector<Frame> frames;
  int target = 0, active = -1, dependency = -1, candidate = -1, best = -1;
  int calls = 0, hits = 0, misses = 0, checks = 0, writes = 0, max_depth = 0, answer = -1;
  bool collapsed = false;
};
using Observer = std::function<void(const char*, const State&)>;
inline State initial(std::vector<int> coins, int target) {
  if (target < 0 || target > 16 || coins.size() > 6)
    throw std::invalid_argument("target 0..16; at most six coins");
  for (int c : coins) if (c < 1 || c > 16) throw std::invalid_argument("coin 1..16");
  std::sort(coins.begin(), coins.end());
  if (std::adjacent_find(coins.begin(), coins.end()) != coins.end())
    throw std::invalid_argument("unique denominations required");
  State s; s.coins = std::move(coins); s.target = target;
  s.values.resize(target + 1);
  return s;
}
// @begin memo
inline State memoize(std::vector<int> coins, int target, Observer observe = {}) {
  State s = initial(std::move(coins), target);
  const auto emit = [&](const char* tag) { if (observe) observe(tag, s); };
  const auto solve = [&](auto&& self, int amount) -> int {
    const int id = s.calls++;
    s.frames.push_back({id, amount});
    s.max_depth = std::max(s.max_depth, static_cast<int>(s.frames.size())); // @trace memo.call
    emit("memo.call");
    if (s.values[amount].has_value()) {
      ++s.hits; // @trace memo.hit
      emit("memo.hit");
    } else {
      ++s.misses; // @trace memo.miss
      emit("memo.miss");
      int best = amount == 0 ? 0 : -1;
      s.frames.back().best = best;
      if (amount != 0) for (int coin : s.coins) {
        ++s.checks; // @trace memo.check
        emit("memo.check");
        if (coin > amount) continue;
        s.frames.back().pending = amount - coin; // @trace memo.pending
        emit("memo.pending");
        const int previous = self(self, amount - coin);
        s.active = amount; s.dependency = amount - coin;
        s.candidate = previous < 0 ? -1 : previous + 1; // @trace memo.candidate
        emit("memo.candidate");
        if (s.candidate >= 0 && (best < 0 || s.candidate < best)) {
          best = s.candidate; s.frames.back().best = best; // @trace memo.improve
          emit("memo.improve");
        }
        s.frames.back().pending = -1;
      }
      s.values[amount] = best; ++s.writes; // @trace memo.write
      emit("memo.write");
    }
    const int result = *s.values[amount];
    s.frames.back().returned = result; // @trace memo.return
    emit("memo.return");
    s.frames.pop_back(); // @trace memo.pop
    emit("memo.pop");
    return result;
  };
  s.answer = solve(solve, target); // @trace memo.done
  emit("memo.done");
  return s;
}
// @end memo
// @begin tabulation
inline State tabulate(std::vector<int> coins, int target, Observer observe = {}) {
  State s = initial(std::move(coins), target);
  const auto emit = [&](const char* tag) { if (observe) observe(tag, s); };
  s.values[0] = 0; ++s.writes; // @trace dp.base
  emit("dp.base");
  for (int amount = 1; amount <= target; ++amount) {
    s.active = amount; s.best = -1; s.dependency = -1; s.candidate = -1; // @trace dp.start
    emit("dp.start");
    for (int coin : s.coins) {
      ++s.checks; // @trace dp.check
      emit("dp.check");
      if (coin > amount) continue;
      s.dependency = amount - coin;
      const int previous = *s.values[s.dependency];
      s.candidate = previous < 0 ? -1 : previous + 1; // @trace dp.candidate
      emit("dp.candidate");
      if (s.candidate >= 0 && (s.best < 0 || s.candidate < s.best)) {
        s.best = s.candidate; // @trace dp.improve
        emit("dp.improve");
      }
    }
    s.values[amount] = s.best; ++s.writes; // @trace dp.write
    emit("dp.write");
  }
  s.answer = *s.values[target]; // @trace dp.done
  emit("dp.done");
  return s;
}
// @end tabulation
} // namespace chapter50
