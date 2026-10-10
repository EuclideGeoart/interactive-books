#pragma once
#include <array>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <limits>
#include <new>
#include <optional>
#include <stdexcept>
#include <string_view>

namespace chapter55 {
// @begin handles
struct Handle { std::size_t index; std::uint32_t generation; };
template<std::size_t N = 6> class HandleRegistry {
    static_assert(N > 0);
public:
    static constexpr std::size_t none = N;
    struct Slot { std::uint32_t generation = 1; bool alive = false, retired = false; std::size_t next = none; std::optional<int> value; };
    struct Snapshot {
        std::array<Slot, N> slots{};
        std::size_t head = 0, validations = 0, reuses = 0;
        Handle checked{none, 0}; bool valid = false;
    };
    using Observer = std::function<void(std::string_view, const Snapshot&)>;
private:
    Snapshot state_{};
    const std::uint32_t limit_;
    Observer observe_;
    void emit(std::string_view tag) const { if (observe_) observe_(tag, state_); }
public:
    // A small explicit limit makes retirement teachable without billions of operations.
    explicit HandleRegistry(std::uint32_t limit = std::numeric_limits<std::uint32_t>::max(), Observer observer = {}) : limit_(limit), observe_(observer) {
        if (limit == 0) throw std::invalid_argument("generation limit must be positive");
        for (std::size_t i = 0; i < N; ++i) state_.slots[i].next = i + 1;
    }
    HandleRegistry(const HandleRegistry&) = delete;
    HandleRegistry& operator=(const HandleRegistry&) = delete;
    HandleRegistry(HandleRegistry&&) = delete;
    HandleRegistry& operator=(HandleRegistry&&) = delete;
    Handle create(int value) {
        if (state_.head == none) { emit("handle.exhausted"); throw std::bad_alloc(); } // @trace handle.exhausted
        const auto i = state_.head; auto& slot = state_.slots[i];
        state_.head = slot.next; slot.next = none; slot.value = value; slot.alive = true;
        if (slot.generation > 1) ++state_.reuses;
        emit("handle.create"); return {i, slot.generation}; // @trace handle.create
    }
    bool contains(Handle handle) {
        state_.checked = handle; ++state_.validations;
        state_.valid = handle.index < N && state_.slots[handle.index].alive && state_.slots[handle.index].generation == handle.generation;
        emit("handle.validate"); return state_.valid; // @trace handle.validate
    }
    std::optional<int> get(Handle handle) {
        if (!contains(handle)) return std::nullopt;
        return state_.slots[handle.index].value; // A copy; no retained raw pointer.
    }
    bool destroy(Handle handle) {
        if (!contains(handle)) { emit("handle.reject"); return false; } // @trace handle.reject
        auto& slot = state_.slots[handle.index];
        slot.value.reset(); slot.alive = false; emit("handle.destroy"); // @trace handle.destroy
        if (slot.generation == limit_) {
            slot.retired = true; emit("handle.retire"); // @trace handle.retire
        } else {
            ++slot.generation; emit("handle.advance"); // @trace handle.advance
            slot.next = state_.head; state_.head = handle.index; emit("handle.return"); // @trace handle.return
        }
        return true;
    }
    const Snapshot& snapshot() const noexcept { return state_; }
};
// @end handles
} // namespace chapter55
