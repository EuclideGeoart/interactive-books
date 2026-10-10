#include "HandleRegistry.hpp"
#include <cassert>
#include <iostream>
#include <vector>
#include <type_traits>
int main() {
    using Registry = chapter55::HandleRegistry<2>;
    static_assert(!std::is_move_constructible_v<Registry>);
    Registry registry(3);
    std::vector<chapter55::Handle> revoked;
    // Independent identities: each successful create must differ from every earlier identity.
    std::vector<chapter55::Handle> issued;
    for (int n = 0; n < 6; ++n) {
        const auto h = registry.create(100+n);
        for (auto prior : issued) assert(prior.index != h.index || prior.generation != h.generation);
        issued.push_back(h);
        assert(h.index == static_cast<std::size_t>(n/3) && h.generation == static_cast<unsigned>(n%3+1));
        assert(registry.get(h) == 100+n);
        for (auto old : revoked) { assert(!registry.contains(old)); assert(!registry.get(old)); }
        assert(registry.destroy(h)); assert(!registry.destroy(h)); revoked.push_back(h);
    }
    assert(registry.snapshot().slots[0].retired && registry.snapshot().slots[1].retired);
    bool full = false; try { registry.create(7); } catch (const std::bad_alloc&) { full = true; } assert(full);
    assert(!registry.contains({99,1})); assert(!registry.contains({0,0})); assert(!registry.destroy({99,1}));
    bool bad_limit = false; try { Registry invalid(0); } catch (const std::invalid_argument&) { bad_limit = true; } assert(bad_limit);
    chapter55::HandleRegistry<1> single(1); const auto h = single.create(5); assert(single.destroy(h)); assert(single.snapshot().slots[0].retired);
    std::cout << "chapter55: independent identity history, stale rejection, exact retirement/exhaustion passed\n";
}
