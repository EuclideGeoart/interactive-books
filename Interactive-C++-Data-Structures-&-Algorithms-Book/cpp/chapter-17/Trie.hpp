#pragma once
#include <map>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

// Sparse lowercase ASCII trie; empty string is supported as a terminal root.
class Trie {
    struct Node {
        bool terminal = false;
        std::map<char, Node*> children;
    };
    Node* root = nullptr;
    // @book-debug
    static void validate(std::string_view word) {
        if (word.size() > 64)
            throw std::invalid_argument("Maximum word length is 64");
        for (char c : word)
            if (c < 'a' || c > 'z')
                throw std::invalid_argument("Use lowercase ASCII letters a-z");
    }
    // @begin walk
    Node* follow(std::string_view word) const {
        Node* current = root; // @trace trie.walk.start
        for (char letter : word) {
            if (!current) {
                return nullptr; // @trace trie.walk.absent
            }
            auto at = current->children.find(letter); // @trace trie.walk.compare
            if (at == current->children.end()) {
                return nullptr; // @trace trie.walk.missing
            }
            current = at->second; // @trace trie.walk.advance
        }
        return current; // @trace trie.walk.return
    }
    // @end walk
    // @begin prune
    bool remove(Node* current, std::string_view word, std::size_t depth) {
        if (!current) {
            return false; // @trace trie.erase.empty
        }
        if (depth == word.size()) {
            if (!current->terminal) {
                return false; // @trace trie.erase.not-word
            }
            current->terminal = false; // @trace trie.erase.unmark
            return true;               // @trace trie.erase.removed
        }
        auto at = current->children.find(word[depth]); // @trace trie.erase.compare
        if (at == current->children.end()) {
            return false; // @trace trie.erase.missing
        }
        Node* child = at->second; // @trace trie.erase.child
        bool removed = remove(child, word, depth + 1);
        if (removed && !child->terminal && child->children.empty()) {
            current->children.erase(at); // @trace trie.erase.unlink
            delete child;                // @trace trie.erase.delete
        }
        return removed; // @trace trie.erase.return
    }
    // @end prune
    // Allocation-free rollback removes only newly created, nonterminal dead ends.
    static bool prune_unused(Node* n) {
        for (auto it = n->children.begin(); it != n->children.end();) {
            Node* child = it->second;
            if (prune_unused(child)) {
                it = n->children.erase(it);
                delete child;
            } else
                ++it;
        }
        return !n->terminal && n->children.empty();
    }
    static void destroy(Node* n) {
        if (n) {
            for (auto [c, child] : n->children) {
                (void)c;
                destroy(child);
            }
            delete n;
        }
    }
    static void collect(Node* n, std::string& prefix, std::vector<std::string>& out) {
        if (!n)
            return;
        if (n->terminal)
            out.push_back(prefix);
        for (auto [c, child] : n->children) {
            prefix.push_back(c);
            collect(child, prefix, out);
            prefix.pop_back();
        }
    }
    static bool check(Node* n, bool top) {
        if (!n)
            return top;
        if (!top && !n->terminal && n->children.empty())
            return false;
        for (auto [c, child] : n->children)
            if (c < 'a' || c > 'z' || !child || !check(child, false))
                return false;
        return true;
    }

  public:
    Trie() = default;
    ~Trie() {
        clear();
    }
    Trie(const Trie&) = delete;
    Trie& operator=(const Trie&) = delete;
    Trie(Trie&&) = delete;
    Trie& operator=(Trie&&) = delete;
    // @begin insert
    bool insert(std::string_view word) {
        validate(word);
        try {
            if (!root) {
                Node* created = new Node{}; // @trace trie.insert.root-allocate
                root = created;             // @trace trie.insert.root
            }
            Node* current = root; // @trace trie.insert.start
            for (char letter : word) {
                auto at = current->children.find(letter); // @trace trie.insert.compare
                if (at == current->children.end()) {
                    Node* created = new Node{}; // @trace trie.insert.allocate
                    try {
                        current->children.emplace(letter, created);
                    } catch (...) {
                        delete created;
                        throw;
                    } // @trace trie.insert.link
                }
                current = current->children.at(letter); // @trace trie.insert.advance
            }
            bool added = !current->terminal; // @trace trie.insert.duplicate
            current->terminal = true;        // @trace trie.insert.terminal
            return added;                    // @trace trie.insert.return
        } catch (...) {
            if (root && prune_unused(root)) {
                delete root;
                root = nullptr;
            }
            throw;
        }
    }
    // @end insert
    // @begin search
    bool contains(std::string_view word) const {
        validate(word);
        Node* current = follow(word);
        bool found = current && current->terminal; // @trace trie.search.terminal
        return found;                              // @trace trie.search.return
    }
    bool starts_with(std::string_view prefix) const {
        validate(prefix);
        Node* current = follow(prefix);
        return current != nullptr; // @trace trie.prefix.return
    }
    // @end search
    // @begin erase
    bool erase(std::string_view word) {
        validate(word);
        bool removed = remove(root, word, 0);
        if (root && !root->terminal && root->children.empty()) {
            Node* old = root; // @trace trie.erase.old-root
            root = nullptr;   // @trace trie.erase.root
            delete old;       // @trace trie.erase.root-delete
        }
        return removed; // @trace trie.erase.done
    }
    // @end erase
    std::vector<std::string> words(std::string_view prefix = {}) const {
        validate(prefix);
        Node* n = follow(prefix);
        std::string path(prefix);
        std::vector<std::string> out;
        collect(n, path, out);
        return out;
    }
    bool empty() const {
        return !root;
    }
    void clear() {
        destroy(root);
        root = nullptr;
    }
    bool valid() const {
        return check(root, true);
    }
};
