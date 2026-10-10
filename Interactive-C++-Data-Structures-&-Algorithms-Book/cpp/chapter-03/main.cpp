#include "DoublyLinkedList.hpp"
#include <algorithm>
#include <type_traits>

void check(const DoublyLinkedList& list, std::vector<int> expected) {
    assert(list.valid()); assert(list.forward() == expected);
    std::reverse(expected.begin(), expected.end()); assert(list.backward() == expected);
}
int main() {
    static_assert(!std::is_copy_constructible_v<DoublyLinkedList>);
    static_assert(!std::is_move_constructible_v<DoublyLinkedList>);
    DoublyLinkedList list;
    list.pop_front(); list.pop_back(); list.clear(); assert(!list.erase(7)); check(list, {});
    list.push_front(10); check(list, {10}); list.pop_back(); check(list, {});
    list.push_back(10); check(list, {10}); list.pop_front(); check(list, {});
    list.push_back(10); list.push_back(20); list.push_back(30); check(list, {10,20,30});
    assert(list.erase(20)); check(list, {10,30});
    assert(list.erase(10)); check(list, {30}); assert(list.erase(30)); check(list, {});
    list.push_front(10); list.push_front(10); list.push_back(20);
    assert(list.erase(10)); check(list, {10,20}); assert(!list.erase(99)); check(list, {10,20});
    list.clear(); check(list, {});
    for (int i=0; i<1024; ++i) list.push_back(i);
    assert(list.valid()); list.clear(); check(list, {});
    list.push_front(-999); list.push_back(999); check(list, {-999,999}); // Destructor owns both nodes.
}
