#pragma once
#include <algorithm>
#include <cstddef>
#include <functional>
#include <limits>
#include <numeric>
#include <optional>
#include <queue>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace chapter33 {
struct Edge {
  int from, to;
  long long weight;
};
struct Graph {
  std::vector<std::string> labels;
  std::vector<Edge> edges;
  bool directed = false;
};
inline long long checked_add(long long a, long long b) {
  if ((b > 0 && a > std::numeric_limits<long long>::max() - b) ||
      (b < 0 && a < std::numeric_limits<long long>::min() - b))
    throw std::overflow_error("integer addition overflow");
  return a + b;
}
inline void validate(const Graph &g) {
  if (g.labels.size() > 8)
    throw std::invalid_argument("at most eight vertices");
  for (std::size_t i = 0; i < g.labels.size(); ++i) {
    if (g.labels[i].empty() || g.labels[i].size() > 24 ||
        g.labels[i].find_first_not_of(" \t\n\r") == std::string::npos)
      throw std::invalid_argument("empty label");
    for (std::size_t j = 0; j < i; ++j)
      if (g.labels[i] == g.labels[j])
        throw std::invalid_argument("duplicate label");
  }
  for (std::size_t i = 0; i < g.edges.size(); ++i) {
    const auto &e = g.edges[i];
    if (e.from < 0 || e.to < 0 || e.from >= static_cast<int>(g.labels.size()) ||
        e.to >= static_cast<int>(g.labels.size()))
      throw std::out_of_range("vertex");
    if (e.weight < -1000000 || e.weight > 1000000)
      throw std::invalid_argument("weight bound");
    for (std::size_t j = 0; j < i; ++j) {
      const auto &p = g.edges[j];
      if ((p.from == e.from && p.to == e.to) ||
          (!g.directed && p.from == e.to && p.to == e.from))
        throw std::invalid_argument("parallel edge");
    }
  }
}
struct State {
  Graph graph;
  std::vector<std::optional<long long>> distance;
  std::vector<int> pred, predEdge, settled;
  std::vector<std::pair<long long, int>> queue;
  std::vector<int> order, parent, size, path, accepted, rejected;
  int active = -1, edge = -1;
  std::optional<long long> candidate;
  int pass = 0;
  bool changed = false, negative = false;
  int components = 0;
  long long total = 0;
  int scans = 0, writes = 0, queueOps = 0, traversals = 0, answer = -1;
  std::string result;
};
using Observer = std::function<void(const char *, const State &)>;
inline State initial(Graph graph) {
  validate(graph);
  State s;
  s.graph = std::move(graph);
  const auto n = s.graph.labels.size();
  s.distance.resize(n);
  s.pred.assign(n, -1);
  s.predEdge.assign(n, -1);
  s.settled.assign(n, 0);
  s.parent.resize(n);
  std::iota(s.parent.begin(), s.parent.end(), 0);
  s.size.assign(n, 1);
  s.components = static_cast<int>(n);
  return s;
}
inline void vertex(const State &s, int v) {
  if (v < 0 || v >= static_cast<int>(s.parent.size()))
    throw std::out_of_range("vertex not owned by this state");
}
// @begin dijkstra
inline State dijkstra(Graph graph, int source = 0, Observer observe = {}) {
  State s = initial(std::move(graph));
  const auto emit = [&](const char *tag) {
    if (observe)
      observe(tag, s);
  };
  for (const auto &e : s.graph.edges)
    if (e.weight < 0)
      throw std::invalid_argument("Dijkstra requires nonnegative weights");
  if (s.graph.labels.empty()) {
    s.result = "Empty graph"; // @trace dj.empty
    emit("dj.empty");
    return s;
  }
  vertex(s, source);
  std::vector<std::vector<std::pair<int, int>>> adjacency(
      s.graph.labels.size());
  for (std::size_t i = 0; i < s.graph.edges.size(); ++i) {
    const auto &e = s.graph.edges[i];
    adjacency[e.from].push_back({e.to, static_cast<int>(i)});
    if (!s.graph.directed && e.from != e.to)
      adjacency[e.to].push_back({e.from, static_cast<int>(i)});
  }
  using Entry = std::pair<long long, int>;
  std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> queue;
  // The observer exposes sorted dequeue order, not the heap's physical layout.
  const auto snapshot_queue = [&] {
    if (!observe)
      return;
    s.queue.clear();
    auto copy = queue;
    while (!copy.empty()) {
      s.queue.push_back(copy.top());
      copy.pop();
    }
  };
  s.distance[source] = 0; // @trace dj.seed
  ++s.writes;
  emit("dj.seed");
  queue.push({0, source}); // @trace dj.push
  snapshot_queue();
  ++s.queueOps;
  emit("dj.push");
  while (!queue.empty()) {
    const auto [d, u] = queue.top();
    queue.pop(); // @trace dj.pop
    snapshot_queue();
    s.active = u;
    s.candidate = d;
    ++s.queueOps;
    emit("dj.pop");
    if (d != s.distance[u]) {
      (void)d; // @trace dj.stale
      emit("dj.stale");
      continue;
    }
    s.settled[u] = 1; // @trace dj.settle
    ++s.writes;
    emit("dj.settle");
    for (const auto &[v, i] : adjacency[u]) {
      const auto &e = s.graph.edges[i];
      s.edge = static_cast<int>(i); // @trace dj.inspect
      ++s.scans;
      emit("dj.inspect");
      s.candidate = checked_add(d, e.weight); // @trace dj.candidate
      emit("dj.candidate");
      const bool improve =
          !s.distance[v] || *s.candidate < *s.distance[v]; // @trace dj.compare
      emit("dj.compare");
      if (improve) {
        s.distance[v] = s.candidate; // @trace dj.distance
        ++s.writes;
        emit("dj.distance");
        s.pred[v] = u; // @trace dj.pred
        ++s.writes;
        emit("dj.pred");
        s.predEdge[v] = s.edge; // @trace dj.pred-edge
        ++s.writes;
        emit("dj.pred-edge");
        queue.push({*s.candidate, v}); // @trace dj.enqueue
        snapshot_queue();
        ++s.queueOps;
        emit("dj.enqueue");
      }
    }
  }
  s.result =
      "Shortest distances finalized; infinity means unreachable"; // @trace dj.done
  emit("dj.done");
  return s;
}
// @end dijkstra
} // namespace chapter33
