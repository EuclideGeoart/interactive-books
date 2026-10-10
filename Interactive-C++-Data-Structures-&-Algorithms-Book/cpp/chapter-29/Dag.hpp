#pragma once
#include "../chapter-30/Kahn.hpp"
namespace dependency {
// @begin dag
inline bool is_dag(const Graph &graph) { return !kahn(graph).cycle; }
inline std::vector<std::size_t> sources(const Graph &graph) {
    std::vector<std::size_t> incoming(graph.vertices, 0), result;
    for (const auto &edge : graph.edges)
        ++incoming[edge.to];
    for (std::size_t v = 0; v < graph.vertices; ++v)
        if (incoming[v] == 0)
            result.push_back(v);
    return result;
}
inline std::vector<std::size_t> sinks(const Graph &graph) {
    std::vector<std::size_t> result;
    for (std::size_t v = 0; v < graph.vertices; ++v)
        if (graph.outgoing[v].empty())
            result.push_back(v);
    return result;
}
// @end dag
} // namespace dependency
