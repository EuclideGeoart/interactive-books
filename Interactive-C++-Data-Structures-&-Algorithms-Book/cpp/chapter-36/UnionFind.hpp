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

namespace chapter36 {
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
// @begin union-find
class UnionFind {
  State s;
  Observer observe;
  void emit(const char *tag) const {
    if (observe)
      observe(tag, s);
  }
  int find_root(int u) {
    s.path.clear();
    s.active = u; // @trace uf.start
    emit("uf.start");
    while (s.parent[s.active] != s.active) {
      s.path.push_back(s.active);
      s.active = s.parent[s.active]; // @trace uf.walk
      ++s.traversals;
      emit("uf.walk");
    }
    const int root = s.active; // @trace uf.root
    emit("uf.root");
    for (int v : s.path)
      if (s.parent[v] != root) {
        s.parent[v] = root; // @trace uf.compress
        ++s.writes;
        emit("uf.compress");
      }
    return root;
  }
  void begin() {
    s.path.clear();
    s.active = -1;
    s.answer = -1;
    s.scans = 0;
    s.traversals = 0;
    s.writes = 0;
    s.result.clear();
  }
  void finish(std::string result) {
    s.result = std::move(result); // @trace uf.done
    emit("uf.done");
  }

public:
  explicit UnionFind(std::vector<std::string> labels = {},
                     Observer observer = {})
      : s(initial({std::move(labels), {}, true})),
        observe(std::move(observer)) {}
  const State &state() const noexcept { return s; }
  // IDs are indices owned by this instance; no external parent storage is
  // borrowed.
  int make_set(std::string label) {
    Graph candidate = s.graph;
    candidate.labels.push_back(label);
    validate(candidate);
    // Reserve every growing vector before publishing any part of a new set.
    const auto capacity = s.parent.size() + 1;
    s.graph.labels.reserve(capacity);
    s.parent.reserve(capacity);
    s.size.reserve(capacity);
    begin();
    const int id = static_cast<int>(s.parent.size());
    s.graph.labels.push_back(std::move(label));
    s.parent.push_back(id);
    s.size.push_back(1);
    ++s.components;
    s.writes += 2;
    s.answer = id; // @trace uf.make
    emit("uf.make");
    finish("Created " + s.graph.labels[id]);
    return id;
  }
  int find(int u) {
    vertex(s, u);
    begin();
    s.answer = find_root(u); // @trace uf.find-result
    emit("uf.find-result");
    finish("Representative: " + s.graph.labels[s.answer]);
    return s.answer;
  }
  bool connected(int u, int v) {
    vertex(s, u);
    vertex(s, v);
    begin();
    const int a = find_root(u), b = find_root(v);
    s.answer = (a == b); // @trace uf.connected
    emit("uf.connected");
    finish(s.answer ? "Connected" : "Not connected");
    return s.answer != 0;
  }
  bool unite(int u, int v) {
    vertex(s, u);
    vertex(s, v);
    begin();
    int a = find_root(u), b = find_root(v);
    if (a == b) {
      s.answer = 0; // @trace uf.same
      emit("uf.same");
      finish("Already connected");
      return false;
    }
    if (s.size[a] < s.size[b] || (s.size[a] == s.size[b] && a > b))
      std::swap(a, b);
    s.parent[b] = a; // @trace uf.parent
    ++s.writes;
    emit("uf.parent");
    s.size[a] += s.size[b]; // @trace uf.size
    ++s.writes;
    emit("uf.size");
    --s.components;
    s.answer = 1; // @trace uf.union
    emit("uf.union");
    finish("Merged two sets");
    return true;
  }
};
// @end union-find
} // namespace chapter36
