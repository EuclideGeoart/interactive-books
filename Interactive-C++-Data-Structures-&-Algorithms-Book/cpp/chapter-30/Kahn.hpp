#pragma once
#include <cstddef>
#include <deque>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace dependency {
struct Edge {
    std::size_t from, to;
};
struct Graph {
    std::size_t vertices;
    std::vector<Edge> edges;
    std::vector<std::vector<std::size_t>> outgoing;
    Graph(std::size_t n, std::vector<Edge> input) : vertices(n), edges(std::move(input)), outgoing(n) {
        for (std::size_t i = 0; i < edges.size(); ++i) {
            const auto &e = edges[i];
            if (e.from >= n || e.to >= n)
                throw std::out_of_range("edge endpoint");
            outgoing[e.from].push_back(i); // Preserve input order, including parallel edges.
        }
    }
};
struct State {
    std::vector<std::size_t> indegree;
    std::vector<bool> counted, removed;
    std::deque<std::size_t> queue;
    std::vector<std::size_t> output;
    int current = -1, edge = -1;
    std::string phase = "counting";
    bool cycle = false;
    std::size_t scans = 0, pops = 0, writes = 0;
};
struct Ignore {
    void operator()(const char *, const State &) const {}
};
// The observer is optional and reads state AFTER the tagged statement.
// IDs fit int for the observer; canonical storage/indexing uses size_t.
// @begin kahn
template <class Observe = Ignore> State kahn(const Graph &g, Observe observe = {}) {
    if (g.vertices > 1000000 || g.edges.size() > 1000000)
        throw std::length_error("teaching implementation bound");
    State s;
    s.indegree.assign(g.vertices, 0);
    s.counted.assign(g.edges.size(), false);
    s.removed.assign(g.edges.size(), false);
    for (std::size_t i = 0; i < g.edges.size(); ++i) {
        s.edge = static_cast<int>(i);
        s.counted[i] = true;
        ++s.scans;
        ++s.writes;
        ++s.indegree[g.edges[i].to]; // @trace kahn.count
        observe("kahn.count", s);
    }
    s.phase = "running";
    s.edge = -1; // @trace kahn.ready
    observe("kahn.ready", s);
    for (std::size_t v = 0; v < g.vertices; ++v) {
        if (s.indegree[v] != 0)
            continue;
        s.queue.push_back(v); // @trace kahn.seed
        observe("kahn.seed", s);
    }
    while (!s.queue.empty()) {
        s.current = static_cast<int>(s.queue.front());
        ++s.pops;
        s.edge = -1;
        s.queue.pop_front(); // @trace kahn.pop
        observe("kahn.pop", s);
        s.output.push_back(static_cast<std::size_t>(s.current)); // @trace kahn.emit
        observe("kahn.emit", s);
        for (const auto i : g.outgoing[static_cast<std::size_t>(s.current)]) {
            s.edge = static_cast<int>(i);
            ++s.scans; // @trace kahn.inspect
            observe("kahn.inspect", s);
            const auto target = g.edges[i].to;
            s.removed[i] = true;
            ++s.writes;
            --s.indegree[target]; // @trace kahn.decrement
            observe("kahn.decrement", s);
            if (s.indegree[target] != 0)
                continue;
            s.queue.push_back(target); // @trace kahn.enqueue
            observe("kahn.enqueue", s);
        }
    }
    s.current = -1;
    s.edge = -1;
    s.phase = "done";
    s.cycle = s.output.size() != g.vertices; // @trace kahn.finish
    observe("kahn.finish", s);
    return s;
}
// @end kahn
} // namespace dependency
