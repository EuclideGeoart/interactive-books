#include "Mutation.hpp"
#include <cassert>
int main() {
    MutationTree tree;
    assert(!tree.erase(5));
    assert(tree.insert(5));
    assert(tree.erase(5) && !tree.root());
    for (int v : {50, 25, 75, 60, 90, 55, 57})
        tree.insert(v);
    assert(tree.erase(90)); // leaf
    assert(tree.erase(55)); // one child
    assert(tree.erase(50)); // two children, deeper successor
    assert(tree.root()->value == 57);
    tree.clear();
    // A skewed tree has no recursive ownership cleanup.
    for (int i = 0; i < 2000; ++i)
        tree.insert(i);
    tree.clear();
    assert(!tree.root());
}
