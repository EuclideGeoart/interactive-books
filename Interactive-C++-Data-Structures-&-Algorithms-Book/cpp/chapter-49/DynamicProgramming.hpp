#pragma once
#include <algorithm>
#include <functional>
#include <optional>
#include <stdexcept>
#include <utility>
#include <vector>

namespace chapter49 {
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
// @begin coin-dp
inline State min_coins(std::vector<int> coins, int target, Observer observe = {}) {
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
// @end coin-dp
// @begin fibonacci
inline State fibonacci(int n, Observer observe = {}) {
  if (n < 0 || n > 6) throw std::invalid_argument("Fibonacci n 0..6");
  State s; s.target = n; s.values.resize(n + 1);
  const auto emit = [&](const char* tag) { if (observe) observe(tag, s); };
  const auto visit = [&](auto&& self, int k) -> int {
    const int id = s.calls++;
    s.frames.push_back({id, k});
    s.max_depth = std::max(s.max_depth, static_cast<int>(s.frames.size())); // @trace fib.call
    emit("fib.call");
    int result = k;
    if (k > 1) {
      const int left = self(self, k - 1);
      s.frames.back().best = left; s.frames.back().pending = k - 2; // @trace fib.pending
      emit("fib.pending");
      result = left + self(self, k - 2);
    }
    s.frames.back().returned = result; // @trace fib.return
    emit("fib.return");
    s.frames.pop_back(); // @trace fib.pop
    emit("fib.pop");
    return result;
  };
  visit(visit, n);
  s.collapsed = true; // @trace fib.collapse
  emit("fib.collapse");
  for (int k = 0; k <= n; ++k) {
    s.active = k;
    s.values[k] = k < 2 ? k : *s.values[k - 1] + *s.values[k - 2];
    ++s.writes; // @trace fib.write
    emit("fib.write");
  }
  s.answer = *s.values[n]; // @trace fib.done
  emit("fib.done");
  return s;
}
// @end fibonacci
} // namespace chapter49
