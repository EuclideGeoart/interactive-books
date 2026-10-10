#include "ChainedMap.hpp"
#include <cassert>
#include <type_traits>
int main() {
    static_assert(!std::is_copy_constructible_v<hashing::ChainedMap>);
    static_assert(!std::is_move_constructible_v<hashing::ChainedMap>);
    hashing::ChainedMap map;
    assert(!map.find("a"));
    for (const auto* key : {"a", "i", "q", "b", "c", "d"}) assert(map.insert_or_assign(key, 1));
    const auto* address = map.buckets()[1].get();
    assert(!map.insert_or_assign("a", 7));
    assert(map.size() == 6 && map.capacity() == 8);
    assert(map.insert_or_assign("e", 9));
    assert(map.capacity() == 16 && map.find("a") == 7);
    bool retained = false;
    for (const auto& head : map.buckets()) for (auto* n = head.get(); n; n = n->next.get()) retained |= n == address;
    assert(retained);
    assert(map.erase("a") && !map.erase("a"));
    map.rehash(32);
    assert(map.size() == 6 && map.contains("q"));
    map.clear();
    assert(map.size() == 0 && !map.contains("q"));
    assert(map.insert_or_assign("z", 0) && map.find("z") == 0);
    try { map.insert_or_assign("BAD", 1); assert(false); } catch (const std::invalid_argument&) {}
    assert(map.size() == 1);
}
