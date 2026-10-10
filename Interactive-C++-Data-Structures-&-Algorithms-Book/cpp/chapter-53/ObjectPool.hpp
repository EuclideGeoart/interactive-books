#pragma once
#include <array>
#include <cstddef>
#include <functional>
#include <memory>
#include <new>
#include <stdexcept>
#include <string_view>
#include <type_traits>
#include <utility>

namespace chapter53 {
// @begin object-pool
enum class Life { free, reserved, live, destroyed };
template<class T, std::size_t N = 6> class ObjectPool {
    static_assert(N > 0 && std::is_nothrow_destructible_v<T>);
public:
    static constexpr std::size_t none = N;
    struct Snapshot {
        std::array<Life, N> life{};
        std::array<std::size_t, N> next{};
        std::size_t head = 0, constructions = 0, destructions = 0, rollbacks = 0;
    };
    using Observer = std::function<void(std::string_view, const Snapshot&)>;
private:
    struct Slot { alignas(T) std::byte bytes[sizeof(T)]; T* object = nullptr; };
    std::array<Slot, N> slots_{};
    Snapshot state_{};
    Observer observe_;
    void emit(std::string_view tag) const { if (observe_) observe_(tag, state_); }
    void require(std::size_t i, Life expected) const {
        if (i >= N || state_.life[i] != expected) { emit("pool.reject"); throw std::invalid_argument("invalid slot lifecycle transition"); } // @trace pool.reject
    }
public:
    explicit ObjectPool(Observer observer = {}) : observe_(observer) {
        for (std::size_t i = 0; i < N; ++i) state_.next[i] = i + 1;
    }
    ObjectPool(const ObjectPool&) = delete;
    ObjectPool& operator=(const ObjectPool&) = delete;
    ObjectPool(ObjectPool&&) = delete;
    ObjectPool& operator=(ObjectPool&&) = delete;
    ~ObjectPool() {
        // Destruction does not call the observer; callbacks may already be gone.
        for (std::size_t i = 0; i < N; ++i) if (state_.life[i] == Life::live) std::destroy_at(slots_[i].object);
    }
    std::size_t reserve() {
        if (state_.head == none) { emit("pool.exhausted"); throw std::bad_alloc(); } // @trace pool.exhausted
        const auto i = state_.head;
        state_.head = state_.next[i]; state_.next[i] = none; state_.life[i] = Life::reserved; emit("pool.reserve"); // @trace pool.reserve
        return i;
    }
    template<class... Args> T& construct(std::size_t i, Args&&... args) {
        require(i, Life::reserved);
        try {
            slots_[i].object = std::construct_at(reinterpret_cast<T*>(slots_[i].bytes), std::forward<Args>(args)...);
        } catch (...) {
            state_.next[i] = state_.head; state_.head = i; state_.life[i] = Life::free;
            ++state_.rollbacks; emit("pool.rollback"); throw; // @trace pool.rollback
        }
        state_.life[i] = Life::live; ++state_.constructions; emit("pool.construct"); // @trace pool.construct
        return *slots_[i].object;
    }
    T& get(std::size_t i) { require(i, Life::live); return *slots_[i].object; }
    void destroy(std::size_t i) {
        require(i, Life::live);
        std::destroy_at(slots_[i].object); slots_[i].object = nullptr;
        state_.life[i] = Life::destroyed; ++state_.destructions; emit("pool.destroy"); // @trace pool.destroy
    }
    void return_slot(std::size_t i) {
        if (i >= N || (state_.life[i] != Life::reserved && state_.life[i] != Life::destroyed)) {
            emit("pool.return-reject"); throw std::invalid_argument("return requires reserved or destroyed storage"); // @trace pool.return-reject
        }
        state_.next[i] = state_.head; state_.head = i; state_.life[i] = Life::free; emit("pool.return"); // @trace pool.return
    }
    const Snapshot& snapshot() const noexcept { return state_; }
};
// @end object-pool
} // namespace chapter53
