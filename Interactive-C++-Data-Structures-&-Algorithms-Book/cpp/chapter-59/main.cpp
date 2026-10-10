#include "SpscRing.hpp"
#include <cassert>
#include <iostream>
#include <thread>

int main() {
    SpscRing<4> example;
    int value = -1;
    assert(!example.try_pop(value) && value == -1);
    for (int i = 1; i <= 3; ++i) assert(example.try_push(i));
    assert(!example.try_push(4));
    assert(example.try_pop(value) && value == 1);
    assert(example.try_push(4)); // Wrap the producer index.
    for (int i = 2; i <= 4; ++i) assert(example.try_pop(value) && value == i);
    assert(!example.try_pop(value));
    const auto success = compare_example(7), mismatch = compare_example(6);
    assert(success.exchanged && success.current == 9 && success.expected == 7);
    assert(!mismatch.exchanged && mismatch.current == 7 && mismatch.expected == 7);
    const auto aba = aba_example();
    assert(aba.exchanged && aba.current == 3 && aba.expected == 1);

    // One real producer and one real consumer. Retries are a driver policy,
    // not part of a bounded try operation. This is a test, not a benchmark.
    SpscRing<17> queue;
    constexpr int count = 100000;
    std::jthread producer([&] {
        for (int i = 0; i < count; ++i)
            while (!queue.try_push(i)) std::this_thread::yield();
    });
    std::jthread consumer([&] {
        for (int expected = 0; expected < count; ++expected) {
            int received = -1;
            while (!queue.try_pop(received)) std::this_thread::yield();
            assert(received == expected);
        }
    });
    producer.join();
    consumer.join();
    assert(!queue.try_pop(value));
    std::cout << "SPSC: 100000 values in FIFO order; size_t atomics lock-free = "
              << queue.indices_are_lock_free() << '\n';
}
