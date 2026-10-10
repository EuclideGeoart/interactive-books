#pragma once
#include <algorithm>
#include <functional>
#include <numeric>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace chapter47 {
struct Frame {
  int id, lo, hi, mid, i, j;
  std::vector<int> output, outputOrigins;
  std::string phase;
};
struct Node { int id, parent, lo, hi, depth; std::string status; };
struct State {
  std::vector<int> original, values, origins;
  std::vector<Frame> stack;
  std::vector<Node> nodes;
  int calls = 0, comparisons = 0, writes = 0, maxDepth = 0;
};
// Observers must not mutate/reenter the run. Copy a snapshot if retaining it.
using Observer = std::function<void(const char*, const State&)>;
// @begin merge-sort
inline void solve(int lo, int hi, int parent, State& s, const Observer& observe) {
  const auto emit = [&](const char* tag) { if (observe) observe(tag, s); };
  const int id = static_cast<int>(s.nodes.size());
  const int mid = lo + (hi - lo) / 2;
  s.nodes.push_back({id, parent, lo, hi, static_cast<int>(s.stack.size()), "current"});
  s.stack.push_back({id, lo, hi, mid, lo, mid, {}, {}, "divide"}); // @trace dc.enter
  ++s.calls;
  s.maxDepth = std::max(s.maxDepth, static_cast<int>(s.stack.size()));
  emit("dc.enter");
  if (hi - lo <= 1) {
    s.stack.back().phase = "return"; // @trace dc.base
    emit("dc.base");
  } else {
    s.nodes[id].status = "accepted"; // @trace dc.split
    emit("dc.split");
    solve(lo, mid, id, s, observe);
    solve(mid, hi, id, s, observe);
    // No references to vector frames survive recursive pushes/reallocation.
    auto& frame = s.stack.back();
    frame.phase = "merge";
    s.nodes[id].status = "current";
    while (frame.i < mid || frame.j < hi) {
      bool left = frame.j == hi;
      if (frame.i < mid && frame.j < hi) {
        ++s.comparisons; // @trace dc.compare
        emit("dc.compare");
        left = s.values[frame.i] <= s.values[frame.j];
      }
      if (left) {
        frame.output.push_back(s.values[frame.i]); // @trace dc.take-left
        frame.outputOrigins.push_back(s.origins[frame.i++]);
        emit("dc.take-left");
      } else {
        frame.output.push_back(s.values[frame.j]); // @trace dc.take-right
        frame.outputOrigins.push_back(s.origins[frame.j++]);
        emit("dc.take-right");
      }
    }
    frame.phase = "write";
    for (int offset = 0; offset < hi - lo; ++offset) {
      s.values[lo + offset] = frame.output[offset]; // @trace dc.write
      s.origins[lo + offset] = frame.outputOrigins[offset];
      ++s.writes;
      emit("dc.write");
    }
  }
  s.nodes[id].status = "resolved";
  s.stack.pop_back(); // @trace dc.return
  emit("dc.return");
}
inline State merge_sort(std::vector<int> values, Observer observe = {}) {
  if (values.size() > 8) throw std::invalid_argument("at most eight values");
  for (int value : values)
    if (value < -1000000 || value > 1000000) throw std::invalid_argument("value outside bound");
  State s;
  s.original = values;
  s.values = std::move(values);
  s.origins.resize(s.values.size());
  std::iota(s.origins.begin(), s.origins.end(), 0);
  solve(0, static_cast<int>(s.values.size()), -1, s, observe);
  if (observe) observe("dc.done", s); // @trace dc.done
  return s;
}
// @end merge-sort
} // namespace chapter47
