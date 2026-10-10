#pragma once
#include <array>
#include <cstddef>
#include <functional>
#include <new>
#include <span>
#include <stdexcept>
#include <string_view>
#include <vector>

namespace chapter52 {
// @begin arena
class ByteArena {
public:
    static constexpr std::size_t capacity = 64, backing_alignment = 16;
    struct Block { std::size_t begin, size, alignment, padding; };
    struct Snapshot {
        std::size_t offset = 0, padding = 0, allocations = 0, resets = 0;
        std::size_t candidate = 0, requested = 0, alignment = 1;
        std::vector<Block> blocks;
    };
    using Observer = std::function<void(std::string_view, const Snapshot&)>;
private:
    alignas(backing_alignment) std::array<std::byte, capacity> bytes_{};
    Snapshot state_;
    Observer observe_;
    void emit(std::string_view tag) const { if (observe_) observe_(tag, state_); }
public:
    explicit ByteArena(Observer observer = {}) : observe_(observer) { state_.blocks.reserve(capacity); }
    ByteArena(const ByteArena&) = delete;
    ByteArena& operator=(const ByteArena&) = delete;
    ByteArena(ByteArena&&) = delete;
    ByteArena& operator=(ByteArena&&) = delete;
    std::span<std::byte> allocate(std::size_t size, std::size_t alignment) {
        if (size == 0 || alignment == 0 || alignment > backing_alignment || (alignment & (alignment - 1)) != 0) {
            emit("arena.reject"); throw std::invalid_argument("size > 0, power-of-two alignment <= 16 required"); // @trace arena.reject
        }
        state_.requested = size; state_.alignment = alignment;
        state_.candidate = (state_.offset + alignment - 1) & ~(alignment - 1); emit("arena.align"); // @trace arena.align
        if (state_.candidate > capacity || size > capacity - state_.candidate) {
            emit("arena.exhausted"); throw std::bad_alloc(); // @trace arena.exhausted
        }
        const auto begin = state_.candidate, padding = begin - state_.offset;
        state_.blocks.push_back({begin, size, alignment, padding});
        state_.padding += padding; ++state_.allocations;
        state_.offset = begin + size; emit("arena.reserve"); // @trace arena.reserve
        return std::span<std::byte>(bytes_).subspan(begin, size);
    }
    void reset() noexcept {
        // No T was constructed by this API. Clients must destroy their own objects first.
        state_.offset = 0; state_.padding = 0; state_.blocks.clear();
        state_.candidate = state_.requested = 0; ++state_.resets; emit("arena.reset"); // @trace arena.reset
    }
    const Snapshot& snapshot() const noexcept { return state_; }
};
// @end arena
} // namespace chapter52
