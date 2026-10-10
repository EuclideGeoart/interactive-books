#include "BinaryTree.hpp"
#include <cassert>
int main() {
    BinaryTree tree;
    assert(tree.root() == nullptr);
    for (int value : {65, 66, 67, 68, 69})
        tree.append(value);
    assert(tree.root()->value == 'A');
    assert(tree.root()->left->left->value == 'D');
    assert(tree.root()->left->right->value == 'E');
    tree.clear();
    assert(tree.root() == nullptr);
    tree.clear();
}
