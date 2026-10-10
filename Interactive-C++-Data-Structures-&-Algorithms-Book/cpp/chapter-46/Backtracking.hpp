#pragma once
#include <algorithm>
#include <functional>
#include <stdexcept>
#include <string>
#include <vector>

namespace chapter46 {
struct Frame { int id, start, candidate; };
struct Node {
  int id, parent, depth;
  std::vector<int> partial;
  std::string status;
};
struct State {
  int n = 0, k = 0;
  std::vector<int> partial;
  std::vector<std::vector<int>> solutions;
  std::vector<Frame> stack;
  std::vector<Node> nodes;
  int calls = 0, choices = 0, prunes = 0, maxDepth = 0;
};
// Observers must not mutate/reenter the run. Copy a snapshot if retaining it.
using Observer = std::function<void(const char*, const State&)>;
// @begin combinations
inline void explore(int start, int id, State& s, const Observer& observe) {
  const auto emit = [&](const char* tag) { if (observe) observe(tag, s); };
  s.stack.push_back({id, start, 0}); // @trace bt.enter
  s.nodes[id].status = "current";
  ++s.calls;
  s.maxDepth = std::max(s.maxDepth, static_cast<int>(s.stack.size()));
  emit("bt.enter");
  if (static_cast<int>(s.partial.size()) == s.k) {
    s.solutions.push_back(s.partial); // @trace bt.solution
    s.nodes[id].status = "solution";
    emit("bt.solution");
  } else if (s.n - start + 1 < s.k - static_cast<int>(s.partial.size())) {
    ++s.prunes; // @trace bt.prune
    s.nodes[id].status = "rejected";
    emit("bt.prune");
  } else {
    for (int candidate = start; candidate <= s.n; ++candidate) {
      s.stack.back().candidate = candidate; // @trace bt.candidate
      emit("bt.candidate");
      s.partial.push_back(candidate); // @trace bt.choose
      ++s.choices;
      const int child = static_cast<int>(s.nodes.size());
      s.nodes[id].status = "accepted";
      s.nodes.push_back({child, id, static_cast<int>(s.partial.size()), s.partial, "unexplored"});
      emit("bt.choose");
      explore(candidate + 1, child, s, observe);
      s.partial.pop_back(); // @trace bt.undo
      s.nodes[id].status = "current";
      emit("bt.undo");
    }
  }
  if (s.nodes[id].status == "current") s.nodes[id].status = "resolved";
  s.stack.pop_back(); // @trace bt.return
  emit("bt.return");
}
inline State combinations(int n, int k, Observer observe = {}) {
  if (n < 0 || n > 6 || k < 0 || k > 6)
    throw std::invalid_argument("n and k must be in 0..6");
  State s;
  s.n = n;
  s.k = k;
  s.nodes.push_back({0, -1, 0, {}, "unexplored"});
  explore(1, 0, s, observe);
  if (observe) observe("bt.done", s); // @trace bt.done
  return s;
}
// @end combinations
} // namespace chapter46
