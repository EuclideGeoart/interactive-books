#pragma once
#include <array>
#include <cstddef>
#include <stdexcept>
#include <vector>

// Deliberately naive contiguous implementation: front operations expose shifting.
// Owns five live integers. All copy/move operations copy value state safely.
class ArrayDeque {
    std::array<int, 5> data{};
    std::size_t count = 0;
public:
    static constexpr std::size_t capacity = 5;
    ArrayDeque() = default;
    ArrayDeque(const ArrayDeque&) = default;
    ArrayDeque& operator=(const ArrayDeque&) = default;
    ArrayDeque(ArrayDeque&&) = default;
    ArrayDeque& operator=(ArrayDeque&&) = default;
    ~ArrayDeque() = default;
    // @begin push-back
    void push_back(int value) {
        if (count == capacity) { // @trace qb.full
            throw std::overflow_error("deque full"); // @trace qb.throw
        }
        data[count] = value; // @trace qb.write
        ++count; // @trace qb.count
    }
    // @end push-back
    // @begin push-front
    void push_front(int value) {
        if (count == capacity) { // @trace qf.full
            throw std::overflow_error("deque full"); // @trace qf.throw
        }
        std::size_t i = count; // @trace qf.start
        while (i > 0) { // @trace qf.loop
            data[i] = data[i - 1]; // @trace qf.shift
            --i; // @trace qf.previous
        }
        data[0] = value; // @trace qf.write
        ++count; // @trace qf.count
    }
    // @end push-front
    // @begin pop-front
    void pop_front() {
        if (count == 0) { // @trace qo.empty
            throw std::underflow_error("deque empty"); // @trace qo.throw
        }
        std::size_t i = 1; // @trace qo.start
        while (i < count) { // @trace qo.loop
            data[i - 1] = data[i]; // @trace qo.shift
            ++i; // @trace qo.next
        }
        --count; // @trace qo.count
    }
    // @end pop-front
    // @begin pop-back
    void pop_back() {
        if (count == 0) { // @trace qx.empty
            throw std::underflow_error("deque empty"); // @trace qx.throw
        }
        --count; // @trace qx.count
    }
    // @end pop-back
    // @begin front
    int front() const {
        if (count == 0) { // @trace qh.empty
            throw std::underflow_error("deque empty"); // @trace qh.throw
        }
        return data[0]; // @trace qh.return
    }
    // @end front
    // @begin back
    int back() const {
        if (count == 0) { // @trace qt.empty
            throw std::underflow_error("deque empty"); // @trace qt.throw
        }
        return data[count - 1]; // @trace qt.return
    }
    // @end back
    // @begin empty
    bool empty() const noexcept {
        return count == 0; // @trace qe.return
    }
    // @end empty
    // @begin size
    std::size_t size() const noexcept {
        return count; // @trace qs.return
    }
    // @end size
    const std::array<int, 5>& raw_storage() const noexcept { return data; }
    std::vector<int> values() const { return {data.begin(), data.begin() + count}; }
};

// Queue = access policy. The underlying deque owns the storage by value.
// There is intentionally no push_front or pop_back in this public interface.
class Queue {
    ArrayDeque storage;
public:
    void enqueue(int value) { storage.push_back(value); }
    void dequeue() { storage.pop_front(); }
    int front() const { return storage.front(); }
    int back() const { return storage.back(); }
    bool empty() const noexcept { return storage.empty(); }
    std::size_t size() const noexcept { return storage.size(); }
    // Rule of zero: default copy/move/destruction safely delegate to ArrayDeque.
};
