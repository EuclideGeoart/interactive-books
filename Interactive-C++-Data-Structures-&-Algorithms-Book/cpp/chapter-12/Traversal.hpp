#pragma once
#include "../chapter-10/BinaryTree.hpp"
#include <queue>
#include <vector>

namespace tree_traversal {
using Node = BinaryTree::Node;
enum class Order { preorder,
                   inorder,
                   postorder };
// @begin dfs
inline void dfs(const Node* node, Order order, std::vector<int>& output) {
    if (node == nullptr) { // @trace dfs.null
        return;            // @trace dfs.empty-return
    }
    if (order == Order::preorder) {    // @trace dfs.pre
        output.push_back(node->value); // @trace dfs.emit-pre
    }
    dfs(node->left, order, output);    // @trace dfs.left
    if (order == Order::inorder) {     // @trace dfs.in
        output.push_back(node->value); // @trace dfs.emit-in
    }
    dfs(node->right, order, output);   // @trace dfs.right
    if (order == Order::postorder) {   // @trace dfs.post
        output.push_back(node->value); // @trace dfs.emit-post
    }
}
inline std::vector<int> depth_first(const Node* root, Order order) {
    std::vector<int> output;  // @trace dfs.output
    dfs(root, order, output); // @trace dfs.start
    return output;            // @trace dfs.return
}
// @end dfs

// @begin bfs
inline std::vector<int> breadth_first(const Node* root) {
    std::vector<int> output;       // @trace bfs.output
    std::queue<const Node*> queue; // @trace bfs.queue
    if (root != nullptr) {         // @trace bfs.root
        queue.push(root);          // @trace bfs.enqueue-root
    }
    while (!queue.empty()) {                 // @trace bfs.loop
        const Node* current = queue.front(); // @trace bfs.front
        queue.pop();                         // @trace bfs.pop
        output.push_back(current->value);    // @trace bfs.emit
        if (current->left != nullptr) {      // @trace bfs.has-left
            queue.push(current->left);       // @trace bfs.enqueue-left
        }
        if (current->right != nullptr) { // @trace bfs.has-right
            queue.push(current->right);  // @trace bfs.enqueue-right
        }
    }
    return output; // @trace bfs.return
}
// @end bfs
} // namespace tree_traversal
