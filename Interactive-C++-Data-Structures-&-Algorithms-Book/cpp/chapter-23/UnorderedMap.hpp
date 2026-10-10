#pragma once
#include "../chapter-18/TeachingHash.hpp"
#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <string_view>
#include <unordered_map>

// @begin point
struct PointKey {
    int x;
    int y;
    bool operator==(const PointKey&) const = default;
};
struct PointHash {
    std::size_t operator()(const PointKey& point) const noexcept {
        return static_cast<std::uint32_t>(point.x) * std::uint32_t{31} + static_cast<std::uint32_t>(point.y);
    }
};
inline bool point_hash_contract(PointKey a, PointKey b) {
    const bool equal = a == b; // @trace um.point.equal
    const auto hash_a = PointHash{}(a); // @trace um.point.hash-a
    const auto hash_b = PointHash{}(b); // @trace um.point.hash-b
    return !equal || hash_a == hash_b; // @trace um.point.result
}
// @end point
// Explicit user-supplied hash; no assertion about std::hash or bucket reduction.
struct TeachingHasher {
    std::size_t operator()(std::string_view key) const noexcept { return hashing::teaching_hash(key); }
};
using TeachingMap = std::unordered_map<std::string, int, TeachingHasher>;
// @begin insert
inline void map_insert(TeachingMap& map, const std::string& key, int value) {
    hashing::validate_key(key);
    map.insert_or_assign(key, value); // @trace um.insert
}
// @end insert
// @begin find
inline bool map_contains(const TeachingMap& map, const std::string& key) {
    hashing::validate_key(key);
    return map.contains(key); // @trace um.find
}
// @end find
// @begin erase
inline void map_erase(TeachingMap& map, const std::string& key) {
    hashing::validate_key(key);
    map.erase(key); // @trace um.erase
}
// @end erase
// @begin reserve
inline void map_reserve(TeachingMap& map, std::size_t elements) {
    map.reserve(elements); // @trace um.reserve
}
// @end reserve
// @begin rehash
inline void map_rehash(TeachingMap& map, std::size_t buckets) {
    map.rehash(buckets); // @trace um.rehash
}
// @end rehash
// @begin max-load
inline void map_max_load(TeachingMap& map, float hint) {
    if (!(hint > 0.0f) || hint > 8.0f) throw std::invalid_argument("Positive finite load hint up to eight required");
    map.max_load_factor(hint); // @trace um.max-load
}
// @end max-load
