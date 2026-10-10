#include "QueueDeque.hpp"
#include <cassert>
#include <utility>

template<class Error, class Function> void throws(Function action) {
    bool caught = false;
    try { action(); } catch (const Error&) { caught = true; }
    assert(caught);
}
int main() {
    ArrayDeque deque;
    assert(deque.empty() && deque.size() == 0);
    throws<std::underflow_error>([&] { deque.pop_front(); });
    throws<std::underflow_error>([&] { deque.pop_back(); });
    throws<std::underflow_error>([&] { (void)deque.front(); });
    throws<std::underflow_error>([&] { (void)deque.back(); });
    for (int value : {10,20,30}) deque.push_back(value);
    deque.push_front(5);
    assert((deque.values() == std::vector<int>{5,10,20,30}));
    deque.pop_front(); deque.pop_back();
    assert(deque.front() == 10 && deque.back() == 20);
    deque.push_front(-999); deque.push_back(999); deque.push_back(0);
    const auto before = deque.raw_storage();
    throws<std::overflow_error>([&] { deque.push_front(42); });
    throws<std::overflow_error>([&] { deque.push_back(42); });
    assert(deque.raw_storage() == before && deque.size() == 5);
    ArrayDeque copy = deque;
    copy.pop_back(); assert(deque.size() == 5);
    ArrayDeque moved = std::move(copy); assert(moved.size() == 4 && copy.size() == 4);
    copy = deque; moved = std::move(copy); assert(moved.size() == 5);
    while (!deque.empty()) deque.pop_front();
    deque.push_front(7); assert(deque.front() == 7 && deque.back() == 7);
    deque.pop_back(); assert(deque.empty());
    deque.push_back(7); deque.pop_front(); assert(deque.empty());
    // Duplicate payloads do not change membership mechanics.
    deque.push_front(7); deque.push_front(7); deque.pop_front(); assert(deque.size() == 1);
    Queue queue;
    for (int value : {1,2,3,4,5}) queue.enqueue(value);
    throws<std::overflow_error>([&] { queue.enqueue(6); });
    assert(queue.size() == 5 && queue.back() == 5);
    Queue queue_copy = queue;
    for (int expected : {1,2,3,4,5}) { assert(queue.front() == expected); queue.dequeue(); }
    assert(queue.empty() && queue_copy.size() == 5);
    throws<std::underflow_error>([&] { queue.dequeue(); });
}
