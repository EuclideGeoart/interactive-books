#pragma once
#include <algorithm>
#include <limits>
#include <vector>

// Minimum degree t=2: 1..3 keys per nonroot page, 2..4 children.
// Integer set: promoted keys are records, not duplicate routing copies.
class BTree {
    static constexpr int t = 2;
    struct Node {
        bool leaf;
        std::vector<int> keys;
        std::vector<Node*> children;
        explicit Node(bool is_leaf)
            : leaf(is_leaf) {
            keys.reserve(3);
            children.reserve(4);
        }
    };
    Node* root = nullptr;
    // @book-debug
    // @begin split
    void split(Node* parent, int index) {
        Node* full = parent->children[index];                           // @trace bt.split.full
        int median = full->keys[t - 1];                                 // @trace bt.split.median
        Node* created = new Node(full->leaf);                           // @trace bt.split.allocate
        created->keys.assign(full->keys.begin() + t, full->keys.end()); // @trace bt.split.right-keys
        if (!full->leaf) {
            created->children.assign(full->children.begin() + t, full->children.end()); // @trace bt.split.right-children
            full->children.resize(t);                                                   // @trace bt.split.left-children
        }
        full->keys.resize(t - 1);                                               // @trace bt.split.left-keys
        parent->keys.insert(parent->keys.begin() + index, median);              // @trace bt.split.promote
        parent->children.insert(parent->children.begin() + index + 1, created); // @trace bt.split.publish
    }
    // @end split
    // @begin descend
    void add(Node* current, int key) {
        int index = 0; // @trace bt.add.index
        while (index < static_cast<int>(current->keys.size())) {
            bool advance = key > current->keys[index]; // @trace bt.add.compare
            if (!advance)
                break;
            ++index; // @trace bt.add.advance
        }
        if (current->leaf) {
            current->keys.insert(current->keys.begin() + index, key); // @trace bt.add.leaf
        } else {
            if (current->children[index]->keys.size() == 2 * t - 1) {
                split(current, index);
                if (key > current->keys[index]) {
                    ++index; // @trace bt.add.after-split
                }
            }
            Node* child = current->children[index]; // @trace bt.add.child
            add(child, key);
        }
    }
    // @end descend
    static void destroy(Node* n) {
        if (n) {
            for (Node* child : n->children)
                destroy(child);
            delete n;
        }
    }
    static void walk(Node* n, std::vector<int>& out) {
        if (!n)
            return;
        for (std::size_t i = 0; i < n->keys.size(); ++i) {
            if (!n->leaf)
                walk(n->children[i], out);
            out.push_back(n->keys[i]);
        }
        if (!n->leaf)
            walk(n->children.back(), out);
    }
    static void merge(Node* n, int i) {
        Node* a = n->children[i];
        Node* b = n->children[i + 1];
        a->keys.push_back(n->keys[i]);
        a->keys.insert(a->keys.end(), b->keys.begin(), b->keys.end());
        a->children.insert(a->children.end(), b->children.begin(), b->children.end());
        n->keys.erase(n->keys.begin() + i);
        n->children.erase(n->children.begin() + i + 1);
        delete b;
    }
    static bool remove(Node* n, int key) {
        int i = static_cast<int>(std::lower_bound(n->keys.begin(), n->keys.end(), key) - n->keys.begin());
        if (i < static_cast<int>(n->keys.size()) && n->keys[i] == key) {
            if (n->leaf) {
                n->keys.erase(n->keys.begin() + i);
                return true;
            }
            Node* a = n->children[i];
            Node* b = n->children[i + 1];
            if (a->keys.size() >= t) {
                Node* p = a;
                while (!p->leaf)
                    p = p->children.back();
                int v = p->keys.back();
                n->keys[i] = v;
                return remove(a, v);
            }
            if (b->keys.size() >= t) {
                Node* p = b;
                while (!p->leaf)
                    p = p->children.front();
                int v = p->keys.front();
                n->keys[i] = v;
                return remove(b, v);
            }
            merge(n, i);
            return remove(a, key);
        }
        if (n->leaf)
            return false;
        if (n->children[i]->keys.size() == t - 1) {
            Node* c = n->children[i];
            if (i > 0 && n->children[i - 1]->keys.size() >= t) {
                Node* a = n->children[i - 1];
                c->keys.insert(c->keys.begin(), n->keys[i - 1]);
                n->keys[i - 1] = a->keys.back();
                a->keys.pop_back();
                if (!a->leaf) {
                    c->children.insert(c->children.begin(), a->children.back());
                    a->children.pop_back();
                }
            } else if (i < static_cast<int>(n->keys.size()) && n->children[i + 1]->keys.size() >= t) {
                Node* b = n->children[i + 1];
                c->keys.push_back(n->keys[i]);
                n->keys[i] = b->keys.front();
                b->keys.erase(b->keys.begin());
                if (!b->leaf) {
                    c->children.push_back(b->children.front());
                    b->children.erase(b->children.begin());
                }
            } else if (i < static_cast<int>(n->keys.size()))
                merge(n, i);
            else {
                merge(n, i - 1);
                --i;
            }
        }
        return remove(n->children[i], key);
    }
    static bool check(Node* n, bool is_root, long long lo, long long hi, int depth, int& leaf_depth) {
        if (!n || n->keys.empty() || n->keys.size() > 2 * t - 1 || (!is_root && n->keys.size() < t - 1))
            return false;
        for (int k : n->keys) {
            if (k <= lo || k >= hi)
                return false;
            lo = k;
        }
        if (n->leaf) {
            if (!n->children.empty())
                return false;
            if (leaf_depth < 0)
                leaf_depth = depth;
            return leaf_depth == depth;
        }
        if (n->children.size() != n->keys.size() + 1)
            return false;
        return true; // Child ranges are checked by valid_subtree below.
    }
    static bool valid_subtree(Node* n, bool top, long long lo, long long hi, int depth, int& leaf_depth) {
        if (!check(n, top, lo, hi, depth, leaf_depth))
            return false;
        for (std::size_t i = 0; i < n->children.size(); ++i)
            if (!valid_subtree(n->children[i], false, i ? n->keys[i - 1] : lo, i < n->keys.size() ? n->keys[i] : hi, depth + 1, leaf_depth))
                return false;
        return true;
    }

