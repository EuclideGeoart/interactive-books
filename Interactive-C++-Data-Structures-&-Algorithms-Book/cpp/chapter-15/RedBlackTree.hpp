#pragma once
#include <algorithm>
#include <limits>
#include <vector>

// Owning integer set. Actual parent pointers; nullptr is a conceptual black leaf.
class RedBlackTree {
    struct Node {
        int key;
        bool red = true;
        Node* left = nullptr;
        Node* right = nullptr;
        Node* parent = nullptr;
    };
    Node* root = nullptr;
    // @book-debug
    static bool red(Node* n) {
        return n && n->red;
    }
    // @begin rotations
    void rotate(Node* x, bool leftward) {
        Node* y = leftward ? x->right : x->left;        // @trace rb.rotate.pivot
        Node* transfer = leftward ? y->left : y->right; // @trace rb.rotate.transfer
        (leftward ? x->right : x->left) = transfer;     // @trace rb.rotate.detach
        if (transfer) {
            transfer->parent = x; // @trace rb.rotate.transfer-parent
        }
        y->parent = x->parent; // @trace rb.rotate.parent
        if (!x->parent) {
            root = y; // @trace rb.rotate.root
        } else {
            (x == x->parent->left ? x->parent->left : x->parent->right) = y; // @trace rb.rotate.publish
        }
        (leftward ? y->left : y->right) = x; // @trace rb.rotate.attach
        x->parent = y;                       // @trace rb.rotate.old-parent
    }
    // @end rotations
    // @begin repair
    void fix_insert(Node* n) {
        while (n != root && red(n->parent)) {
            Node* p = n->parent;                        // @trace rb.fix.parent
            Node* g = p->parent;                        // @trace rb.fix.grandparent
            bool parent_left = p == g->left;            // @trace rb.fix.side
            Node* u = parent_left ? g->right : g->left; // @trace rb.fix.uncle
            if (red(u)) {
                p->red = false; // @trace rb.fix.parent-black
                u->red = false; // @trace rb.fix.uncle-black
                g->red = true;  // @trace rb.fix.grandparent-red
                n = g;          // @trace rb.fix.ascend
            } else {
                if (n == (parent_left ? p->right : p->left)) {
                    n = p; // @trace rb.fix.triangle
                    rotate(n, parent_left);
                    p = n->parent; // @trace rb.fix.new-parent
                    g = p->parent; // @trace rb.fix.new-grandparent
                }
                p->red = false; // @trace rb.fix.line-black
                g->red = true;  // @trace rb.fix.line-red
                rotate(g, !parent_left);
            }
        }
        root->red = false; // @trace rb.fix.root-black
    }
    // @end repair
    // A null replacement has no parent field: carry its actual parent separately.
    // Full conventional deletion repair, mirrored by choosing near/far children.
    void fix_erase(Node* x, Node* parent) {
        while (x != root && !red(x)) {
            if (!parent)
                break;
            bool left_side = x == parent->left;
            Node* sibling = left_side ? parent->right : parent->left;
            if (red(sibling)) {
                sibling->red = false;
                parent->red = true;
                rotate(parent, left_side);
                sibling = left_side ? parent->right : parent->left;
            }
            if (!sibling) {
                x = parent;
                parent = x->parent;
                continue;
            }
            Node* near = left_side ? sibling->left : sibling->right;
            Node* far = left_side ? sibling->right : sibling->left;
            if (!red(near) && !red(far)) {
                sibling->red = true;
                x = parent;
                parent = x->parent;
            } else {
                if (!red(far)) {
                    if (near)
                        near->red = false;
                    sibling->red = true;
                    rotate(sibling, !left_side);
                    sibling = left_side ? parent->right : parent->left;
                    far = left_side ? sibling->right : sibling->left;
                }
                sibling->red = parent->red;
                parent->red = false;
                if (far)
                    far->red = false;
                rotate(parent, left_side);
                x = root;
                parent = nullptr;
            }
        }
        if (x)
            x->red = false;
    }
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
    static int check(Node* n, Node* parent, long long lo, long long hi) {
        if (!n)
            return 1;
        if (n->parent != parent || n->key <= lo || n->key >= hi || (red(n) && (red(n->left) || red(n->right))))
            return -1;
        int a = check(n->left, n, lo, n->key), b = check(n->right, n, n->key, hi);
        return a < 0 || a != b ? -1 : a + !n->red;
    }

  public:
    RedBlackTree() = default;
    ~RedBlackTree() {
        clear();
    }
    RedBlackTree(const RedBlackTree&) = delete;
    RedBlackTree& operator=(const RedBlackTree&) = delete;
    RedBlackTree(RedBlackTree&&) = delete;
    RedBlackTree& operator=(RedBlackTree&&) = delete;
    // @begin insert
    bool insert(int key) {
        Node* p = nullptr;    // @trace rb.insert.parent
        Node* current = root; // @trace rb.insert.current
        while (current) {
            bool equal = key == current->key; // @trace rb.insert.compare
            if (equal) {
                return false; // @trace rb.insert.duplicate
            }
            p = current;                                                   // @trace rb.insert.save-parent
            current = key < current->key ? current->left : current->right; // @trace rb.insert.advance
        }
        Node* created = new Node{key}; // @trace rb.insert.allocate
        created->parent = p;           // @trace rb.insert.backlink
        if (!p) {
            root = created; // @trace rb.insert.root
        } else {
            (key < p->key ? p->left : p->right) = created; // @trace rb.insert.publish
        }
        fix_insert(created);
        return true; // @trace rb.insert.added
    }
    // @end insert
    // @begin search
    bool contains(int key) const {
        Node* current = root; // @trace rb.search.start
        while (current) {
            bool equal = key == current->key; // @trace rb.search.compare
            if (equal) {
                return true; // @trace rb.search.found
            }
            current = key < current->key ? current->left : current->right; // @trace rb.search.advance
        }
        return false; // @trace rb.search.missing
    }
    // @end search
    // @begin erase
    bool erase(int key) {
        Node* z = root;
        while (z && z->key != key)
            z = key < z->key ? z->left : z->right;
        if (!z)
            return false;
        if (z->left && z->right) {
            Node* successor = z->right;
            while (successor->left)
                successor = successor->left;
            z->key = successor->key;
            z = successor;
        }
        Node* x = z->left ? z->left : z->right;
        Node* parent = z->parent;
        bool removed_red = z->red;
        if (x)
            x->parent = parent;
        if (!parent)
            root = x;
        else
            (z == parent->left ? parent->left : parent->right) = x;
        delete z;
        if (!removed_red)
            fix_erase(x, parent);
        return true;
    }
    // @end erase
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
        return !red(root) && check(root, nullptr, std::numeric_limits<long long>::min(), std::numeric_limits<long long>::max()) >= 0;
    }
};
