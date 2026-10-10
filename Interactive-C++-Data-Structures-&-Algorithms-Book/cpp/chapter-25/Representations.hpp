#pragma once
#include <algorithm>
#include <cassert>
#include <deque>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace graph_representations {
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

// @begin inspect
inline State inspect(Graph g, int start = 0, bool matrix = false) {
  State s = initial(std::move(g));
  if (s.graph.labels.empty())
    return s;
  vertex(s, start);
  const auto a = adjacency(s.graph);
  s.active = start; // @trace inspect.select
  if (matrix) {
    // Build once from edges: zero-weight edges remain present.
    std::vector<std::vector<bool>> cells(
        s.graph.labels.size(), std::vector<bool>(s.graph.labels.size(), false));
    for (const auto &e : s.graph.edges) {
      cells[e.from][e.to] = true;
      if (!s.graph.directed)
        cells[e.to][e.from] = true;
    }
    for (std::size_t v = 0; v < s.graph.labels.size(); ++v) {
      ++s.scans; // @trace inspect.cell
      if (cells[start][v]) {
        s.output.push_back(static_cast<int>(v)); // @trace inspect.matrix-neighbor
      }
    }
  } else {
    for (const auto &n : a[start]) {
      s.edge = n.edge;
      ++s.scans;                    // @trace inspect.edge
      s.output.push_back(n.vertex); // @trace inspect.neighbor
    }
  }
  return s;
}
// @end inspect
} // namespace graph_representations
