#pragma once
#include <array>
#include <cstddef>
#include <stdexcept>
#include <vector>

// Fixed, count-based, integer-only, single-threaded owning container.
// Equal head/tail indices mean empty OR full; count distinguishes them.
class RingBuffer {
    std::array<int, 5> data{};
    std::size_t head = 0;
    std::size_t tail = 0;
    std::size_t count = 0;
public:
    static constexpr std::size_t capacity = 5;
    enum class Policy { reject, overwrite };
    RingBuffer() = default;
    RingBuffer(const RingBuffer&) = default;
    RingBuffer& operator=(const RingBuffer&) = default;
    RingBuffer(RingBuffer&&) = default;
    RingBuffer& operator=(RingBuffer&&) = default;
    ~RingBuffer() = default;
    // @begin push
    void push(int value, Policy policy = Policy::reject) {
        if (count == capacity) { // @trace rp.full
            if (policy == Policy::reject) { // @trace rp.policy
                throw std::overflow_error("ring full"); // @trace rp.throw
            }
            head = (head + 1) % capacity; // @trace rp.discard
            --count; // @trace rp.reduce
        }
        data[tail] = value; // @trace rp.write
        tail = (tail + 1) % capacity; // @trace rp.wrap
        ++count; // @trace rp.count
    }
    // @end push
    // @begin pop
    void pop() {
        if (count == 0) { // @trace ro.empty
            throw std::underflow_error("ring empty"); // @trace ro.throw
        }
        head = (head + 1) % capacity; // @trace ro.wrap
        --count; // @trace ro.count
    }
    // @end pop
    // @begin front
    int front() const {
        if (count == 0) { // @trace rf.empty
            throw std::underflow_error("ring empty"); // @trace rf.throw
        }
        return data[head]; // @trace rf.return
    }
    // @end front
    // @begin back
    int back() const {
        if (count == 0) { // @trace rb.empty
            throw std::underflow_error("ring empty"); // @trace rb.throw
        }
        return data[(tail + capacity - 1) % capacity]; // @trace rb.return
    }
    // @end back
    // @begin empty
    bool empty() const noexcept {
        return count == 0; // @trace re.return
    }
    // @end empty
    // @begin size
    std::size_t size() const noexcept {
        return count; // @trace rs.return
    }
    // @end size
    // @begin full
    bool full() const noexcept {
        return count == capacity; // @trace ru.return
    }
    // @end full
    std::size_t read_index() const noexcept { return head; }
    std::size_t write_index() const noexcept { return tail; }
    const std::array<int, 5>& raw_storage() const noexcept { return data; }
    std::vector<int> values() const {
        std::vector<int> result;
        for (std::size_t i = 0; i < count; ++i) result.push_back(data[(head + i) % capacity]);
        return result;
    }
};

// Alternative full/empty encoding: sacrifice one physical slot, omit count.
// Five live int objects, four usable queue positions. Same value ownership policy.
class SentinelRing {
    std::array<int, 5> data{};
    std::size_t head = 0;
    std::size_t tail = 0;
public:
    static constexpr std::size_t capacity = 5;
    static constexpr std::size_t usable_capacity = capacity - 1;
    bool empty() const noexcept { return head == tail; }
    bool full() const noexcept { return (tail + 1) % capacity == head; }
    std::size_t size() const noexcept { return (tail + capacity - head) % capacity; }
    void push(int value) {
        if (full()) throw std::overflow_error("sentinel ring full");
        data[tail] = value;
        tail = (tail + 1) % capacity;
    }
    void pop() {
        if (empty()) throw std::underflow_error("sentinel ring empty");
        head = (head + 1) % capacity;
    }
    int front() const {
        if (empty()) throw std::underflow_error("sentinel ring empty");
        return data[head];
    }
    int back() const {
        if (empty()) throw std::underflow_error("sentinel ring empty");
        return data[(tail + capacity - 1) % capacity];
    }
    // Rule of zero: memberwise copy/move preserve indices and inline storage.
};
