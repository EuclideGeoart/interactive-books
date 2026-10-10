#include "SinglyLinkedList.hpp"
#include <cassert>
#include <iostream>
#include <type_traits>

int main() {
    static_assert(!std::is_copy_constructible_v<SinglyLinkedList>);
    static_assert(std::is_nothrow_move_constructible_v<SinglyLinkedList>);
    SinglyLinkedList list;
    assert(list.empty());
    assert(!list.erase(7));
    assert(!list.insert_after(7, 8));
    assert(list.find(7) == nullptr);
    list.clear();
    list.insert_tail(20);
    list.insert_head(10);
    list.insert_tail(30);
    assert(list.insert_after(20, 25));
    assert((list.values() == std::vector<int>{10, 20, 25, 30}));
    assert(list.find(25)->data == 25);
    assert(list.erase(10));
    assert(list.erase(25));
    assert(list.erase(30));
    assert(!list.erase(99));
    assert(list.erase(20));
    assert(list.empty());
    list.insert_head(4);
    list.insert_head(4);
    assert(list.erase(4));
    assert((list.values() == std::vector<int>{4}));
    SinglyLinkedList moved(std::move(list));
    assert(list.empty());
    list.insert_head(8);
    list = std::move(moved);
    assert(moved.empty());
    assert((list.values() == std::vector<int>{4}));
    SinglyLinkedList& alias = list;
    list = std::move(alias); // Self move must preserve ownership.
    assert(list.find(4));
    list.clear();
    list.clear();
    for (int i = 0; i < 1024; ++i) list.insert_head(i);
    assert(list.values().size() == 1024);
    std::cout << "Chapter 1: ownership, edge cases, and cleanup passed.\n";
}
