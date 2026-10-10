#pragma once

#include <algorithm>
#include <array>
#include <atomic>
#include <cassert>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <memory>
#include <new>
#include <optional>
#include <span>
#include <stdexcept>
#include <string_view>
#include <utility>
#include <vector>

namespace foundations {

struct Node {
    int value;
    Node* next;
    explicit Node(int n) : value(n), next(nullptr) {}
};

// @begin pointer
inline std::array<int, 3> pointer_explorer() {
    Node a{10}, b{20};
    Node& ref = a;                  // A reference stays an alias to A.
    Node* p = &a;                    // @trace point-a
    assert(ref.value == 10);
    const int first = p->value;      // @trace inspect
    p = &b;                          // @trace point-b
    const int second = (*p).value;
    p = nullptr;                     // @trace point-null
    const int absent = p ? p->value : -1; // @trace guard-null
    return {first, second, absent};
}
// @end pointer

// @begin owning-slot
inline int replace_owning_slot() {
    auto initial = std::make_unique<Node>(10);
    auto incoming = std::make_unique<Node>(20); // Both allocations finish before publication.
    Node* root = initial.release();
    Node** slot = &root;             // @trace address-slot
    Node* replacement = incoming.release();
    Node* old = *slot;
    *slot = replacement;             // @trace replace-slot
    delete old;
    const int result = root->value;
    delete root;
    return result;
}
// @end owning-slot

struct Tracked {
    int value;
    int& destructions;
    Tracked(int n, int& count) : value(n), destructions(count) {}
    ~Tracked() noexcept { ++destructions; }
};

// @begin lifetime
inline int lifetime_explorer() {
    int destructions = 0;
    void* storage = ::operator new(sizeof(Tracked)); // @trace allocate
    Tracked* object = nullptr;
    try {
        object = std::construct_at(static_cast<Tracked*>(storage), 42, destructions); // @trace construct
    } catch (...) {
        ::operator delete(storage);
        throw;
    }
    const int value = object->value;
    std::destroy_at(object);         // @trace destroy
    ::operator delete(storage);      // @trace release
    assert(destructions == 1);
    return value;
}
// @end lifetime

// @begin new-delete
inline int raw_owner_example() {
    Node* node = new Node{10};      // @trace new-node
    const int answer = node->value;
    delete node;                     // @trace delete-node
    return answer;
}
// @end new-delete

class Buffer {
    std::unique_ptr<int> value_;
public:
    explicit Buffer(int value) : value_(std::make_unique<int>(value)) {}
    Buffer(const Buffer& other)
        : value_(other.value_ ? std::make_unique<int>(*other.value_) : nullptr) {}
    Buffer& operator=(const Buffer& other) {
        if (this != &other) {
            Buffer copy(other);
            value_.swap(copy.value_);
        }
        return *this;
    }
    Buffer(Buffer&&) noexcept = default;
    Buffer& operator=(Buffer&&) noexcept = default;
    ~Buffer() = default;
    bool owns() const noexcept { return static_cast<bool>(value_); }
    int value() const { if (!value_) throw std::logic_error("empty owner"); return *value_; }
    const int* address() const noexcept { return value_.get(); }
};

// @begin copy-move
inline bool copy_move_explorer() {
    Buffer a{7};                    // @trace construct-a
    Buffer b{a};                     // @trace copy
    const bool independent = a.address() != b.address();
    Buffer c{std::move(a)};          // @trace move
    return independent && !a.owns() && b.value() == c.value();
} // @trace destroy-owners
// @end copy-move

struct NoncopyableOwner {
    Node* head = nullptr;
    NoncopyableOwner() = default;
    NoncopyableOwner(const NoncopyableOwner&) = delete;
    NoncopyableOwner& operator=(const NoncopyableOwner&) = delete;
    NoncopyableOwner(NoncopyableOwner&&) = delete;
    NoncopyableOwner& operator=(NoncopyableOwner&&) = delete;
    ~NoncopyableOwner() {
        while (head) {
            Node* next = head->next;
            delete head;
            head = next;
        }
    }
};

// @begin vector-growth
struct Growth { std::size_t oldCapacity, newCapacity; };
inline Growth vector_growth() {
    std::array<int, 5> fixed{10, 20, 30, 0, 0};
    assert(fixed.size() == 5);
    std::vector<int> values;
    values.reserve(2);              // @trace reserve-two
    values.push_back(10);
    values.push_back(20);            // @trace size-two
    // An implementation may reserve more than requested. Fill that capacity first.
    values.resize(values.capacity());
    const auto oldCapacity = values.capacity();
    values.push_back(30);            // @trace grow
    // Any pointers, references, and iterators into the old allocation are now invalid.
    return {oldCapacity, values.capacity()};
}
// @end vector-growth

// @begin iterator-erase
inline std::vector<int> erase_middle() {
    std::vector<int> values{10, 20, 30};
    auto first = values.begin();
    values.erase(values.begin() + 1); // @trace erase-middle
    assert(*first == 10);           // Iterators before the erased element survive.
    return values;                  // At/after the erased position, including end(), are invalid.
}
// @end iterator-erase

// @begin alignment
inline std::size_t align_up(std::size_t address, std::size_t alignment) {
    if (alignment == 0 || (alignment & (alignment - 1)) != 0)
        throw std::invalid_argument("power-of-two alignment required");
    const std::size_t remainder = address % alignment;
    const std::size_t padding = remainder ? alignment - remainder : 0;
    if (address > std::numeric_limits<std::size_t>::max() - padding)
        throw std::overflow_error("aligned address overflow");
    return address + padding;       // @trace align-up
}
// @end alignment

template <typename T, std::size_t N>
class FixedSlots {
    static_assert(N > 0);
    std::array<T, N> values_{};
public:
    constexpr std::size_t size() const noexcept { return N; }
    T& at(std::size_t i) { return values_.at(i); }
};

struct PointKey {
    int x, y;
    bool operator==(const PointKey&) const = default;
};

struct PointHash {
    std::size_t operator()(const PointKey& point) const noexcept {
        return static_cast<std::size_t>(point.x) * 31u + static_cast<std::size_t>(point.y);
    }
};

template <typename T, typename... Args>
std::unique_ptr<T> make_owned(Args&&... args) {
    return std::make_unique<T>(std::forward<Args>(args)...);
}

inline std::vector<PointKey> ordered_points(std::vector<PointKey> points) {
    std::sort(points.begin(), points.end(), [](const PointKey& a, const PointKey& b) {
        return a.x < b.x || (a.x == b.x && a.y < b.y);
    });
    return points;
}

inline bool finite_point(double x, double y) noexcept {
    return std::isfinite(x) && std::isfinite(y);
}

enum class SlotState { Empty, Occupied, Tombstone };

// @begin contracts
inline void guarded_push(std::vector<int>& values, std::size_t limit, int value) {
    assert(values.size() <= limit); // @trace invariant
    if (values.size() == limit)     // @trace guard
        throw std::overflow_error("full");
    values.push_back(value);        // @trace mutate
}
// @end contracts

// @begin optional-view
inline std::optional<std::size_t> find_value(std::span<const int> values, int target) {
    for (std::size_t i = 0; i < values.size(); ++i)
        if (values[i] == target) return i; // @trace present
    return std::nullopt;             // @trace absent
}
inline bool starts_with(std::string_view word, std::string_view prefix) {
    return word.starts_with(prefix);
}
// @end optional-view

inline int array_allocation_example() {
    int* values = new int[2]{10, 20};
    const int result = values[0] + values[1];
    delete[] values;
    return result;
}

// @begin integer
inline std::size_t midpoint(std::size_t low, std::size_t high) {
    if (low > high) throw std::invalid_argument("reversed range");
    return low + (high - low) / 2;   // @trace midpoint
}
inline std::size_t wrap_index(std::size_t index, std::size_t capacity) {
    if (capacity == 0 || index >= capacity) throw std::invalid_argument("invalid ring index");
    return index + 1 == capacity ? 0 : (index + 1) % capacity; // @trace wrap-index
}
inline std::optional<std::size_t> parent_index(std::size_t index) {
    if (index == 0) return std::nullopt; // @trace guard-index
    return (index - 1) / 2;
}
inline int floor_cell(int coordinate, int positiveWidth) {
    if (positiveWidth <= 0) throw std::invalid_argument("positive cell width required");
    const int quotient = coordinate / positiveWidth;
    const int remainder = coordinate % positiveWidth;
    return remainder < 0 ? quotient - 1 : quotient; // @trace floor-cell
}
// @end integer

// @begin atomic-preview
inline bool atomic_publication_preview() {
    std::atomic<std::size_t> published{0};
    published.store(1, std::memory_order_release);
    const auto seen = published.load(std::memory_order_acquire);
    std::size_t expected = 1;
    return seen == 1 && published.compare_exchange_strong(expected, 2);
}
// @end atomic-preview

} // namespace foundations
