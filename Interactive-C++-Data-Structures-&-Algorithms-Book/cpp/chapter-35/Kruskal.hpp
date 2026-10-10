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

namespace chapter35 {
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
// @begin kruskal
inline State kruskal(Graph graph, Observer observe = {}) {
  State s = initial(std::move(graph));
  const auto emit = [&](const char *tag) {
    if (observe)
      observe(tag, s);
  };
  if (s.graph.directed)
    throw std::invalid_argument("Kruskal requires undirected input");
  if (s.graph.labels.empty()) {
    s.result = "Empty graph"; // @trace kr.empty
    emit("kr.empty");
    return s;
  }
  s.order.resize(s.graph.edges.size());
  std::iota(s.order.begin(), s.order.end(), 0);
  std::sort(s.order.begin(), s.order.end(), [&](int a, int b) {
    return std::pair{s.graph.edges[a].weight, a} <
           std::pair{s.graph.edges[b].weight, b};
  }); // @trace kr.sort
  emit("kr.sort");
  const auto root = [&](int u) {
    s.active = u; // @trace kr.find
    emit("kr.find");
    while (s.parent[s.active] != s.active) {
      s.active = s.parent[s.active]; // @trace kr.walk
      ++s.traversals;
      emit("kr.walk");
    }
    return s.active;
  };
  // Iterate a sorted vector; erase-front is avoided in the algorithm's queue.
  const auto sorted = s.order;
  for (std::size_t k = 0; k < sorted.size(); ++k) {
    const int edge = sorted[k];
    const auto &e = s.graph.edges[edge];
    if (observe) {
      s.order.assign(sorted.begin() + static_cast<std::ptrdiff_t>(k + 1),
                     sorted.end());
    }
    s.edge = edge; // @trace kr.take
    ++s.scans;
    emit("kr.take");
    int a = root(e.from), b = root(e.to);
    if (a == b) {
      s.rejected.push_back(edge); // @trace kr.reject
      emit("kr.reject");
      continue;
    }
    if (s.size[a] < s.size[b] || (s.size[a] == s.size[b] && a > b))
      std::swap(a, b);
    s.parent[b] = a; // @trace kr.parent
    ++s.writes;
    emit("kr.parent");
    s.size[a] += s.size[b]; // @trace kr.size
    ++s.writes;
    emit("kr.size");
    --s.components; // @trace kr.components
    emit("kr.components");
    s.accepted.push_back(edge); // @trace kr.accept
    emit("kr.accept");
    s.total = checked_add(s.total, e.weight); // @trace kr.total
    emit("kr.total");
  }
  s.order.clear();
  s.result =
      s.components == 1
          ? "Minimum spanning tree"
          : "Minimum spanning forest (disconnected graph)"; // @trace kr.done
  emit("kr.done");
  return s;
}
// @end kruskal
} // namespace chapter35
