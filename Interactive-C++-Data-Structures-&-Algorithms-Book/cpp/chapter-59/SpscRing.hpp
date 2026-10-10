#pragma once
#include <array>
#include <atomic>
#include <cstddef>

// One producer calls try_push; one consumer calls try_pop.
// Construct before starting either thread; destroy only after both have joined.
// The N int objects stay alive throughout. N-1 entries are usable.
template <std::size_t N>
class SpscRing {
    static_assert(N >= 2, "A reserved-slot ring needs at least two slots");
    std::array<int, N> slots_{};
    std::atomic<std::size_t> read_{0};
    std::atomic<std::size_t> write_{0};
    static constexpr std::size_t next(std::size_t index) noexcept {
        return index == N - 1 ? 0 : index + 1;
    }
public:
    SpscRing() = default;
    SpscRing(const SpscRing&) = delete;
    SpscRing& operator=(const SpscRing&) = delete;
    SpscRing(SpscRing&&) = delete;
    SpscRing& operator=(SpscRing&&) = delete;
    static constexpr std::size_t capacity() noexcept { return N - 1; }
    bool indices_are_lock_free() const noexcept {
        return read_.is_lock_free() && write_.is_lock_free();
    }

    // @begin spsc-push
    bool try_push(int value) noexcept {
        const auto write = write_.load(std::memory_order_relaxed); // @trace spsc.push.own
        const auto after = next(write); // @trace spsc.push.next
        const auto read = read_.load(std::memory_order_acquire); // @trace spsc.push.acquire
        const bool full = after == read; // @trace spsc.push.check
        if (full) return false;
        slots_[write] = value; // @trace spsc.push.payload
        write_.store(after, std::memory_order_release); // @trace spsc.push.publish
        return true;
    }
    // @end spsc-push

    // @begin spsc-pop
    bool try_pop(int& value) noexcept {
        const auto read = read_.load(std::memory_order_relaxed); // @trace spsc.pop.own
        const auto write = write_.load(std::memory_order_acquire); // @trace spsc.pop.acquire
        const bool empty = read == write; // @trace spsc.pop.check
        if (empty) return false;
        value = slots_[read]; // @trace spsc.pop.payload
        const auto after = next(read); // @trace spsc.pop.next
        read_.store(after, std::memory_order_release); // @trace spsc.pop.publish
        return true;
    }
    // @end spsc-pop
};

struct CasObservation { int current; int expected; bool exchanged; };

// Standalone scalar demonstration. There is no linked container or reclamation.
// @begin spsc-cas
inline CasObservation compare_example(int expected) noexcept {
    std::atomic<int> current{7}; // @trace spsc.cas.init
    const bool exchanged = current.compare_exchange_strong(expected, 9,
        std::memory_order_acq_rel, std::memory_order_acquire); // @trace spsc.cas.exchange
    return {current.load(std::memory_order_relaxed), expected, exchanged};
}
// @end spsc-cas

// Model the history of a head INDEX only. A=1, B=2, replacement=3.
// Equality of head bits does not validate a previously observed topology.
// @begin spsc-aba
inline CasObservation aba_example() noexcept {
    std::atomic<int> head{1}; // @trace spsc.aba.init
    int expected = head.load(std::memory_order_acquire); // @trace spsc.aba.observe
    head.store(2, std::memory_order_release); // @trace spsc.aba.b
    head.store(1, std::memory_order_release); // @trace spsc.aba.a
    const bool exchanged = head.compare_exchange_strong(expected, 3,
        std::memory_order_acq_rel, std::memory_order_acquire); // @trace spsc.aba.exchange
    return {head.load(std::memory_order_relaxed), expected, exchanged};
}
// @end spsc-aba
