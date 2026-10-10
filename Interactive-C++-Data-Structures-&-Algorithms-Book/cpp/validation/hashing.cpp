#include "../chapter-20/ChainedMap.hpp"
#include "../chapter-21/OpenAddressing.hpp"
#include "../chapter-22/RobinHood.hpp"
#include <algorithm>
#include <cassert>
#include <cstdint>
#include <map>
#include <optional>
#include <string>
#include <type_traits>
#include <vector>

// Independent ordered-map oracle: no shared hashing or probe implementation.
static std::vector<std::string> keys() {
    std::vector<std::string> result;
    for (char a = 'a'; a <= 'd'; ++a)
        for (char b = 'a'; b <= 'p'; ++b) result.push_back(std::string{a, b});
    return result;
}
static std::uint32_t random_step(std::uint32_t& seed) {
    seed = seed * 1664525u + 1013904223u;
    return seed;
}
template<class Table> void probe_oracle() {
    const auto domain = keys();
    for (std::size_t initial : {1u, 2u, 4u, 8u, 16u}) {
        Table table(initial);
        std::map<std::string, int> oracle;
        std::uint32_t seed = static_cast<std::uint32_t>(initial);
        for (int operation = 0; operation < 1600; ++operation) {
            const auto draw = random_step(seed);
            const auto& key = domain[(draw >> 8) % domain.size()];
            const int value = static_cast<int>((draw >> 16) % 1999) - 999;
            switch (draw % 5) {
            case 0: case 1: {
                const bool present = oracle.contains(key);
                const bool available = table.size() < table.capacity();
                const bool inserted = table.insert(key, value);
                assert(inserted == (!present && available));
                if (present || available) oracle[key] = value;
                break;
            }
            case 2: assert(table.erase(key) == (oracle.erase(key) != 0)); break;
            case 3:
                if (operation % 13 == 0) table.rehash(std::max<std::size_t>(1, oracle.size() + (draw >> 24) % 8));
                break;
            default: {
                auto found = oracle.find(key);
                assert(table.find(key) == (found == oracle.end() ? std::optional<int>{} : std::optional<int>{found->second}));
            }
            }
            assert(table.valid());
            assert(table.size() == oracle.size());
            assert(table.load_factor() == static_cast<double>(oracle.size()) / table.capacity());
            for (const auto& [stored, mapped] : oracle) assert(table.find(stored) == mapped);
        }
        Table copy(table);
        Table assigned(1);
        assigned = table;
        for (const auto& [key, value] : oracle) {
            assert(copy.find(key) == value && assigned.find(key) == value);
            assert(table.erase(key));
        }
        assert(table.size() == 0 && table.valid());
        assert(copy.size() == oracle.size() && assigned.size() == oracle.size());
        table.rehash(1);
        assert(table.insert("a", 0));
        assert(!table.insert("a", 2) && table.find("a") == 2);
        assert(!table.insert("b", 3));
        assert(table.erase("a") && !table.contains("a"));
        assert(table.insert("b", 3) && table.valid());
        try { table.rehash(0); assert(false); } catch (const std::invalid_argument&) {}
        assert(table.contains("b") && table.valid());
    }
}
static void chaining_oracle() {
    const auto domain = keys();
    hashing::ChainedMap table(1);
    std::map<std::string, int> oracle;
    std::uint32_t seed = 42;
    for (int operation = 0; operation < 4000; ++operation) {
        const auto draw = random_step(seed);
        const auto& key = domain[(draw >> 8) % domain.size()];
        const int value = static_cast<int>((draw >> 16) % 1999) - 999;
        if (draw % 3 == 0) assert(table.erase(key) == (oracle.erase(key) != 0));
        else {
            const bool fresh = !oracle.contains(key);
            assert(table.insert_or_assign(key, value) == fresh);
            oracle[key] = value;
        }
        assert(table.size() == oracle.size());
        for (const auto& candidate : domain) {
            const auto expected = oracle.find(candidate);
            assert(table.find(candidate) == (expected == oracle.end() ? std::optional<int>{} : std::optional<int>{expected->second}));
        }
    }
    std::vector<const hashing::ChainedMap::Node*> addresses;
    for (const auto& bucket : table.buckets()) for (auto* n = bucket.get(); n; n = n->next.get()) addresses.push_back(n);
    table.rehash(table.capacity() * 2);
    for (const auto* original : addresses) {
        bool found = false;
        for (const auto& bucket : table.buckets()) for (auto* n = bucket.get(); n; n = n->next.get()) found |= original == n;
        assert(found);
    }
    table.clear();
    assert(table.size() == 0 && table.insert_or_assign("a", 4));
}
int main() {
    static_assert(std::is_copy_constructible_v<OpenAddressing> && !std::is_move_constructible_v<OpenAddressing>);
    static_assert(std::is_copy_constructible_v<RobinHood> && !std::is_move_constructible_v<RobinHood>);
    static_assert(!std::is_copy_constructible_v<hashing::ChainedMap>);
    probe_oracle<OpenAddressing>();
    probe_oracle<RobinHood>();
    chaining_oracle();
}
