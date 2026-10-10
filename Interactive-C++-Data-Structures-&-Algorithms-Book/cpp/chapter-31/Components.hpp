#pragma once
#include <algorithm>
#include <cassert>
#include <deque>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace graph_components {
struct Edge {
  int from, to, weight = 1;
};
struct Graph {
  std::vector<std::string> labels;
  std::vector<Edge> edges;
  bool directed = false;
};
struct Neighbor {
  int vertex, edge, weight;
};
struct Frame {
  int vertex, next, parent_edge;
};
struct State {
  Graph graph;
  std::vector<int> distance, pred, color, component, output;
  std::deque<int> queue;
  std::vector<Frame> frames;
  int active = -1, edge = -1, scans = 0, launches = 0;
  bool cycle = false;
};
inline void validate(const Graph &g) {
  if (g.labels.size() > 8)
    throw std::invalid_argument(
        "At most eight vertices in this teaching model");
  for (std::size_t i = 0; i < g.labels.size(); ++i) {
    if (g.labels[i].empty() ||
        g.labels[i].find_first_not_of(" \t\r\n") == std::string::npos)
      throw std::invalid_argument("Empty label");
    for (std::size_t j = 0; j < i; ++j)
      if (g.labels[i] == g.labels[j])
        throw std::invalid_argument("Duplicate label");
  }
  for (std::size_t i = 0; i < g.edges.size(); ++i) {
    const auto &e = g.edges[i];
    if (e.from < 0 || e.to < 0 || e.from >= static_cast<int>(g.labels.size()) ||
        e.to >= static_cast<int>(g.labels.size()))
      throw std::invalid_argument("Vertex out of bounds");
    if (e.weight < -1000000 || e.weight > 1000000)
      throw std::invalid_argument("Weight out of bounds");
    for (std::size_t j = 0; j < i; ++j) {
      const auto &p = g.edges[j];
      if ((e.from == p.from && e.to == p.to) ||
          (!g.directed && e.from == p.to && e.to == p.from))
        throw std::invalid_argument("Parallel edge");
    }
  }
}
inline std::vector<std::vector<Neighbor>> adjacency(const Graph &g) {
  std::vector<std::vector<Neighbor>> a(g.labels.size());
  for (std::size_t i = 0; i < g.edges.size(); ++i) {
    auto e = g.edges[i];
    const int id = static_cast<int>(i);
    a[e.from].push_back({e.to, id, e.weight});
    if (!g.directed && e.from != e.to)
      a[e.to].push_back({e.from, id, e.weight});
  }
  return a;
}
inline State initial(Graph g) {
  validate(g);
  State s;
  s.graph = std::move(g);
  const auto n = s.graph.labels.size();
  s.distance.assign(n, -1);
  s.pred.assign(n, -1);
  s.color.assign(n, 0);
  s.component.assign(n, -1);
  return s;
}
inline void vertex(const State &s, int u) {
  if (u < 0 || u >= static_cast<int>(s.graph.labels.size()))
    throw std::invalid_argument("Vertex out of bounds");
}

// @begin components
inline State components(Graph g) {
  if (g.directed)
    throw std::invalid_argument("Components requires an undirected graph");
  State s = initial(std::move(g));
  const auto a = adjacency(s.graph);
  for (int seed = 0; seed < static_cast<int>(s.graph.labels.size()); ++seed) {
    if (s.component[seed] != -1)
      continue;
    const int id = s.launches;
    ++s.launches;
    s.active = seed; // @trace components.launch
    s.component[seed] = id;
    s.color[seed] = 1;       // @trace components.seed-assign
    s.queue.push_back(seed); // @trace components.seed-enqueue
    while (!s.queue.empty()) {
      s.active = s.queue.front();
      s.queue.pop_front(); // @trace components.dequeue
      const int u = s.active;
      s.output.push_back(u); // @trace components.visit
      for (const auto &n : a[u]) {
        s.edge = n.edge;
        ++s.scans; // @trace components.inspect
        const int v = n.vertex;
        if (s.component[v] == -1) {
          s.component[v] = id;
          s.color[v] = 1;       // @trace components.assign
          s.pred[v] = u;        // @trace components.predecessor
          s.queue.push_back(v); // @trace components.enqueue
        }
      }
      s.color[u] = 2; // @trace components.finish
    }
  }
  s.active = -1;
  s.edge = -1; // @trace components.done
  return s;
}
// @end components
} // namespace graph_components
