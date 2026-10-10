#include "RedBlackTree.hpp"
#include <cassert>
#include <iostream>
int main() {
    RedBlackTree tree;
    for (int key : {30, 20, 10, 25, 40, 50, 5, 15}) {
        assert(tree.insert(key));
        assert(tree.valid());
    }
    assert(!tree.insert(20));
    assert(tree.contains(25));
    for (int key : {20, 5, 30, 50, 10, 25, 40, 15}) {
        assert(tree.erase(key));
        assert(tree.valid());
    }
    assert(tree.empty());
    assert(!tree.erase(1));
    tree.insert(7);
    std::cout << tree.values().front() << '\n';
}
