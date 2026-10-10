#include "RobinHood.hpp"
#include <cassert>
#include <iostream>
int main() {
    RobinHood table(8);
    for (const auto* key : {"a", "b", "i", "q"}) assert(table.insert(key, 1));
    assert(table.valid());
    assert(table.erase("i") && table.valid());
    assert(table.contains("b") && table.contains("q"));
    assert(!table.insert("a", 9) && table.find("a") == 9);
    table.rehash(16);
    assert(table.valid());
    RobinHood full(1);
    assert(full.insert("a", 1) && !full.insert("b", 2));
    assert(full.erase("a") && full.valid());
    RobinHood copy = table;
    copy.erase("a");
    assert(table.contains("a"));
    std::cout << "Robin Hood checks passed\n";
}
