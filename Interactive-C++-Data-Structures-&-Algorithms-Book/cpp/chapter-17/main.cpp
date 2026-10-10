#include "Trie.hpp"
#include <cassert>
#include <iostream>
#include <vector>
int main() {
    Trie trie;
    for (const char* word : {"cat", "car", "care", "dog"})
        assert(trie.insert(word));
    assert(trie.contains("car"));
    assert(!trie.contains("ca"));
    assert(trie.starts_with("ca"));
    assert(trie.erase("car"));
    assert(trie.contains("care"));
    assert(trie.valid());
    assert(trie.words("ca") == std::vector<std::string>({"care", "cat"}));
    for (const auto& word : trie.words("ca"))
        std::cout << word << '\n';
    assert(trie.insert(""));
    assert(trie.contains(""));
    assert(trie.erase(""));
    trie.clear();
    assert(trie.empty());
}
