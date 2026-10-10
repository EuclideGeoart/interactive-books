#include "HashTable.hpp"
#include <cassert>
int main() {
    hashing::HashTable map;
    assert(map.insert_or_assign("cat", 42));
    assert(!map.insert_or_assign("cat", 7));
    assert(map.find("cat") == 7 && map.contains("cat"));
    assert(map.size() == 1 && map.capacity() == 8 && map.load_factor() == 0.125);
    assert(map.erase("cat") && map.size() == 0);
}
