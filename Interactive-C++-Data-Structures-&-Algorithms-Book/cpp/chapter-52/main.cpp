#include "ByteArena.hpp"
#include <cassert>
#include <cstdint>
#include <iostream>
#include <limits>
#include <memory>
#include <type_traits>
struct Counted { int* destroyed; ~Counted() { ++*destroyed; } };
int main() {
    using chapter52::ByteArena;
    static_assert(!std::is_move_constructible_v<ByteArena>);
    for (std::size_t first = 1; first <= 32; ++first) for (std::size_t alignment : {1u,2u,4u,8u,16u}) {
        ByteArena arena;
        arena.allocate(first,1);
        // Oracle advances one byte at a time rather than copying the bit rounding formula.
        auto expected = first; while (expected % alignment) ++expected;
        const auto bytes = arena.allocate(3,alignment);
        assert(arena.snapshot().offset == expected+3);
        assert(arena.snapshot().padding == expected-first);
        assert(reinterpret_cast<std::uintptr_t>(bytes.data()) % alignment == 0);
    }
    ByteArena arena; auto first = arena.allocate(64,1);
    bool full = false; try { arena.allocate(1,1); } catch (const std::bad_alloc&) { full = true; }
    assert(full && arena.snapshot().offset == 64);
    for (std::size_t alignment : {0u,3u,32u}) {
        bool rejected = false; try { arena.allocate(1,alignment); } catch (const std::invalid_argument&) { rejected = true; } assert(rejected);
    }
    bool zero = false; try { arena.allocate(0,1); } catch (const std::invalid_argument&) { zero = true; } assert(zero);
    arena.reset(); auto reused = arena.allocate(1,1); assert(reused.data() == first.data());
    bool huge = false; try { arena.allocate(std::numeric_limits<std::size_t>::max(),16); } catch (const std::bad_alloc&) { huge = true; }
    assert(huge && arena.snapshot().offset == 1);
    // Explicit client lifetime policy: destroy before reset. Reset itself calls no destructor.
    arena.reset(); int destroyed = 0;
    auto storage = arena.allocate(sizeof(Counted),alignof(Counted));
    auto* object = std::construct_at(reinterpret_cast<Counted*>(storage.data()), &destroyed);
    std::destroy_at(object); assert(destroyed == 1);
    arena.reset(); assert(destroyed == 1 && arena.snapshot().blocks.empty());
    std::cout << "chapter52: 160 independent alignment cases, bounds/overflow/reset and client lifetime passed\n";
}
