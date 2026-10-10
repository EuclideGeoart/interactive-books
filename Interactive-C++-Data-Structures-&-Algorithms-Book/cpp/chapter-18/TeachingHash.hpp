#pragma once
#include <cstdint>
#include <cstddef>
#include <string_view>
#include <stdexcept>

namespace hashing {
// Lowercase ASCII teaching keys; polynomial-31, modulo 2^32. Not a cryptographic hash.
// @begin hash
inline std::uint32_t teaching_hash(std::string_view key) noexcept {
    std::uint32_t hash = 0; // @trace hash.start
    for (unsigned char byte : key) {
        hash = hash * std::uint32_t{31} + byte; // @trace hash.byte
    }
    return hash; // @trace hash.return
}
// @end hash
inline void validate_key(std::string_view key) {
    if (key.empty() || key.size() > 12) throw std::invalid_argument("Use 1–12 lowercase ASCII letters");
    for (char c : key) if (c < 'a' || c > 'z') throw std::invalid_argument("Use lowercase ASCII letters");
}
} // namespace hashing

namespace hashing {
// @begin mapping
inline std::size_t bucket_index(std::uint32_t hash, std::size_t capacity) {
    if (capacity == 0) throw std::invalid_argument("Capacity must be positive");
    const auto bucket = hash % capacity; // @trace mapping.index
    return bucket; // @trace mapping.return
}
// @end mapping
}
