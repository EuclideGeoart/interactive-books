#include "PriorityQueue.hpp"
#include <cassert>
#include <utility>
int main() {
    for (bool higher : {false, true}) {
        PriorityQueue q(higher);
        assert(q.empty());
        for (int op = 0; op < 2; ++op) {
            bool caught = false;
            try { if (op == 0) (void)q.peek(); else (void)q.extract(); }
            catch (const std::underflow_error&) { caught = true; }
            assert(caught && q.empty());
        }
        q.insert(10, 5); q.insert(20, 5); q.insert(30, 9); q.insert(40, -2);
        assert(q.size() == 4 && q.peek().value == (higher ? 30 : 40));
        auto copy = q; auto moved = std::move(copy);
        assert(moved.extract().value == (higher ? 30 : 40));
        assert(moved.extract().value == 10); assert(moved.extract().value == 20);
        assert(moved.extract().value == (higher ? 40 : 30)); assert(moved.empty());
        moved = q; PriorityQueue assigned; assigned = std::move(moved);
        assert(assigned.size() == 4 && q.size() == 4);
        // Moved-from objects remain valid and support clear-free reinsertion.
        copy.insert(99, 99); assert(!copy.empty());
    }
}
