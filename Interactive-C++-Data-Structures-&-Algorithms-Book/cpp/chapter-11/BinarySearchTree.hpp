#pragma once
#include "../chapter-10/BinaryTree.hpp"

// Integer set: equality rejects insertion. Inherits ownership, not append API.
class BinarySearchTree : private BinaryTree {
  public:
    using BinaryTree::clear;
    using BinaryTree::Node;
    using BinaryTree::root;
    BinarySearchTree() = default;

    // @begin insert
    bool insert(int value) {
        Node** slot = &root_;              // @trace insert.slot
        while (*slot != nullptr) {         // @trace insert.loop
            if (value == (*slot)->value) { // @trace insert.equal
                return false;              // @trace insert.duplicate
            }
            if (value < (*slot)->value) { // @trace insert.less
                slot = &(*slot)->left;    // @trace insert.left
            } else {
                slot = &(*slot)->right; // @trace insert.right
            }
        }
        Node* fresh = new Node(value); // @trace insert.allocate
        *slot = fresh;                 // @trace insert.publish
        return true;                   // @trace insert.return
    }
    // @end insert

    // @begin search
    const Node* search(int value) const noexcept {
        const Node* current = root_;       // @trace search.current
        while (current != nullptr) {       // @trace search.loop
            if (value == current->value) { // @trace search.equal
                return current;            // @trace search.found
            }
            if (value < current->value) { // @trace search.less
                current = current->left;  // @trace search.left
            } else {
                current = current->right; // @trace search.right
            }
        }
        return nullptr; // @trace search.missing
    }
    // @end search

    // @begin minimum
    const Node* minimum() const noexcept {
        const Node* current = root_; // @trace minimum.current
        if (current == nullptr) {    // @trace minimum.empty
            return nullptr;          // @trace minimum.missing
        }
        while (current->left != nullptr) { // @trace minimum.loop
            current = current->left;       // @trace minimum.left
        }
        return current; // @trace minimum.return
    }
    // @end minimum

    // @begin maximum
    const Node* maximum() const noexcept {
        const Node* current = root_; // @trace maximum.current
        if (current == nullptr) {    // @trace maximum.empty
            return nullptr;          // @trace maximum.missing
        }
        while (current->right != nullptr) { // @trace maximum.loop
            current = current->right;       // @trace maximum.right
        }
        return current; // @trace maximum.return
    }
    // @end maximum

    // @begin successor
    // Strict upper bound: also defined for an absent query value.
    const Node* successor(int value) const noexcept {
        const Node* current = root_;      // @trace successor.current
        const Node* candidate = nullptr;  // @trace successor.candidate
        while (current != nullptr) {      // @trace successor.loop
            if (value < current->value) { // @trace successor.less
                candidate = current;      // @trace successor.save
                current = current->left;  // @trace successor.left
            } else {
                current = current->right; // @trace successor.right
            }
        }
        return candidate; // @trace successor.return
    }
    // @end successor

    // @begin predecessor
    // Strict lower bound: also defined for an absent query value.
    const Node* predecessor(int value) const noexcept {
        const Node* current = root_;      // @trace predecessor.current
        const Node* candidate = nullptr;  // @trace predecessor.candidate
        while (current != nullptr) {      // @trace predecessor.loop
            if (value > current->value) { // @trace predecessor.greater
                candidate = current;      // @trace predecessor.save
                current = current->right; // @trace predecessor.right
            } else {
                current = current->left; // @trace predecessor.left
            }
        }
        return candidate; // @trace predecessor.return
    }
    // @end predecessor

    // @begin erase
    bool erase(int value) noexcept {
        Node** slot = &root_;              // @trace erase.slot
        while (*slot != nullptr) {         // @trace erase.loop
            if (value == (*slot)->value) { // @trace erase.equal
                break;                     // @trace erase.found
            }
            if (value < (*slot)->value) { // @trace erase.less
                slot = &(*slot)->left;    // @trace erase.left
            } else {
                slot = &(*slot)->right; // @trace erase.right
            }
        }
        if (*slot == nullptr) { // @trace erase.missing
            return false;       // @trace erase.absent
        }
        Node* victim = *slot;                                      // @trace erase.victim
        if (victim->left != nullptr && victim->right != nullptr) { // @trace erase.two
            Node** successorSlot = &victim->right;                 // @trace erase.successor-slot
            while ((*successorSlot)->left != nullptr) {            // @trace erase.successor-loop
                successorSlot = &(*successorSlot)->left;           // @trace erase.successor-left
            }
            Node* successor = *successorSlot;  // @trace erase.successor
            victim->value = successor->value;  // @trace erase.copy-value
            *successorSlot = successor->right; // @trace erase.successor-bypass
            delete successor;                  // @trace erase.successor-delete
        } else {
            Node* replacement = victim->left; // @trace erase.replacement
            if (replacement == nullptr) {     // @trace erase.no-left
                replacement = victim->right;  // @trace erase.use-right
            }
            *slot = replacement; // @trace erase.bypass
            delete victim;       // @trace erase.delete
        }
        return true; // @trace erase.return
    }
    // @end erase
};
