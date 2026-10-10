#include "ObjectPool.hpp"
#include <cassert>
#include <cstdint>
#include <iostream>
struct alignas(64) Counted {
    static inline int alive = 0, constructed = 0, destroyed = 0;
    int value;
    explicit Counted(int v) : value(v) { if (v < 0) throw std::runtime_error("constructor failed"); ++alive; ++constructed; }
    ~Counted() noexcept { --alive; ++destroyed; }
};
template<class F> bool rejects(F f) { try { f(); } catch (const std::invalid_argument&) { return true; } return false; }
int main() {
    using Pool = chapter53::ObjectPool<Counted,2>;
    static_assert(!std::is_move_constructible_v<Pool> && !std::is_copy_constructible_v<Pool>);
    {
        Pool pool; const auto first = pool.reserve();
        assert(rejects([&] { pool.get(first); }));
        bool threw = false; try { pool.construct(first,-1); } catch (const std::runtime_error&) { threw = true; }
        assert(threw && Counted::alive == 0 && Counted::destroyed == 0 && pool.snapshot().head == first);
        assert(pool.snapshot().rollbacks == 1);
        const auto reused = pool.reserve(); assert(reused == first);
        auto* address = &pool.construct(reused,7); assert(address->value == 7);
        assert(reinterpret_cast<std::uintptr_t>(address) % alignof(Counted) == 0);
        assert(rejects([&] { pool.construct(reused,8); }));
        assert(rejects([&] { pool.return_slot(reused); }));
        pool.destroy(reused); assert(Counted::alive == 0 && Counted::destroyed == 1);
        assert(rejects([&] { pool.get(reused); })); assert(rejects([&] { pool.destroy(reused); }));
        pool.return_slot(reused); assert(rejects([&] { pool.return_slot(reused); }));
        const auto again = pool.reserve(); auto* replacement = &pool.construct(again,9); assert(replacement == address);
        // Comparing storage reuse is safe; never dereference the stale address to identify the old object.
        const auto second = pool.reserve(); pool.construct(second,11);
        bool full = false; try { pool.reserve(); } catch (const std::bad_alloc&) { full = true; } assert(full);
        assert(rejects([&] { pool.get(99); })); assert(rejects([&] { pool.destroy(99); })); assert(rejects([&] { pool.return_slot(99); }));
    }
    assert(Counted::alive == 0 && Counted::constructed == 3 && Counted::destroyed == 3);
    { Pool pool; const auto raw = pool.reserve(); pool.return_slot(raw); assert(Counted::constructed == 3); }
    std::cout << "chapter53: over-alignment, rollback, invalid transitions, stable slots, exact destructor counts passed\n";
}
