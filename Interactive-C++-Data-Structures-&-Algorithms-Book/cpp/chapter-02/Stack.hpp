#pragma once
#include <array>
#include <cstddef>
#include <stdexcept>
#include <vector>

// The ADT is LIFO. These two classes choose different storage policies.
class ArrayStack {
    std::array<int, 5> data{}; // Real int objects, initially zero; pop does not erase them.
    int topIndex = -1;
public:
    static constexpr int capacity = 5;
    // @begin array-push
    void push(int value) {
        if (topIndex == capacity - 1) { // @trace ap.full
            throw std::overflow_error("stack full"); // @trace ap.overflow
        }
        ++topIndex; // @trace ap.increment
        data[topIndex] = value; // @trace ap.write
    }
    // @end array-push
    // @begin array-pop
    void pop() {
        if (empty()) { // @trace ao.empty
            throw std::underflow_error("stack empty"); // @trace ao.underflow
        }
        --topIndex; // @trace ao.decrement
    }
    // @end array-pop
    // @begin array-top
    int top() const {
        if (empty()) { // @trace at.empty
            throw std::underflow_error("stack empty"); // @trace at.underflow
        }
        return data[topIndex]; // @trace at.return
    }
    // @end array-top
    // @begin array-empty
    bool empty() const noexcept {
        return topIndex == -1; // @trace ae.return
    }
    // @end array-empty
    // @begin array-clear
    void clear() noexcept {
        topIndex = -1; // @trace ac.reset
    }
    // @end array-clear
    int top_index() const noexcept { return topIndex; }
    const std::array<int, 5>& raw_storage() const noexcept { return data; }
    std::vector<int> values() const { return {data.begin(), data.begin() + topIndex + 1}; }
};

class LinkedStack {
    struct Node { int data; Node* next = nullptr; };
    Node* topNode = nullptr;
public:
    LinkedStack() = default;
    LinkedStack(const LinkedStack&) = delete;
    LinkedStack& operator=(const LinkedStack&) = delete;
    LinkedStack(LinkedStack&&) = delete;
    LinkedStack& operator=(LinkedStack&&) = delete;
    ~LinkedStack() { clear(); }
    // @begin linked-push
    void push(int value) {
        Node* newNode = new Node{value}; // @trace lp.allocate
        newNode->next = topNode; // @trace lp.link
        topNode = newNode; // @trace lp.publish
    }
    // @end linked-push
    // @begin linked-pop
    void pop() {
        if (empty()) { // @trace lo.empty
            throw std::underflow_error("stack empty"); // @trace lo.underflow
        }
        Node* oldTop = topNode; // @trace lo.save
        topNode = topNode->next; // @trace lo.advance
        delete oldTop; // @trace lo.delete
    }
    // @end linked-pop
    // @begin linked-top
    int top() const {
        if (empty()) { // @trace lt.empty
            throw std::underflow_error("stack empty"); // @trace lt.underflow
        }
        return topNode->data; // @trace lt.return
    }
    // @end linked-top
    // @begin linked-empty
    bool empty() const noexcept {
        return topNode == nullptr; // @trace le.return
    }
    // @end linked-empty
    // @begin linked-clear
    void clear() noexcept {
        while (topNode != nullptr) { // @trace lc.condition
            Node* oldTop = topNode; // @trace lc.save
            topNode = topNode->next; // @trace lc.advance
            delete oldTop; // @trace lc.delete
        }
    }
    // @end linked-clear
    std::vector<int> values() const {
        std::vector<int> result;
        for (const Node* p = topNode; p; p = p->next) result.push_back(p->data);
        return result;
    }
};
