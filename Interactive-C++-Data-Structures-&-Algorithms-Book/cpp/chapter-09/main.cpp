#include "BinaryHeap.hpp"
#include <algorithm>
#include <cassert>
#include <utility>
void check(const BinaryHeap& heap, bool max) {
    const auto& a = heap.values();
    for (std::size_t i = 1; i < a.size(); ++i) assert(max ? a[(i - 1) / 2] >= a[i] : a[(i - 1) / 2] <= a[i]);
}
int main() {
    for (bool max : {false, true}) {
        BinaryHeap h(max);
        for (int op = 0; op < 2; ++op) {
            bool caught = false;
            try { if (op == 0) (void)h.peek(); else (void)h.extract(); }
            catch (const std::underflow_error&) { caught = true; }
            assert(caught && h.empty());
        }
        std::vector<int> input{4, -9, 7, 7, 0, 999, -999, 3, 2, 1};
        h.buildHeap(input); check(h, max);
        auto copy = h; auto moved = std::move(copy);
        std::sort(input.begin(), input.end()); if (max) std::reverse(input.begin(), input.end());
        for (int v : input) { assert(moved.peek() == v); assert(moved.extract() == v); check(moved, max); }
        assert(moved.empty());
        for (int v : input) { moved.insert(v); check(moved, max); }
        assert(moved.size() == input.size()); moved = h; copy = std::move(moved); check(copy, max);
        h.buildHeap({}); h.insert(42); assert(h.extract() == 42 && h.empty());
        for (int n = 0; n <= 100; ++n) {
            std::vector<int> values; for (int i = 0; i < n; ++i) values.push_back((i * 17) % 31 - 15);
            h.buildHeap(values); check(h, max); while (!h.empty()) { (void)h.extract(); check(h, max); }
        }
    }
}
