#pragma once
#include "../chapter-18/TeachingHash.hpp"
#include <cstddef>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>
#include <limits>

namespace hashing {
// Exclusive ownership. Copy/move are intentionally disabled; no iterators exposed.
class ChainedMap {
public:
    struct Node {
        std::string key;
        int value;
        std::uint32_t hash;
        std::unique_ptr<Node> next;
    };
private:
    std::vector<std::unique_ptr<Node>> buckets_;
    std::size_t size_ = 0;
public:
    explicit ChainedMap(std::size_t capacity = 8) : buckets_(capacity) {
        if (capacity == 0) throw std::invalid_argument("Capacity must be positive");
    }
    ChainedMap(const ChainedMap&) = delete;
    ChainedMap& operator=(const ChainedMap&) = delete;
    ChainedMap(ChainedMap&&) = delete;
    ChainedMap& operator=(ChainedMap&&) = delete;
    ~ChainedMap() { clear(); }
    std::size_t size() const noexcept { return size_; }
    std::size_t capacity() const noexcept { return buckets_.size(); }
    double load_factor() const noexcept { return static_cast<double>(size_) / capacity(); }
    const auto& buckets() const noexcept { return buckets_; }
    std::size_t comparisons = 0;
    // @begin find
    std::optional<int> find(std::string_view key) {
        validate_key(key);
        comparisons = 0;
        const auto bucket = teaching_hash(key) % capacity(); // @trace find.bucket
        auto* current = buckets_[bucket].get(); // @trace find.start
        while (current) {
            const bool equal = (++comparisons, current->key == key); // @trace find.compare
            if (equal) return current->value; // @trace find.found
            current = current->next.get(); // @trace find.next
        }
        return std::nullopt; // @trace find.missing
    }
    // @end find
    bool contains(std::string_view key) { return find(key).has_value(); }
    // @begin insert
    bool insert_or_assign(std::string_view key, int value) {
        validate_key(key);
        comparisons = 0;
        const auto hash = teaching_hash(key); // @trace insert.hash
        auto bucket = hash % capacity(); // @trace insert.bucket
        auto* current = buckets_[bucket].get(); // @trace insert.start
        while (current) {
            const bool equal = (++comparisons, current->key == key); // @trace insert.compare
            if (equal) {
                current->value = value; // @trace insert.update
                return false; // @trace insert.updated
            }
            current = current->next.get(); // @trace insert.next
        }
        auto fresh = std::make_unique<Node>(Node{std::string(key), value, hash, nullptr}); // @trace insert.allocate
        // Allocate the node and replacement bucket array before modifying membership.
        if (size_ >= capacity() - capacity() / 4) {
            if (capacity() > std::numeric_limits<std::size_t>::max() / 2) throw std::length_error("Capacity overflow");
            rehash(capacity() * 2);
        }
        bucket = hash % capacity(); // @trace insert.remap
        fresh->next = std::move(buckets_[bucket]); // @trace insert.link
        buckets_[bucket] = std::move(fresh); // @trace insert.publish
        ++size_; // @trace insert.size
        return true; // @trace insert.done
    }
    // @end insert
    // @begin erase
    bool erase(std::string_view key) {
        validate_key(key);
        comparisons = 0;
        const auto bucket = teaching_hash(key) % capacity(); // @trace erase.bucket
        auto* link = &buckets_[bucket]; // @trace erase.start
        while (*link) {
            const bool equal = (++comparisons, (*link)->key == key); // @trace erase.compare
            if (equal) {
                auto removed = std::move(*link); // @trace erase.detach
                *link = std::move(removed->next); // @trace erase.reconnect
                removed.reset(); // @trace erase.destroy
                --size_; // @trace erase.size
                return true; // @trace erase.done
            }
            link = &(*link)->next; // @trace erase.next
        }
        return false; // @trace erase.missing
    }
    // @end erase
    // @begin rehash
    void rehash(std::size_t requested) {
        if (requested < capacity()) throw std::invalid_argument("This teaching API only grows");
        std::vector<std::unique_ptr<Node>> replacement(requested); // @trace rehash.allocate
        for (auto& head : buckets_) {
            while (head) {
                auto entry = std::move(head); // @trace rehash.detach
                head = std::move(entry->next); // @trace rehash.reconnect
                const auto bucket = entry->hash % requested; // @trace rehash.bucket
                entry->next = std::move(replacement[bucket]); // @trace rehash.link
                replacement[bucket] = std::move(entry); // @trace rehash.publish
            }
        }
        buckets_.swap(replacement); // @trace rehash.commit
    }
    // @end rehash
    void clear() noexcept {
        // Iterative release bounds stack usage even for a pathological long chain.
        for (auto& head : buckets_) while (head) {
            auto node = std::move(head);
            head = std::move(node->next);
        }
        size_ = 0;
    }
};
} // namespace hashing
