#pragma once
#include <array>
#include <cstddef>
#include <cstring>
#include <functional>
#include <new>
#include <stdexcept>
#include <string_view>

namespace chapter51 {
// @begin free-list
// Raw storage only: acquire/release neither construct nor destroy a client object.
template<std::size_t N = 6> class FreeListStorage {
public:
    static constexpr std::size_t none = N;
    static constexpr std::size_t slot_bytes = 32;
    struct Snapshot {
        std::array<std::size_t, N> next{};
        std::array<bool, N> free{};
        std::size_t head = 0, pending = none, reads = 0, writes = 0;
    };
    using Observer = std::function<void(std::string_view, const Snapshot&)>;
private:
    static_assert(N > 0 && sizeof(std::size_t) <= slot_bytes);
    struct alignas(std::max_align_t) Slot { std::array<std::byte, slot_bytes> bytes{}; };
    std::array<Slot, N> slots_{};
    Snapshot state_{};
    Observer observe_;
    void link(std::size_t i, std::size_t next) {
        std::memcpy(slots_[i].bytes.data(), &next, sizeof(next));
        state_.next[i] = next;
    }
    void emit(std::string_view tag) const { if (observe_) observe_(tag, state_); }
public:
    explicit FreeListStorage(Observer observer = {}) : observe_(observer) {
        for (std::size_t i = 0; i < N; ++i) { link(i, i + 1); state_.free[i] = true; }
    }
    FreeListStorage(const FreeListStorage&) = delete;
    FreeListStorage& operator=(const FreeListStorage&) = delete;
    FreeListStorage(FreeListStorage&&) = delete;
    FreeListStorage& operator=(FreeListStorage&&) = delete;
    std::size_t acquire() {
        if (state_.head == none) { emit("fl.exhausted"); throw std::bad_alloc(); } // @trace fl.exhausted
        const auto i = state_.head;
        state_.pending = i; ++state_.reads; emit("fl.select"); // @trace fl.select
        std::size_t next;
        std::memcpy(&next, slots_[i].bytes.data(), sizeof(next));
        state_.head = next; ++state_.writes; emit("fl.pop"); // @trace fl.pop
        state_.free[i] = false; state_.next[i] = none; state_.pending = none; emit("fl.acquire"); // @trace fl.acquire
        return i;
    }
    void release(std::size_t i) {
        if (i >= N || state_.free[i]) { emit("fl.reject"); throw std::invalid_argument("invalid or double release"); } // @trace fl.reject
        // Caller must have ended any object lifetime before this overwrites storage.
        state_.pending = i;
        link(i, state_.head); ++state_.writes; emit("fl.link"); // @trace fl.link
        state_.free[i] = true; state_.head = i; state_.pending = none; ++state_.writes; emit("fl.push"); // @trace fl.push
    }
    std::byte* storage(std::size_t i) {
        if (i >= N || state_.free[i]) throw std::invalid_argument("slot is not acquired");
        return slots_[i].bytes.data();
    }
    const Snapshot& snapshot() const noexcept { return state_; }
};
// @end free-list
} // namespace chapter51
