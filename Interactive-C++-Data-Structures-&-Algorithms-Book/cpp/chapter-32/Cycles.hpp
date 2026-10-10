#pragma once
#include <algorithm>
#include <cassert>
#include <deque>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace graph_cycle {
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

// @begin dfs
inline State dfs(Graph g, int start = 0, bool forest = false,
                 bool detect = false) {
  State s = initial(std::move(g));
  if (s.graph.labels.empty())
    return s;
  vertex(s, start);
  const auto a = adjacency(s.graph);
  for (int seed = 0; seed < static_cast<int>(s.graph.labels.size()); ++seed) {
    const int root = forest ? seed : start;
    if (s.color[root] != 0)
      continue;
    ++s.launches;
    s.active = root; // @trace dfs.launch
    s.color[root] = 1;
    s.output.push_back(root);          // @trace dfs.seed-discover
    s.frames.push_back({root, 0, -1}); // @trace dfs.seed-push
    while (!s.frames.empty()) {
      s.active = s.frames.back().vertex; // @trace dfs.resume
      const int u = s.active;
      if (s.frames.back().next == static_cast<int>(a[u].size())) {
        s.color[u] = 2;      // @trace dfs.finish
        s.frames.pop_back(); // @trace dfs.backtrack
        continue;
      }
      const auto n = a[u][s.frames.back().next];
      ++s.frames.back().next;
      s.edge = n.edge;
      ++s.scans; // @trace dfs.inspect
      const int v = n.vertex;
      if (!s.graph.directed && n.edge == s.frames.back().parent_edge) {
        s.edge = -1; // @trace dfs.parent
        continue;
      }
      if (s.color[v] == 0) {
        s.pred[v] = u; // @trace dfs.predecessor
        s.color[v] = 1;
        s.output.push_back(v);              // @trace dfs.discover
        s.frames.push_back({v, 0, n.edge}); // @trace dfs.push
      } else if (detect && (s.graph.directed ? s.color[v] == 1 : true)) {
        s.cycle = true; // @trace dfs.cycle
      }
    }
    if (!forest)
      break;
  }
  s.active = -1;
  s.edge = -1; // @trace dfs.done
  return s;
}
// @end dfs
} // namespace graph_cycle
