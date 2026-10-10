#pragma once
#include <utility>
#include <vector>

// This class exclusively owns its nodes. Pointers returned by find() are borrowed.
class SinglyLinkedList {
public:
    struct Node {
        int data;
        Node* next;
    };

    SinglyLinkedList() = default;
    ~SinglyLinkedList() { clear(); }
    SinglyLinkedList(const SinglyLinkedList&) = delete;
    SinglyLinkedList& operator=(const SinglyLinkedList&) = delete;
    SinglyLinkedList(SinglyLinkedList&& other) noexcept
        : head(std::exchange(other.head, nullptr)) {}
    SinglyLinkedList& operator=(SinglyLinkedList&& other) noexcept {
        if (this != &other) {
            clear();
            head = std::exchange(other.head, nullptr);
        }
        return *this;
    }

    // @begin insert-head
    void insert_head(int value) {
        Node* newNode = new Node{value, nullptr}; // @trace head.allocate
        newNode->next = head; // @trace head.link
        head = newNode; // @trace head.publish
    }
    // @end insert-head

    // @begin insert-tail
    void insert_tail(int value) {
        Node* newNode = new Node{value, nullptr}; // @trace tail.allocate
        if (head == nullptr) { // @trace tail.empty
            head = newNode; // @trace tail.publish
            return;
        }
        Node* current = head; // @trace tail.start
        while (current->next != nullptr) { // @trace tail.condition
            current = current->next; // @trace tail.advance
        }
        current->next = newNode; // @trace tail.link
    }
    // @end insert-tail

    // @begin insert-after
    bool insert_after(int after, int value) {
        Node* current = head; // @trace after.start
        while (current != nullptr) { // @trace after.condition
            if (current->data == after) { // @trace after.compare
                Node* newNode = new Node{value, nullptr}; // @trace after.allocate
                newNode->next = current->next; // @trace after.link
                current->next = newNode; // @trace after.publish
                return true; // @trace after.success
            }
            current = current->next; // @trace after.advance
        }
        return false; // @trace after.missing
    }
    // @end insert-after

    // @begin delete
    bool erase(int value) {
        Node* previous = nullptr; // @trace delete.previous
        Node* current = head; // @trace delete.start
        while (current != nullptr) { // @trace delete.condition
            if (current->data == value) { // @trace delete.compare
                Node* nodeToDelete = current; // @trace delete.save
                if (previous == nullptr) { // @trace delete.is-head
                    head = current->next; // @trace delete.head
                } else {
                    previous->next = current->next; // @trace delete.link
                }
                delete nodeToDelete; // @trace delete.free
                return true; // @trace delete.success
            }
            previous = current; // @trace delete.remember
            current = current->next; // @trace delete.advance
        }
        return false; // @trace delete.missing
    }
    // @end delete

    // @begin search
    const Node* find(int value) const noexcept {
        const Node* current = head; // @trace search.start
        while (current != nullptr) { // @trace search.condition
            if (current->data == value) { // @trace search.compare
                return current; // @trace search.found
            }
            current = current->next; // @trace search.advance
        }
        return nullptr; // @trace search.missing
    }
    // @end search

    // @begin clear
    void clear() noexcept {
        while (head != nullptr) { // @trace clear.condition
            Node* nodeToDelete = head; // @trace clear.save
            head = head->next; // @trace clear.advance
            delete nodeToDelete; // @trace clear.free
        }
    }
    // @end clear

    [[nodiscard]] bool empty() const noexcept { return head == nullptr; }
    [[nodiscard]] std::vector<int> values() const {
        std::vector<int> result;
        for (const Node* current = head; current; current = current->next) {
            result.push_back(current->data);
        }
        return result;
    }

private:
    Node* head = nullptr;
};
