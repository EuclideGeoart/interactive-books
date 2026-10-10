#include "Pool.hpp"
#include <cassert>
#include <cstdint>
#include <iostream>
struct alignas(128) Item {
    static inline int alive = 0;
    int value;
    explicit Item(int v) : value(v) { if (v == -1) throw std::runtime_error("construction failed"); ++alive; }
    ~Item() noexcept { --alive; }
};
template<class E, class F> void rejects(F f) { bool caught = false; try { f(); } catch (const E&) { caught = true; } assert(caught); }
int main() {
    static_assert(!std::is_copy_constructible_v<Pool<Item, 3>>);
    static_assert(!std::is_move_constructible_v<Pool<Item, 3>>);
    {
        Pool<Item, 3> pool;
        void* memory = pool.allocate();
        assert(reinterpret_cast<std::uintptr_t>(memory) % alignof(Item) == 0);
        auto* a = pool.construct(memory, 7);
        assert(a->value == 7 && Item::alive == 1);
        rejects<std::logic_error>([&] { pool.deallocate(a); });
        rejects<std::logic_error>([&] { pool.construct(a, 2); });
        pool.destroy(a);
        assert(Item::alive == 0);
        rejects<std::logic_error>([&] { pool.get(a); });
        rejects<std::logic_error>([&] { pool.destroy(a); });
        pool.deallocate(a);
        rejects<std::logic_error>([&] { pool.deallocate(a); });
        int foreign = 0;
        rejects<std::invalid_argument>([&] { pool.deallocate(&foreign); });
        rejects<std::invalid_argument>([&] { pool.deallocate(nullptr); });
        auto* reused = pool.create(8);
        assert(static_cast<void*>(reused) == memory && reused->value == 8);
        auto* b = pool.create(9);
        auto* c = pool.create(10);
        rejects<std::bad_alloc>([&] { pool.allocate(); });
        pool.destroy(b); pool.deallocate(b);
        rejects<std::runtime_error>([&] { pool.create(-1); });
        assert(pool.create(11) == b); // failed construction restored the free list
        pool.destroy(c); pool.deallocate(c);
        void* reserved = pool.allocate();
        pool.deallocate(reserved); // unconstructed storage can be returned
    }
    assert(Item::alive == 0); // pool cleanup destroys remaining live objects
    std::cout << "pool: alignment, lifetime, guards, reuse, exhaustion, failure cleanup passed\n";
}
