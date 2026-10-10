#include "RingBuffer.hpp"
#include <cassert>
#include <utility>

template<class Error, class Function> void throws(Function action) {
    bool caught = false;
    try { action(); } catch (const Error&) { caught = true; }
    assert(caught);
}
int main() {
    RingBuffer ring;
    throws<std::underflow_error>([&] { ring.pop(); });
    throws<std::underflow_error>([&] { (void)ring.front(); });
    throws<std::underflow_error>([&] { (void)ring.back(); });
    for (int i=0;i<5;++i) ring.push(i);
    assert(ring.full() && ring.read_index() == ring.write_index());
    const auto before = ring.raw_storage();
    throws<std::overflow_error>([&] { ring.push(99); });
    assert(ring.raw_storage() == before && ring.size() == 5);
    ring.push(99,RingBuffer::Policy::overwrite);
    assert((ring.values() == std::vector<int>{1,2,3,4,99}));
    for (int expected : {1,2,3,4,99}) { assert(ring.front() == expected); ring.pop(); }
    assert(ring.empty() && ring.read_index() == ring.write_index());
    // Thousands of reuse cycles exercise last-to-zero head AND tail transitions.
    for (int cycle=0;cycle<1000;++cycle) {
        for (int i=0;i<5;++i) ring.push(cycle*5+i);
        assert(ring.back() == cycle*5+4);
        for (int i=0;i<5;++i) { assert(ring.front() == cycle*5+i); ring.pop(); }
    }
    ring.push(-999); ring.push(999);
    RingBuffer copy = ring; copy.pop(); assert(ring.size() == 2);
    RingBuffer moved = std::move(copy); assert(moved.front() == 999 && copy.front() == 999);
    copy=ring; moved=std::move(copy); assert(moved.values() == ring.values());
    ring.pop(); ring.pop(); ring.push(0); ring.pop(); assert(ring.empty());
    SentinelRing sentinel;
    assert(sentinel.empty());
    throws<std::underflow_error>([&] { sentinel.pop(); });
    throws<std::underflow_error>([&] { (void)sentinel.front(); });
    throws<std::underflow_error>([&] { (void)sentinel.back(); });
    for (int cycle=0;cycle<1000;++cycle) {
        for (int i=0;i<4;++i) sentinel.push(i);
        assert(sentinel.full() && sentinel.size() == 4 && sentinel.back() == 3);
        throws<std::overflow_error>([&] { sentinel.push(99); });
        for (int i=0;i<4;++i) { assert(sentinel.front() == i); sentinel.pop(); }
        assert(sentinel.empty());
    }
    sentinel.push(42); SentinelRing sentinel_copy=sentinel; sentinel.pop();
    assert(sentinel_copy.front() == 42 && sentinel.empty());
}