  public:
    BTree() = default;
    ~BTree() {
        clear();
    }
    BTree(const BTree&) = delete;
    BTree& operator=(const BTree&) = delete;
    BTree(BTree&&) = delete;
    BTree& operator=(BTree&&) = delete;
    // @begin search
    bool contains(int key) const {
        Node* current = root; // @trace bt.search.start
        while (current) {
            int index = 0; // @trace bt.search.index
            while (index < static_cast<int>(current->keys.size())) {
                bool advance = key > current->keys[index]; // @trace bt.search.compare
                if (!advance)
                    break;
                ++index; // @trace bt.search.advance
            }
            if (index < static_cast<int>(current->keys.size()) && key == current->keys[index]) {
                return true; // @trace bt.search.found
            }
            current = current->leaf ? nullptr : current->children[index]; // @trace bt.search.child
        }
        return false; // @trace bt.search.missing
    }
    // @end search
    // @begin insert
    bool insert(int key) {
        if (contains(key)) {
            return false; // @trace bt.insert.duplicate
        }
        if (!root) {
            Node* created = new Node(true); // @trace bt.insert.allocate
            root = created;                 // @trace bt.insert.root
        }
        if (root->keys.size() == 2 * t - 1) {
            Node* created = new Node(false);   // @trace bt.insert.new-root
            created->children.push_back(root); // @trace bt.insert.save-root
            try {
                split(created, 0);
            } catch (...) {
                delete created;
                throw;
            }
            root = created; // @trace bt.insert.publish-root
        }
        add(root, key);
        return true; // @trace bt.insert.added
    }
    // @end insert
    bool erase(int key) {
        if (!root)
            return false;
        bool found = remove(root, key);
        if (root->keys.empty()) {
            Node* old = root;
            root = root->leaf ? nullptr : root->children.front();
            delete old;
        }
        return found;
    }
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
        if (!root)
            return true;
        int depth = -1;
        return valid_subtree(root, true, std::numeric_limits<long long>::min(), std::numeric_limits<long long>::max(), 0, depth);
    }
};
