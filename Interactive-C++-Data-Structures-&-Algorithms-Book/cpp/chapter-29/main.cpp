#include "Dag.hpp"
#include <cassert>
int main() {
    using namespace dependency;
    const Graph geometry{5, {{0, 2}, {1, 2}, {2, 4}, {3, 4}}};
    assert(is_dag(geometry));
    assert((sources(geometry) == std::vector<std::size_t>{0, 1, 3}));
    assert((sinks(geometry) == std::vector<std::size_t>{4}));
    assert(!is_dag(Graph{3, {{0, 1}, {1, 2}, {2, 0}}}));
    assert(is_dag(Graph{0, {}}));
}
