#include "Traversal.hpp"
#include <cassert>
int main() {
    BinaryTree tree;
    using namespace tree_traversal;
    assert(breadth_first(tree.root()).empty());
    for (int v : {65, 66, 67, 68, 69})
        tree.append(v);
    assert((depth_first(tree.root(), Order::preorder) == std::vector<int>{65, 66, 68, 69, 67}));
    assert((depth_first(tree.root(), Order::inorder) == std::vector<int>{68, 66, 69, 65, 67}));
    assert((depth_first(tree.root(), Order::postorder) == std::vector<int>{68, 69, 66, 67, 65}));
    assert((breadth_first(tree.root()) == std::vector<int>{65, 66, 67, 68, 69}));
}
