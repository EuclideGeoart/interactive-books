#include "OpenAddressing.hpp"
#include <cassert>
#include <iostream>
int main() {
    OpenAddressing table(8);
    for (const auto* key : {"a", "i", "q"}) assert(table.insert(key, 1));
    assert(table.erase("a"));
    assert(!table.insert("q", 9));
    assert(table.size() == 2 && table.find("q") == 9);
    assert(table.insert("y", 4));
    table.rehash(16);
    assert(table.valid() && table.capacity() == 16 && table.contains("i"));
    OpenAddressing full(1);
    assert(full.insert("a", 1) && !full.insert("b", 2));
    assert(!full.contains("z"));
    assert(full.erase("a") && full.insert("b", 2) && full.valid());
    OpenAddressing copy = table;
    copy.erase("i");
    assert(table.contains("i"));
    std::cout << "Open addressing checks passed\n";
}
