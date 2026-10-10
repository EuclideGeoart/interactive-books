#include "UnorderedMap.hpp"
#include <cassert>
#include <cmath>
#include <iostream>
int main() {
    TeachingMap map;
    map_insert(map, "cat", 3);
    map_insert(map, "dog", 4);
    int* saved = &map.at("cat");
    map_reserve(map, 32);
    assert(saved == &map.at("cat") && *saved == 3);
    assert(map.bucket_count() >= static_cast<std::size_t>(std::ceil(32 / map.max_load_factor())));
    map_rehash(map, 64);
    assert(map.bucket_count() >= 64 && saved == &map.at("cat"));
    assert(map.load_factor() <= map.max_load_factor());
    map_max_load(map, 0.5f); // Hint; query the accepted value before making capacity calculations.
    map_reserve(map, 64);
    assert(map.bucket_count() >= static_cast<std::size_t>(std::ceil(64 / map.max_load_factor())));
    map_insert(map, "cat", 9);
    assert(*saved == 9);
    map_erase(map, "dog");
    assert(map_contains(map, "cat") && !map_contains(map, "dog"));
    std::unordered_map<PointKey, int, PointHash> points;
    points[{1, 2}] = 7;
    assert(points.at(PointKey{1, 2}) == 7);
    assert(point_hash_contract({1, 2}, {1, 2}));
    assert(point_hash_contract({1, 2}, {0, 33})); // Unequal keys may collide.
    std::cout << "unordered_map contract checks passed; bucket count is implementation-selected\n";
}
