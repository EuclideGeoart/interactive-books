#include "Stack.hpp"
#include <cassert>
#include <type_traits>

template<class Exception, class F> void throws(F f) {
    bool caught = false;
    try { f(); } catch (const Exception&) { caught = true; }
    assert(caught);
}
int main() {
    ArrayStack a;
    assert(a.empty());
    throws<std::underflow_error>([&] { a.pop(); });
    throws<std::underflow_error>([&] { (void)a.top(); });
    for (int i = 0; i < a.capacity; ++i) a.push(i + 10);
    throws<std::overflow_error>([&] { a.push(99); });
    assert(a.top_index() == 4 && a.top() == 14);
    a.pop();
    assert(a.top() == 13 && a.raw_storage()[4] == 14);
    a.push(42);
    assert(a.top() == 42);
    a.clear();
    assert(a.empty() && a.raw_storage()[4] == 42);
    LinkedStack l;
    static_assert(!std::is_copy_constructible_v<LinkedStack>);
    static_assert(!std::is_move_constructible_v<LinkedStack>);
    throws<std::underflow_error>([&] { l.pop(); });
    throws<std::underflow_error>([&] { (void)l.top(); });
    for (int i = 0; i < 1024; ++i) l.push(i);
    for (int i = 1023; i >= 0; --i) { assert(l.top() == i); l.pop(); }
    assert(l.empty());
    l.clear();
    l.push(-999); assert(l.top() == -999);
    l.clear(); l.push(10); l.push(20); // Destructor exercises remaining ownership.
}
