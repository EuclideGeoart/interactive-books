#include "Kahn.hpp"
#include <cassert>
int main() {
    using namespace dependency;
    const auto s = kahn(Graph{4, {{0, 1}, {0, 2}, {1, 3}, {2, 3}}});
    assert((s.output == std::vector<std::size_t>{0, 1, 2, 3}));
    assert(!s.cycle && s.scans == 8 && s.pops == 4);
    assert(kahn(Graph{3, {{0, 1}, {1, 0}, {1, 2}}}).cycle);
    assert(kahn(Graph{1, {{0, 0}}}).cycle);
    assert(!kahn(Graph{0, {}}).cycle);
    assert(kahn(Graph{6, {{0, 1}, {3, 4}}}).output.size() == 6);
    assert(!kahn(Graph{2, {{0, 1}, {0, 1}}}).cycle);
    bool rejected = false;
    try {
        const Graph invalid{1, {{0, 1}}};
    } catch (const std::out_of_range &) {
        rejected = true;
    }
    assert(rejected);
}
