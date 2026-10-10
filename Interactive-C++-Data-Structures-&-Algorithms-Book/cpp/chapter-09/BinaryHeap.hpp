#pragma once
#include <cstddef>
#include <stdexcept>
#include <utility>
#include <vector>

// One vector, two interpretations: complete tree and contiguous array.
class BinaryHeap {
    std::vector<int> data_;
    bool max_;
    bool better(int a, int b) const noexcept { return max_ ? a > b : a < b; }
    // @begin heap-up
    void sift_up(std::size_t i) {
        while (i > 0) { // @trace hu.loop
            const std::size_t parent = (i - 1) / 2; // @trace hu.parent
            if (!better(data_[i], data_[parent])) { // @trace hu.ordered
                break; // @trace hu.stop
            }
            std::swap(data_[i], data_[parent]); // @trace hu.swap
            i = parent; // @trace hu.advance
        }
    }
    // @end heap-up
    // @begin heap-down
    void sift_down(std::size_t i) {
        // i < size/2 means a left child exists; avoid overflowing 2*i+1.
        while (i < data_.size() / 2) { // @trace hd.loop
            std::size_t child = 2 * i + 1; // @trace hd.left
            const std::size_t right = child + 1; // @trace hd.right
            if (right < data_.size() && better(data_[right], data_[child])) { // @trace hd.choose
                child = right; // @trace hd.child
            }
            if (!better(data_[child], data_[i])) { // @trace hd.ordered
                break; // @trace hd.stop
            }
            std::swap(data_[i], data_[child]); // @trace hd.swap
            i = child; // @trace hd.advance
        }
    }
    // @end heap-down
public:
    explicit BinaryHeap(bool max_heap = true) : max_(max_heap) {}
    ~BinaryHeap() = default;
    BinaryHeap(const BinaryHeap&) = default;
    BinaryHeap& operator=(const BinaryHeap&) = default;
    BinaryHeap(BinaryHeap&&) noexcept = default;
    BinaryHeap& operator=(BinaryHeap&&) noexcept = default;
    bool empty() const noexcept { return data_.empty(); }
    std::size_t size() const noexcept { return data_.size(); }
    const std::vector<int>& values() const noexcept { return data_; }
    // @begin heap-insert
    void insert(int value) {
        data_.push_back(value); // @trace hi.append
        sift_up(data_.size() - 1); // @trace hi.up
    }
    // @end heap-insert
    // @begin heap-peek
    int peek() const {
        if (data_.empty()) { // @trace hp.empty
            throw std::underflow_error("heap empty"); // @trace hp.throw
        }
        return data_[0]; // @trace hp.return
    }
    // @end heap-peek
    // @begin heap-extract
    int extract() {
        if (data_.empty()) { // @trace he.empty
            throw std::underflow_error("heap empty"); // @trace he.throw
        }
        const int result = data_[0]; // @trace he.save
        data_[0] = data_.back(); // @trace he.move
        data_.pop_back(); // @trace he.pop
        if (!data_.empty()) { // @trace he.remaining
            sift_down(0); // @trace he.down
        }
        return result; // @trace he.return
    }
    // @end heap-extract
    // @begin heap-build
    void buildHeap(std::vector<int> values) {
        data_ = std::move(values); // @trace hb.assign
        std::size_t i = data_.size() / 2; // @trace hb.start
        while (i > 0) { // @trace hb.loop
            --i; // @trace hb.previous
            sift_down(i); // @trace hb.down
        }
    }
    // @end heap-build
};
