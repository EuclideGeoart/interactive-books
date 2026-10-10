#pragma once
#include <algorithm>
#include <functional>
#include <stdexcept>
#include <vector>

namespace chapter45 {
struct Returned { int n, value; };
struct State {
  int n = 0;
  bool iterative = false;
  std::vector<int> stack;
  std::vector<Returned> returned;
  int operand = 0, value = 1, calls = 0, multiplications = 0, maxDepth = 0;
};
// Observers must not mutate/reenter the run. Copy a snapshot if retaining it.
using Observer = std::function<void(const char*, const State&)>;
inline void validate(int n) {
  if (n < 0 || n > 8) throw std::invalid_argument("n must be in 0..8");
}
// @begin factorial-recursive
inline int factorial_call(int n, State& s, const Observer& observe) {
  const auto emit = [&](const char* tag) { if (observe) observe(tag, s); };
  s.stack.push_back(n); // @trace rec.enter
  ++s.calls;
  s.maxDepth = std::max(s.maxDepth, static_cast<int>(s.stack.size()));
  emit("rec.enter");
  int answer;
  if (n <= 1) {
    answer = 1; // @trace rec.base
    s.value = answer;
    emit("rec.base");
  } else {
    emit("rec.call");
    const int child = factorial_call(n - 1, s, observe); // @trace rec.call
    answer = n * child; // @trace rec.multiply
    s.operand = n;
    s.value = answer;
    ++s.multiplications;
    emit("rec.multiply");
  }
  s.returned.push_back({n, answer}); // @trace rec.return
  s.stack.pop_back();
  emit("rec.return");
  return answer;
}
inline State factorial_recursive(int n, Observer observe = {}) {
  validate(n);
  State s;
  s.n = n;
  s.value = factorial_call(n, s, observe);
  if (observe) observe("rec.done", s); // @trace rec.done
  return s;
}
// @end factorial-recursive
// @begin factorial-iterative
inline State factorial_iterative(int n, Observer observe = {}) {
  validate(n);
  State s;
  s.n = n;
  s.iterative = true;
  s.stack.push_back(n); // @trace iter.start
  s.calls = s.maxDepth = 1;
  if (observe) observe("iter.start", s);
  for (int factor = 2; factor <= n; ++factor) {
    s.value *= factor; // @trace iter.multiply
    s.operand = factor;
    ++s.multiplications;
    if (observe) observe("iter.multiply", s);
  }
  s.returned.push_back({n, s.value});
  s.stack.pop_back(); // @trace iter.done
  if (observe) observe("iter.done", s);
  return s;
}
// @end factorial-iterative
} // namespace chapter45
