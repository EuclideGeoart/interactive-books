#pragma once
#include <algorithm>
#include <cstdlib>
#include <limits>
#include <vector>

// An owning integer set. nullptr has height 0; a leaf has height 1.
class AvlTree {
    struct Node {
        int key;
        Node* left = nullptr;
        Node* right = nullptr;
        int height = 1;
    };
    Node* root = nullptr;
    // @book-debug
    static int height(Node* n) {
        return n ? n->height : 0;
    }
    static int balance(Node* n) {
        return n ? height(n->left) - height(n->right) : 0;
    }
    // @begin rotations
    Node* right(Node* x) {
        Node* y = x->left;                                           // @trace avl.right.pivot
        Node* transfer = y->right;                                   // @trace avl.right.transfer
        x->left = transfer;                                          // @trace avl.right.detach
        y->right = x;                                                // @trace avl.right.attach
        x->height = 1 + std::max(height(x->left), height(x->right)); // @trace avl.right.old-height
        y->height = 1 + std::max(height(y->left), height(y->right)); // @trace avl.right.new-height
        return y;                                                    // @trace avl.right.return
    }
    Node* left(Node* x) {
        Node* y = x->right;                                          // @trace avl.left.pivot
        Node* transfer = y->left;                                    // @trace avl.left.transfer
        x->right = transfer;                                         // @trace avl.left.detach
        y->left = x;                                                 // @trace avl.left.attach
        x->height = 1 + std::max(height(x->left), height(x->right)); // @trace avl.left.old-height
        y->height = 1 + std::max(height(y->left), height(y->right)); // @trace avl.left.new-height
        return y;                                                    // @trace avl.left.return
    }
    // @end rotations
    // @begin rebalance
    void repair(Node*& slot) {
        Node* n = slot; // @trace avl.repair.node
        if (!n)
            return;
        n->height = 1 + std::max(height(n->left), height(n->right)); // @trace avl.repair.height
        int b = balance(n);                                          // @trace avl.repair.balance
        if (b > 1) {
            if (balance(n->left) < 0) {
                n->left = left(n->left); // @trace avl.repair.lr
            }
            slot = right(n); // @trace avl.repair.right
        } else if (b < -1) {
            if (balance(n->right) > 0) {
                n->right = right(n->right); // @trace avl.repair.rl
            }
            slot = left(n); // @trace avl.repair.left
        }
    }
    // @end rebalance
    // @begin insert
    bool add(Node*& slot, int key) {
        Node* current = slot; // @trace avl.insert.current
        if (!current) {
            Node* created = new Node{key}; // @trace avl.insert.allocate
            slot = created;                // @trace avl.insert.publish
            return true;                   // @trace avl.insert.added
        }
        if (key == current->key) {
            return false; // @trace avl.insert.duplicate
        }
        bool smaller = key < current->key; // @trace avl.insert.compare
        bool changed = add(smaller ? current->left : current->right, key);
        repair(slot);
        return changed;
    }
    // @end insert
    // @begin erase
    bool remove(Node*& slot, int key) {
        Node* current = slot; // @trace avl.erase.current
        if (!current) {
            return false; // @trace avl.erase.missing
        }
        bool smaller = key < current->key; // @trace avl.erase.compare
        bool changed;
        if (key != current->key)
            changed = remove(smaller ? current->left : current->right, key);
        else {
            if (!current->left || !current->right) {
                slot = current->left ? current->left : current->right; // @trace avl.erase.bypass
                delete current;                                        // @trace avl.erase.delete
                return true;                                           // @trace avl.erase.removed
            }
            Node* successor = current->right; // @trace avl.erase.successor
            while (successor->left) {
                successor = successor->left; // @trace avl.erase.advance
            }
            current->key = successor->key; // @trace avl.erase.copy
            changed = remove(current->right, successor->key);
        }
        repair(slot);
        return changed;
    }
    // @end erase
    static void destroy(Node* n) {
        if (n) {
            destroy(n->left);
            destroy(n->right);
            delete n;
        }
    }
    static void walk(Node* n, std::vector<int>& out) {
        if (n) {
            walk(n->left, out);
            out.push_back(n->key);
            walk(n->right, out);
        }
    }
    static int check(Node* n, long long low, long long high) {
        if (!n)
            return 0;
        if (n->key <= low || n->key >= high)
            return -1;
        int a = check(n->left, low, n->key), b = check(n->right, n->key, high);
        if (a < 0 || b < 0 || std::abs(a - b) > 1 || n->height != 1 + std::max(a, b))
            return -1;
        return n->height;
    }

  public:
    AvlTree() = default;
    ~AvlTree() {
        clear();
    }
    AvlTree(const AvlTree&) = delete;
    AvlTree& operator=(const AvlTree&) = delete;
    AvlTree(AvlTree&&) = delete;
    AvlTree& operator=(AvlTree&&) = delete;
    bool insert(int key) {
        return add(root, key);
    }
    bool erase(int key) {
        return remove(root, key);
    }
    // @begin search
    bool contains(int key) const {
        Node* current = root; // @trace avl.search.start
        while (current) {
            bool equal = key == current->key; // @trace avl.search.compare
            if (equal) {
                return true; // @trace avl.search.found
            }
            current = key < current->key ? current->left : current->right; // @trace avl.search.advance
        }
        return false; // @trace avl.search.missing
    }
    // @end search
    void clear() {
        destroy(root);
        root = nullptr;
    }
    bool empty() const {
        return root == nullptr;
    }
    std::vector<int> values() const {
        std::vector<int> out;
        walk(root, out);
        return out;
    }
    bool valid() const {
        return check(root, std::numeric_limits<long long>::min(), std::numeric_limits<long long>::max()) >= 0;
    }
};
