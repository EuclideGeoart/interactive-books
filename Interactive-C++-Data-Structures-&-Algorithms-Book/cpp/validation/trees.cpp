#include "../chapter-11/BinarySearchTree.hpp"
#include "../chapter-14/AvlTree.hpp"
#include "../chapter-15/RedBlackTree.hpp"
#include "../chapter-16/BTree.hpp"
#include "../chapter-16/BPlusTree.hpp"
#include <cassert>
#include <climits>
#include <cstdint>
#include <iostream>
#include <set>
#include <type_traits>
#include <vector>

// Integrated, independent ordered-set oracle across all five numeric families.
// This is native validation, not a second implementation of the chapter algorithms.
template <class Tree>
void exercise() {
    static_assert(!std::is_copy_constructible_v<Tree>);
    static_assert(!std::is_move_constructible_v<Tree>);
    Tree tree;
    std::set<int> expected;
    for (int key : {INT_MIN, 0, INT_MAX, -1, 1}) {
        assert(tree.insert(key) == expected.insert(key).second);
        assert(tree.valid());
    }
    std::uint32_t state = 0x41c64e6d;
    for (int step = 0; step != 3000; ++step) {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        const int key = static_cast<int>(state % 257) - 128;
        if (state & 1)
            assert(tree.insert(key) == expected.insert(key).second);
        else
            assert(tree.erase(key) == (expected.erase(key) != 0));
        assert(tree.valid());
        assert(tree.contains(key) == expected.contains(key));
        assert(tree.values() == std::vector<int>(expected.begin(), expected.end()));
    }
    while (!expected.empty()) {
        const auto middle = std::next(expected.begin(), static_cast<std::ptrdiff_t>(expected.size() / 2));
        const int key = *middle;
        assert(tree.erase(key));
        expected.erase(key);
        assert(tree.valid());
        assert(tree.values() == std::vector<int>(expected.begin(), expected.end()));
    }
    assert(tree.empty());
    assert(!tree.erase(INT_MIN));
    tree.insert(42);
    tree.clear();
    tree.clear();
    assert(tree.empty());
    assert(tree.valid());
}
int main() {
    exercise<AvlTree>();
    exercise<RedBlackTree>();
    exercise<BTree>();
    exercise<BPlusTree>();
    BinarySearchTree bst;
    for (int i = 0; i < 4096; ++i)
        assert(bst.insert(i));
    assert(bst.maximum()->value == 4095);
    assert(bst.minimum()->value == 0);
    assert(!bst.insert(2048));
    assert(bst.successor(2048)->value == 2049);
    assert(bst.predecessor(2048)->value == 2047);
    bst.clear();
    assert(!bst.root());
    std::cout << "Integrated trees: deterministic set oracle, 12000 mixed operations, extreme ints, deletion exhaustion, noncopyable ownership and 4096-node skew cleanup passed.\n";
}
