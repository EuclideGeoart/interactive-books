#include "BinarySearchTree.hpp"
#include <cassert>
int main() {
    BinarySearchTree tree;
    assert(!tree.search(1) && !tree.minimum() && !tree.maximum());
    for (int v : {50, 25, 75, 10, 35, 60, 90, 62})
        assert(tree.insert(v));
    assert(!tree.insert(50));
    assert(tree.search(62)->value == 62);
    assert(tree.minimum()->value == 10 && tree.maximum()->value == 90);
    assert(tree.successor(61)->value == 62 && tree.predecessor(62)->value == 60);
    assert(!tree.successor(90) && !tree.predecessor(10));
    assert(tree.erase(50) && !tree.search(50));
    assert(!tree.erase(999));
    tree.clear();
}
