#pragma once
#include <cassert>
#include <vector>

class DoublyLinkedList {
    struct Node { int data; Node* prev = nullptr; Node* next = nullptr; };
    Node* head = nullptr;
    Node* tail = nullptr;
    // Only accepts a node owned by this list (or nullptr).
    // @begin unlink
    void unlink(Node* curr) noexcept {
        if (curr == nullptr) { // @trace unlink.empty
            return; // @trace unlink.return
        }
        if (curr->prev != nullptr) { // @trace unlink.has-prev
            curr->prev->next = curr->next; // @trace unlink.forward
        } else {
            head = curr->next; // @trace unlink.head
        }
        if (curr->next != nullptr) { // @trace unlink.has-next
            curr->next->prev = curr->prev; // @trace unlink.backward
        } else {
            tail = curr->prev; // @trace unlink.tail
        }
        delete curr; // @trace unlink.delete
    }
    // @end unlink
public:
    DoublyLinkedList() = default;
    DoublyLinkedList(const DoublyLinkedList&) = delete;
    DoublyLinkedList& operator=(const DoublyLinkedList&) = delete;
    DoublyLinkedList(DoublyLinkedList&&) = delete;
    DoublyLinkedList& operator=(DoublyLinkedList&&) = delete;
    ~DoublyLinkedList() { clear(); }
    // @begin push-front
    void push_front(int value) {
        Node* newNode = new Node{value}; // @trace front.allocate
        newNode->next = head; // @trace front.next
        if (head != nullptr) { // @trace front.nonempty
            head->prev = newNode; // @trace front.backlink
        } else {
            tail = newNode; // @trace front.tail
        }
        head = newNode; // @trace front.head
    }
    // @end push-front
    // @begin push-back
    void push_back(int value) {
        Node* newNode = new Node{value}; // @trace back.allocate
        newNode->prev = tail; // @trace back.prev
        if (tail != nullptr) { // @trace back.nonempty
            tail->next = newNode; // @trace back.forward
        } else {
            head = newNode; // @trace back.head
        }
        tail = newNode; // @trace back.tail
    }
    // @end push-back
    // @begin delete-head
    void pop_front() noexcept {
        unlink(head); // @trace pop-front.call
    }
    // @end delete-head
    // @begin delete-tail
    void pop_back() noexcept {
        unlink(tail); // @trace pop-back.call
    }
    // @end delete-tail
    // @begin delete-middle
    bool erase(int value) noexcept {
        Node* curr = head; // @trace erase.start
        while (curr != nullptr) { // @trace erase.condition
            if (curr->data == value) { // @trace erase.compare
                unlink(curr); // @trace erase.call
                return true; // @trace erase.found
            }
            curr = curr->next; // @trace erase.advance
        }
        return false; // @trace erase.missing
    }
    // @end delete-middle
    // @begin forward
    std::vector<int> forward() const {
        std::vector<int> result; // @trace forward.result
        const Node* curr = head; // @trace forward.start
        while (curr != nullptr) { // @trace forward.condition
            result.push_back(curr->data); // @trace forward.visit
            curr = curr->next; // @trace forward.advance
        }
        return result; // @trace forward.return
    }
    // @end forward
    // @begin backward
    std::vector<int> backward() const {
        std::vector<int> result; // @trace backward.result
        const Node* curr = tail; // @trace backward.start
        while (curr != nullptr) { // @trace backward.condition
            result.push_back(curr->data); // @trace backward.visit
            curr = curr->prev; // @trace backward.advance
        }
        return result; // @trace backward.return
    }
    // @end backward
    // @begin clear
    void clear() noexcept {
        while (head != nullptr) { // @trace clear.condition
            unlink(head); // @trace clear.call
        }
    }
    // @end clear
    bool valid() const noexcept {
        if ((head == nullptr) != (tail == nullptr)) return false;
        if (head && head->prev) return false;
        if (tail && tail->next) return false;
        // Cycle check keeps this diagnostic bounded even if a forward link is broken.
        const Node* slow = head;
        const Node* fast = head;
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
            if (slow == fast) return false;
        }
        const Node* previous = nullptr;
        for (const Node* curr = head; curr; curr = curr->next) {
            if (curr->prev != previous) return false;
            previous = curr;
        }
        return previous == tail;
    }
};
