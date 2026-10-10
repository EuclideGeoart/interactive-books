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

namespace chapter34 {
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
// @begin bellman-ford
inline State bellman_ford(Graph graph, int source = 0, Observer observe = {}) {
  State s = initial(std::move(graph));
  const auto emit = [&](const char *tag) {
    if (observe)
      observe(tag, s);
  };
  if (s.graph.labels.empty()) {
    s.result = "Empty graph"; // @trace bf.empty
    emit("bf.empty");
    return s;
  }
  vertex(s, source);
  struct Arc {
    int from, to;
    long long weight;
    int edge;
  };
  std::vector<Arc> arcs;
  for (std::size_t i = 0; i < s.graph.edges.size(); ++i) {
    const auto &e = s.graph.edges[i];
    arcs.push_back({e.from, e.to, e.weight, static_cast<int>(i)});
    if (!s.graph.directed && e.from != e.to)
      arcs.push_back({e.to, e.from, e.weight, static_cast<int>(i)});
  }
  s.distance[source] = 0; // @trace bf.seed
  ++s.writes;
  emit("bf.seed");
  for (int pass = 1; pass < static_cast<int>(s.graph.labels.size()); ++pass) {
    s.pass = pass;
    s.changed = false; // @trace bf.pass
    emit("bf.pass");
    for (const auto &e : arcs) {
      const int u = e.from, v = e.to;
      s.active = u;
      s.edge = e.edge; // @trace bf.inspect
      ++s.scans;
      s.candidate.reset();
      emit("bf.inspect");
      if (!s.distance[u]) {
        (void)u; // @trace bf.unreachable
        emit("bf.unreachable");
        continue;
      }
      s.candidate =
          checked_add(*s.distance[u], e.weight); // @trace bf.candidate
      emit("bf.candidate");
      const bool improve =
          !s.distance[v] || *s.candidate < *s.distance[v]; // @trace bf.compare
      emit("bf.compare");
      if (improve) {
        s.distance[v] = s.candidate; // @trace bf.distance
        ++s.writes;
        emit("bf.distance");
        s.pred[v] = u; // @trace bf.pred
        ++s.writes;
        emit("bf.pred");
        s.predEdge[v] = e.edge; // @trace bf.pred-edge
        ++s.writes;
        emit("bf.pred-edge");
        s.changed = true; // @trace bf.changed
        emit("bf.changed");
      }
    }
    if (!s.changed) {
      (void)s.changed; // @trace bf.early
      emit("bf.early");
      break;
    }
  }
  s.pass = static_cast<int>(s.graph.labels.size()); // @trace bf.detect-pass
  emit("bf.detect-pass");
  for (const auto &e : arcs) {
    const int u = e.from, v = e.to;
    s.active = u;
    s.edge = e.edge; // @trace bf.detect-edge
    ++s.scans;
    s.candidate.reset();
    emit("bf.detect-edge");
    if (!s.distance[u])
      continue;
    s.candidate =
        checked_add(*s.distance[u], e.weight); // @trace bf.detect-candidate
    emit("bf.detect-candidate");
    if (!s.distance[v] || *s.candidate < *s.distance[v]) {
      s.negative = true; // @trace bf.negative
      emit("bf.negative");
    }
  }
  s
      .result = s.negative
                    ? "Reachable negative cycle: finite-path result withheld"
                    : "Shortest distances finalized; infinity means "
                      "unreachable"; // @trace bf.done
  emit("bf.done");
  return s;
}
// @end bellman-ford
} // namespace chapter34
