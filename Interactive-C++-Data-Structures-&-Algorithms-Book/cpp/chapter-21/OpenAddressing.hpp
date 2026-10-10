#pragma once
#include "../chapter-18/TeachingHash.hpp"
#include <cstddef>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

class OpenAddressing {
public:
    enum class Status { empty, occupied, tombstone };
    struct Slot { Status status = Status::empty; std::string key; int value = 0; };
private:
    std::vector<Slot> slots;
    std::size_t count = 0;
    static std::size_t checked(std::size_t n) {
        if (n == 0 || n > 4096) throw std::invalid_argument("Capacity must be 1..4096");
        return n;
    }
    // @book-debug
public:
    explicit OpenAddressing(std::size_t capacity = 8) : slots(checked(capacity)) {}
    // Value semantics: independent vector copies; delete move to retain nonzero capacity.
    OpenAddressing(const OpenAddressing&) = default;
    OpenAddressing& operator=(const OpenAddressing& other) {
        if (this != &other) { OpenAddressing copy(other); slots.swap(copy.slots); std::swap(count, copy.count); }
        return *this;
    }
    OpenAddressing(OpenAddressing&&) = delete;
    OpenAddressing& operator=(OpenAddressing&&) = delete;
    std::size_t size() const noexcept { return count; }
    std::size_t capacity() const noexcept { return slots.size(); }
    double load_factor() const noexcept { return static_cast<double>(count) / capacity(); }
    const std::vector<Slot>& storage() const noexcept { return slots; }
    // @begin find
    std::optional<std::size_t> locate(std::string_view key) const {
        hashing::validate_key(key);
        const auto home = hashing::teaching_hash(key) % capacity(); // @trace oa.find.home
        for (std::size_t distance = 0; distance < capacity(); ++distance) {
            const auto index = (home + distance) % capacity(); // @trace oa.find.probe
            if (slots[index].status == Status::empty) {
                return std::nullopt; // @trace oa.find.empty
            }
            if (slots[index].status == Status::occupied && slots[index].key == key) {
                return index; // @trace oa.find.found
            }
        }
        return std::nullopt; // @trace oa.find.full
    }
    std::optional<int> find(std::string_view key) const {
        auto index = locate(key);
        return index ? std::optional<int>(slots[*index].value) : std::nullopt;
    }
    bool contains(std::string_view key) const { return locate(key).has_value(); }
    // @end find
    // @begin insert
    bool insert(std::string_view key, int value) {
        hashing::validate_key(key);
        const auto home = hashing::teaching_hash(key) % capacity(); // @trace oa.insert.home
        auto first_deleted = capacity();
        auto target = capacity();
        for (std::size_t distance = 0; distance < capacity(); ++distance) {
            const auto index = (home + distance) % capacity(); // @trace oa.insert.probe
            if (slots[index].status == Status::occupied && slots[index].key == key) {
                slots[index].value = value; // @trace oa.insert.update
                return false; // @trace oa.insert.updated
            }
            if (slots[index].status == Status::tombstone && first_deleted == capacity()) {
                first_deleted = index; // @trace oa.insert.remember
            }
            if (slots[index].status == Status::empty) {
                target = first_deleted == capacity() ? index : first_deleted; // @trace oa.insert.target
                break;
            }
        }
        if (target == capacity()) target = first_deleted;
        if (target == capacity()) {
            return false; // @trace oa.insert.full
        }
        slots[target] = Slot{Status::occupied, std::string(key), value}; ++count; // @trace oa.insert.place
        return true; // @trace oa.insert.done
    }
    // @end insert
    // @begin erase
    bool erase(std::string_view key) {
        const auto index = locate(key);
        if (!index) {
            return false; // @trace oa.erase.missing
        }
        slots[*index] = Slot{Status::tombstone, {}, 0}; --count; // @trace oa.erase.mark
        return true; // @trace oa.erase.done
    }
    // @end erase
    // @begin rehash
    void rehash(std::size_t requested) {
        checked(requested);
        if (requested < count) throw std::invalid_argument("Capacity cannot be smaller than size");
        std::vector<Slot> replacement(requested); // @trace oa.rehash.allocate
        for (const auto& slot : slots) {
            if (slot.status != Status::occupied) continue;
            auto index = hashing::teaching_hash(slot.key) % requested;
            for (;;) {
                const bool occupied = replacement[index].status == Status::occupied; // @trace oa.rehash.probe
                if (!occupied) break;
                index = (index + 1) % requested;
            }
            replacement[index] = slot; // @trace oa.rehash.remap
        }
        slots.swap(replacement); // @trace oa.rehash.commit
    }
    // @end rehash
    bool valid() const {
        std::size_t live = 0;
        for (std::size_t i = 0; i < capacity(); ++i) if (slots[i].status == Status::occupied) {
            ++live;
            if (locate(slots[i].key) != i) return false;
        }
        return live == count;
    }
};
