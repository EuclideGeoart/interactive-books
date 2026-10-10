#include "FreeListStorage.hpp"
#include <cassert>
#include <iostream>
#include <set>
#include <vector>
#include <type_traits>

template<class F> bool rejects(F f) { try { f(); } catch (const std::invalid_argument&) { return true; } return false; }
int main() {
    using Pool = chapter51::FreeListStorage<>;
    static_assert(!std::is_move_constructible_v<Pool>);
    Pool pool;
    std::vector<std::size_t> expected{5,4,3,2,1,0};
    std::set<std::size_t> occupied;
    unsigned random = 1729;
    // Independent stack and occupied-set oracle over a deterministic operation stream.
    for (int operation = 0; operation < 1000; ++operation) {
        random = random * 1664525u + 1013904223u;
        if (!expected.empty() && (occupied.empty() || (random & 4u))) {
            const auto index = pool.acquire(); assert(index == expected.back()); expected.pop_back();
            assert(occupied.insert(index).second);
            pool.storage(index)[0] = std::byte{0xA5}; // Overwrites old free-link bytes legally.
        } else if (!occupied.empty()) {
            const auto index = *occupied.begin(); occupied.erase(index); pool.release(index); expected.push_back(index);
            assert(rejects([&] { pool.release(index); }));
        }
        std::set<std::size_t> reached;
        for (auto i = pool.snapshot().head; i != Pool::none; i = pool.snapshot().next[i]) {
            assert(i < 6 && reached.insert(i).second && !occupied.contains(i));
        }
        assert(reached == std::set<std::size_t>(expected.begin(),expected.end()));
    }
    while (!expected.empty()) { assert(pool.acquire() == expected.back()); expected.pop_back(); }
    bool full = false; try { pool.acquire(); } catch (const std::bad_alloc&) { full = true; } assert(full);
    assert(rejects([&] { pool.release(99); }));
    assert(rejects([&] { pool.storage(99); }));
    pool.release(0); assert(rejects([&] { pool.storage(0); })); assert(pool.acquire() == 0);
    chapter51::FreeListStorage<1> singleton; assert(singleton.acquire() == 0); singleton.release(0);
    std::cout << "chapter51: 1000 stack/set oracle transitions, exhaustion, invalid/double release passed\n";
}
