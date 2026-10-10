#pragma once
#include "../chapter-18/TeachingHash.hpp"
#include <cstddef>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

class RobinHood {
public:
    struct Slot { bool occupied = false; std::string key; int value = 0; std::size_t distance = 0; };
private:
    std::vector<Slot> slots;
    std::size_t count = 0;
    static std::size_t checked(std::size_t n) {
        if (n == 0 || n > 4096) throw std::invalid_argument("Capacity must be 1..4096");
        return n;
    }
    // @book-debug
public:
    explicit RobinHood(std::size_t capacity = 8) : slots(checked(capacity)) {}
    RobinHood(const RobinHood&) = default;
    RobinHood& operator=(const RobinHood& other) {
        if (this != &other) { RobinHood copy(other); slots.swap(copy.slots); std::swap(count, copy.count); }
        return *this;
    }
    RobinHood(RobinHood&&) = delete;
    RobinHood& operator=(RobinHood&&) = delete;
    std::size_t size() const noexcept { return count; }
    std::size_t capacity() const noexcept { return slots.size(); }
    double load_factor() const noexcept { return static_cast<double>(count) / capacity(); }
    const std::vector<Slot>& storage() const noexcept { return slots; }
    // @begin find
    std::optional<std::size_t> locate(std::string_view key) const {
        hashing::validate_key(key);
        const auto home = hashing::teaching_hash(key) % capacity(); // @trace rh.find.home
        for (std::size_t distance = 0; distance < capacity(); ++distance) {
            const auto index = (home + distance) % capacity(); // @trace rh.find.probe
            if (!slots[index].occupied || slots[index].distance < distance) {
                return std::nullopt; // @trace rh.find.stop
            }
            if (slots[index].key == key) {
                return index; // @trace rh.find.found
            }
        }
        return std::nullopt; // @trace rh.find.full
    }
    std::optional<int> find(std::string_view key) const {
        auto index = locate(key);
        return index ? std::optional<int>(slots[*index].value) : std::nullopt;
    }
    bool contains(std::string_view key) const { return locate(key).has_value(); }
    // @end find
    // @begin insert
    bool insert(std::string_view key, int value) {
        const auto existing = locate(key);
        if (existing) {
            slots[*existing].value = value; // @trace rh.insert.update
            return false; // @trace rh.insert.updated
        }
        if (count == capacity()) {
            return false; // @trace rh.insert.full
        }
        Slot incoming{true, std::string(key), value, 0}; // @trace rh.insert.incoming
        auto index = hashing::teaching_hash(key) % capacity();
        for (;;) {
            const bool occupied = slots[index].occupied; // @trace rh.insert.probe
            if (!occupied) {
                slots[index] = std::move(incoming); ++count; // @trace rh.insert.place
                return true; // @trace rh.insert.done
            }
            const bool steal = incoming.distance > slots[index].distance; // @trace rh.insert.compare
            if (steal) {
                std::swap(incoming, slots[index]); // @trace rh.insert.swap
            }
            ++incoming.distance; index = (index + 1) % capacity(); // @trace rh.insert.advance
        }
    }
    // @end insert
    // @begin erase
    bool erase(std::string_view key) {
        const auto found = locate(key);
        if (!found) {
            return false; // @trace rh.erase.missing
        }
        auto hole = *found;
        slots[hole] = Slot{}; --count; // @trace rh.erase.hole
        auto next = (hole + 1) % capacity();
        for (std::size_t shifted = 0; shifted + 1 < capacity(); ++shifted) {
            const bool movable = slots[next].occupied && slots[next].distance > 0; // @trace rh.erase.inspect
            if (!movable) break;
            slots[hole] = std::move(slots[next]); --slots[hole].distance; slots[next] = Slot{}; // @trace rh.erase.shift
            hole = next; next = (next + 1) % capacity(); // @trace rh.erase.advance
        }
        return true; // @trace rh.erase.done
    }
    // @end erase
    // @begin rehash
    void rehash(std::size_t requested) {
        checked(requested);
        if (requested < count) throw std::invalid_argument("Capacity cannot be smaller than size");
        RobinHood replacement(requested); // @trace rh.rehash.allocate
        for (const auto& slot : slots) {
            if (!slot.occupied) continue;
            replacement.insert(slot.key, slot.value); // @trace rh.rehash.remap
        }
        slots.swap(replacement.slots); // @trace rh.rehash.commit
    }
    // @end rehash
    bool valid() const {
        std::size_t live = 0;
        for (std::size_t i = 0; i < capacity(); ++i) if (slots[i].occupied) {
            ++live;
            const auto home = hashing::teaching_hash(slots[i].key) % capacity();
            if (slots[i].distance != (i + capacity() - home) % capacity() || locate(slots[i].key) != i) return false;
        }
        return live == count;
    }
};
