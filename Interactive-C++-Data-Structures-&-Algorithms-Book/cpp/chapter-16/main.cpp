#include "BTree.hpp"
#include "BPlusTree.hpp"
#include <cassert>
#include <iostream>
#include <vector>
int main() {
    BTree tree;
    BPlusTree plus;
    for (int key : {20, 40, 5, 10, 25, 30, 50, 60}) {
        assert(tree.insert(key));
        assert(plus.insert(key));
        assert(tree.valid());
        assert(plus.valid());
    }
    assert(!tree.insert(20));
    assert(!plus.insert(20));
    assert(tree.contains(30));
    assert(plus.contains(30));
    assert(plus.range(20, 40) == std::vector<int>({20, 25, 30, 40}));
    for (int key : plus.range(20, 40))
        std::cout << key << ' ';
    std::cout << '\n';
    for (int key : {20, 5, 60, 40, 25, 10, 30, 50}) {
        assert(tree.erase(key));
        assert(plus.erase(key));
        assert(tree.valid());
        assert(plus.valid());
    }
    assert(tree.empty() && plus.empty());
}
