#include "AvlTree.hpp"
#include <cassert>
#include <iostream>
int main() {
    AvlTree tree;
    for (int key : {30, 20, 10, 25, 40, 50}) {
        assert(tree.insert(key));
        assert(tree.valid());
    }
    assert(!tree.insert(25));
    assert(tree.contains(25));
    assert(tree.erase(30));
    assert(!tree.erase(999));
    assert(tree.valid());
    for (int key : tree.values())
        std::cout << key << ' ';
    std::cout << '\n';
    tree.clear();
    assert(tree.empty());
}
