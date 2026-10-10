#pragma once
#include <algorithm>
#include <functional>
#include <numeric>
#include <stdexcept>
#include <utility>
#include <vector>

namespace chapter48 {
struct Interval { int start, finish; };
struct State {
  std::vector<Interval> intervals;
  std::vector<int> order, accepted, rejected, coins, chosen;
  int active = -1, remaining = 0, checks = 0, answer = -1;
};
using Observer = std::function<void(const char*, const State&)>;
// @begin intervals
inline State schedule(std::vector<Interval> intervals, Observer observe = {}) {
  if (intervals.size() > 8) throw std::invalid_argument("at most eight intervals");
  for (auto i : intervals)
    if (i.start < 0 || i.start >= i.finish || i.finish > 20)
      throw std::invalid_argument("require 0 <= start < finish <= 20");
  State s; s.intervals = std::move(intervals);
  const auto emit = [&](const char* tag) { if (observe) observe(tag, s); };
  s.order.resize(s.intervals.size());
  std::iota(s.order.begin(), s.order.end(), 0);
  std::stable_sort(s.order.begin(), s.order.end(), [&](int a, int b) {
    return s.intervals[a].finish < s.intervals[b].finish;
  }); // @trace greedy.sort
  emit("greedy.sort");
  int finish = 0;
  for (int id : s.order) {
    s.active = id; ++s.checks; // @trace greedy.inspect
    emit("greedy.inspect");
    if (s.intervals[id].start >= finish) {
      s.accepted.push_back(id); finish = s.intervals[id].finish; // @trace greedy.accept
      emit("greedy.accept");
    } else {
      s.rejected.push_back(id); // @trace greedy.reject
      emit("greedy.reject");
    }
  }
  s.answer = static_cast<int>(s.accepted.size()); // @trace greedy.done
  emit("greedy.done");
  return s;
}
// @end intervals
// @begin greedy-coins
inline State largest_first(std::vector<int> coins, int target, Observer observe = {}) {
  if (target < 0 || target > 16 || coins.size() > 6)
    throw std::invalid_argument("target 0..16; at most six coins");
  for (int c : coins) if (c < 1 || c > 16) throw std::invalid_argument("coin 1..16");
  std::sort(coins.begin(), coins.end());
  if (std::adjacent_find(coins.begin(), coins.end()) != coins.end())
    throw std::invalid_argument("unique denominations required");
  State s; s.coins = std::move(coins); s.remaining = target;
  const auto emit = [&](const char* tag) { if (observe) observe(tag, s); };
  emit("coin.start"); // @trace coin.start
  for (auto it = s.coins.rbegin(); it != s.coins.rend(); ++it) {
    s.active = *it; ++s.checks; // @trace coin.inspect
    emit("coin.inspect");
    while (s.remaining >= *it) {
      s.remaining -= *it; s.chosen.push_back(*it); // @trace coin.take
      emit("coin.take");
    }
  }
  s.answer = s.remaining == 0 ? static_cast<int>(s.chosen.size()) : -1; // @trace coin.done
  emit("coin.done");
  return s;
}
// @end greedy-coins
} // namespace chapter48
