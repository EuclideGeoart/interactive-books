#pragma once
#include <algorithm>
#include <limits>
#include <vector>

// Leaf records are integer keys. Maximum 3 records/leaf, 4 children/internal page.
// Nonroot pages hold 1..3 keys (top-down splitting); root may be a leaf.
// Separator i is the minimum record in child i+1; linked leaves own no neighbors.
class BPlusTree {
    struct Node {
        bool leaf;
        std::vector<int> keys;
        std::vector<Node*> children;
        Node* next = nullptr;
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
        Node* full = parent->children[index];                                              // @trace bp.split.full
        int separator = full->keys[1];                                                     // @trace bp.split.separator
        Node* created = new Node(full->leaf);                                              // @trace bp.split.allocate
        created->keys.assign(full->keys.begin() + (full->leaf ? 1 : 2), full->keys.end()); // @trace bp.split.right-keys
        if (full->leaf) {
            created->next = full->next; // @trace bp.split.next
            full->next = created;       // @trace bp.split.link
        } else {
            created->children.assign(full->children.begin() + 2, full->children.end()); // @trace bp.split.right-children
            full->children.resize(2);                                                   // @trace bp.split.left-children
        }
        full->keys.resize(1);                                                   // @trace bp.split.left-keys
        parent->keys.insert(parent->keys.begin() + index, separator);           // @trace bp.split.promote
        parent->children.insert(parent->children.begin() + index + 1, created); // @trace bp.split.publish
    }
    // @end split
    // @begin descend
    void add(Node* current, int key) {
        int index = static_cast<int>(std::upper_bound(current->keys.begin(), current->keys.end(), key) - current->keys.begin()); // @trace bp.add.index
        if (current->leaf) {
            current->keys.insert(current->keys.begin() + index, key); // @trace bp.add.record
        } else {
            if (current->children[index]->keys.size() == 3) {
                split(current, index);
                if (key >= current->keys[index]) {
                    ++index; // @trace bp.add.after-split
                }
            }
            Node* child = current->children[index]; // @trace bp.add.child
            add(child, key);
        }
    }
    // @end descend
    static void destroy(Node* n) {
        if (n) {
            for (Node* c : n->children)
                destroy(c);
            delete n;
        }
    }
    static bool check(Node* n, bool /*top*/, int depth, int& leaf_depth, std::vector<Node*>& leaves, int& minimum, int& maximum) {
        if (!n || n->keys.empty() || n->keys.size() > 3)
            return false;
        for (std::size_t i = 1; i < n->keys.size(); ++i)
            if (n->keys[i - 1] >= n->keys[i])
                return false;
        if (n->leaf) {
            if (!n->children.empty())
                return false;
            if (leaf_depth < 0)
                leaf_depth = depth;
            if (leaf_depth != depth)
                return false;
            leaves.push_back(n);
            minimum = n->keys.front();
            maximum = n->keys.back();
            return true;
        }
        if (n->next || n->children.size() != n->keys.size() + 1)
            return false;
        int prior = 0;
        for (std::size_t i = 0; i < n->children.size(); ++i) {
            int low = 0, high = 0;
            if (!check(n->children[i], false, depth + 1, leaf_depth, leaves, low, high))
                return false;
            if (i == 0)
                minimum = low;
            else if (n->keys[i - 1] != low || prior >= low)
                return false;
            prior = high;
            maximum = high;
        }
        return true;
    }

  public:
    BPlusTree() = default;
    ~BPlusTree() {
        clear();
    }
    BPlusTree(const BPlusTree&) = delete;
    BPlusTree& operator=(const BPlusTree&) = delete;
    BPlusTree(BPlusTree&&) = delete;
    BPlusTree& operator=(BPlusTree&&) = delete;
    // @begin search
    bool contains(int key) const {
        Node* current = root; // @trace bp.search.start
        while (current && !current->leaf) {
            int index = static_cast<int>(std::upper_bound(current->keys.begin(), current->keys.end(), key) - current->keys.begin()); // @trace bp.search.index
            current = current->children[index];                                                                                      // @trace bp.search.child
        }
        bool found = current && std::binary_search(current->keys.begin(), current->keys.end(), key); // @trace bp.search.compare
        return found;                                                                                // @trace bp.search.return
    }
    // @end search
    // @begin insert
    bool insert(int key) {
        if (contains(key)) {
            return false; // @trace bp.insert.duplicate
        }
        if (!root) {
            Node* created = new Node(true); // @trace bp.insert.allocate
            root = created;                 // @trace bp.insert.root
        }
        if (root->keys.size() == 3) {
            Node* created = new Node(false);   // @trace bp.insert.new-root
            created->children.push_back(root); // @trace bp.insert.left
            try {
                split(created, 0);
            } catch (...) {
                delete created;
                throw;
            }
            root = created; // @trace bp.insert.publish
        }
        add(root, key);
        return true; // @trace bp.insert.added
    }
    // @end insert
    // @begin range
    std::vector<int> range(int low, int high) const {
        std::vector<int> out;
        Node* current = root; // @trace bp.range.start
        if (low > high)
            return out;
        while (current && !current->leaf) {
            int index = static_cast<int>(std::upper_bound(current->keys.begin(), current->keys.end(), low) - current->keys.begin()); // @trace bp.range.index
            current = current->children[index];                                                                                      // @trace bp.range.child
        }
        while (current) {
            for (int key : current->keys) {
                if (key > high) {
                    return out; // @trace bp.range.stop
                }
                if (key >= low) {
                    out.push_back(key); // @trace bp.range.record
                }
            }
            current = current->next; // @trace bp.range.next
        }
        return out; // @trace bp.range.return
    }
    // @end range
    // ponytail: erase rebuilds in O(n log n), preserving all invariants and leaf links.
    // Use in-place borrowing/merging if deletion throughput becomes a requirement.
    bool erase(int key) {
        auto all = values();
        auto at = std::lower_bound(all.begin(), all.end(), key);
        if (at == all.end() || *at != key)
            return false;
        all.erase(at);
        BPlusTree replacement;
        for (int value : all)
            replacement.insert(value);
        std::swap(root, replacement.root);
        return true;
    }
    void clear() {
        destroy(root);
        root = nullptr;
    }
    bool empty() const {
        return root == nullptr;
    }
    std::vector<int> values() const {
        return range(std::numeric_limits<int>::min(), std::numeric_limits<int>::max());
    }
    bool valid() const {
        if (!root)
            return true;
        int depth = -1, lo = 0, hi = 0;
        std::vector<Node*> leaves;
        if (!check(root, true, 0, depth, leaves, lo, hi))
            return false;
        for (std::size_t i = 0; i < leaves.size(); ++i)
            if (leaves[i]->next != (i + 1 < leaves.size() ? leaves[i + 1] : nullptr))
                return false;
        return true;
    }
};
