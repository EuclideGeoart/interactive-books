#pragma once
#include <cstddef>
#include <stdexcept>
#include <vector>

// Owns every node reachable from root_. Child pointers are owning links;
// observer pointers returned by root() must not outlive the tree or erasure.
class BinaryTree {
  public:
    struct Node {
        int value;
        Node* left = nullptr;
        Node* right = nullptr;
        explicit Node(int v)
            : value(v) {}
    };

  protected:
    Node* root_ = nullptr;

  public:
    BinaryTree() = default;
    BinaryTree(const BinaryTree&) = delete;
    BinaryTree& operator=(const BinaryTree&) = delete;
    BinaryTree(BinaryTree&&) = delete;
    BinaryTree& operator=(BinaryTree&&) = delete;
    virtual ~BinaryTree() {
        clear();
    }
    const Node* root() const noexcept {
        return root_;
    }

    // @begin append
    // Complete-tree insertion supplies a SHAPE, not a search ordering.
    void append(int value) {
        Node** slot = &root_;       // @trace append.slot
        std::vector<Node*> queue;   // @trace append.queue
        if (root_ != nullptr) {     // @trace append.root
            queue.push_back(root_); // @trace append.enqueue-root
        }
        std::size_t i = 0;                  // @trace append.index
        while (i < queue.size()) {          // @trace append.loop
            Node* current = queue[i];       // @trace append.current
            if (current->left == nullptr) { // @trace append.left-null
                slot = &current->left;      // @trace append.left-slot
                break;                      // @trace append.left-break
            }
            if (current->right == nullptr) { // @trace append.right-null
                slot = &current->right;      // @trace append.right-slot
                break;                       // @trace append.right-break
            }
            queue.push_back(current->left);  // @trace append.enqueue-left
            queue.push_back(current->right); // @trace append.enqueue-right
            ++i;                             // @trace append.advance
        }
        Node* fresh = new Node(value); // @trace append.allocate
        *slot = fresh;                 // @trace append.publish
    }
    // @end append

    // @begin clear
    // O(n) work, O(1) auxiliary space, no recursive destructor or allocation.
    void clear() noexcept {
        while (root_ != nullptr) {          // @trace clear.loop
            if (root_->left != nullptr) {   // @trace clear.has-left
                Node* pivot = root_->left;  // @trace clear.pivot
                root_->left = pivot->right; // @trace clear.transfer
                pivot->right = root_;       // @trace clear.attach
                root_ = pivot;              // @trace clear.root
            } else {
                Node* old = root_;    // @trace clear.old
                root_ = root_->right; // @trace clear.bypass
                delete old;           // @trace clear.delete
            }
        }
    }
    // @end clear
};
