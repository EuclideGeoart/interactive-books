#pragma once
#include <cstddef>
#include <stdexcept>
#include <vector>

// Stable unsorted storage: earlier insertion wins equal priority.
class PriorityQueue {
public:
    struct Entry { int value; int priority; bool operator==(const Entry&) const = default; };
private:
    std::vector<Entry> data_;
    bool higher_;
    // @begin priority-best
    std::size_t best_index() const {
        if (data_.empty()) { // @trace pb.empty
            throw std::underflow_error("priority queue empty"); // @trace pb.throw
        }
        std::size_t best = 0; // @trace pb.start
        std::size_t i = 1; // @trace pb.scan
        while (i < data_.size()) { // @trace pb.loop
            if (higher_ ? data_[i].priority > data_[best].priority : data_[i].priority < data_[best].priority) { // @trace pb.compare
                best = i; // @trace pb.choose
            }
            ++i; // @trace pb.advance
        }
        return best; // @trace pb.return
    }
    // @end priority-best
public:
    explicit PriorityQueue(bool higher = true) : higher_(higher) {}
    ~PriorityQueue() = default;
    PriorityQueue(const PriorityQueue&) = default;
    PriorityQueue& operator=(const PriorityQueue&) = default;
    PriorityQueue(PriorityQueue&&) noexcept = default;
    PriorityQueue& operator=(PriorityQueue&&) noexcept = default;
    bool empty() const noexcept { return data_.empty(); }
    std::size_t size() const noexcept { return data_.size(); }
    const std::vector<Entry>& entries() const noexcept { return data_; }
    // @begin priority-insert
    void insert(int value, int priority) {
        data_.push_back({value, priority}); // @trace pi.append
    }
    // @end priority-insert
    // @begin priority-peek
    Entry peek() const {
        const std::size_t best = best_index(); // @trace pp.best
        return data_[best]; // @trace pp.return
    }
    // @end priority-peek
    // @begin priority-extract
    Entry extract() {
        const std::size_t best = best_index(); // @trace pe.best
        const Entry result = data_[best]; // @trace pe.save
        data_.erase(data_.begin() + static_cast<std::ptrdiff_t>(best)); // @trace pe.erase
        return result; // @trace pe.return
    }
    // @end priority-extract
};
