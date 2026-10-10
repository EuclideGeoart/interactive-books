#pragma once
#include <array>
#include <cstddef>
#include <new>
#include <memory>
#include <stdexcept>
#include <type_traits>
#include <utility>

// Fixed capacity, single-threaded storage owner. Addresses stay stable.
// No copying or moving: outstanding borrowed addresses must not change owners.
template<class T, std::size_t N>
class Pool {
    static_assert(N > 0);
    static_assert(std::is_nothrow_destructible_v<T>);
    union Block {
        T object;
        Block* next;
        Block() noexcept : next(nullptr) {}
        ~Block() {} // Pool ends live T lifetimes before these storage blocks end.
    };
    static_assert(alignof(Block) >= alignof(T));
    static_assert(sizeof(Block) >= sizeof(T) && sizeof(Block) >= sizeof(Block*));
public:
    enum class State { free, reserved, live, destroyed };
private:
    std::array<Block, N> blocks_;
    std::array<State, N> states_{};
    std::array<T*, N> objects_{};
    // Explicitly track which union member may be inspected, including transitions.
    std::array<bool, N> has_link_{};
    Block* freeList_ = nullptr;

    // @begin validate
    std::size_t index_of(const void* memory) const {
        // Equality, never subtraction or ordering of unrelated pointers.
        for (std::size_t i = 0; i < N; ++i) {
            if (memory == static_cast<const void*>(&blocks_[i])) return i;
        }
        throw std::invalid_argument("Address does not belong to this pool"); // @trace validate.foreign
    }
    // @end validate
public:
    Pool() noexcept {
        for (std::size_t i = N; i-- > 0;) {
            blocks_[i].next = freeList_;
            has_link_[i] = true;
            freeList_ = &blocks_[i];
        }
    }
    Pool(const Pool&) = delete;
    Pool& operator=(const Pool&) = delete;
    Pool(Pool&&) = delete;
    Pool& operator=(Pool&&) = delete;
    ~Pool() noexcept {
        for (std::size_t i = 0; i < N; ++i) {
            if (states_[i] == State::live) objects_[i]->~T();
        }
    }
    // @begin allocate
    void* allocate() {
        if (freeList_ == nullptr) { // @trace allocate.guard
            throw std::bad_alloc(); // @trace allocate.exhausted
        }
        Block* block = freeList_; // @trace allocate.block
        freeList_ = block->next; // @trace allocate.head
        states_[index_of(block)] = State::reserved; // @trace allocate.reserve
        return static_cast<void*>(block); // @trace allocate.return
    }
    // @end allocate
    // @begin construct
    template<class... Args>
    T* construct(void* memory, Args&&... args) {
        const auto i = index_of(memory); // @trace construct.validate
        if (states_[i] != State::reserved && states_[i] != State::destroyed) { // @trace construct.guard
            throw std::logic_error("Construction requires reserved or destroyed storage"); // @trace construct.reject
        }
        // A throwing constructor starts no T lifetime. create() returns this block.
        // Bookkeeping alone does not end the pointer lifetime; storage reuse does.
        has_link_[i] = false; objects_[i] = ::new (static_cast<void*>(std::addressof(blocks_[i].object))) T(std::forward<Args>(args)...); // @trace construct.object
        states_[i] = State::live; // @trace construct.live
        return objects_[i]; // @trace construct.return
    }
    // @end construct
    // @begin destroy
    void destroy(void* memory) {
        const auto i = index_of(memory); // @trace destroy.validate
        if (states_[i] != State::live) { // @trace destroy.guard
            throw std::logic_error("No live object to destroy"); // @trace destroy.reject
        }
        // Same annotated line includes the observer bookkeeping; no dead T read.
        objects_[i]->~T(); objects_[i] = nullptr; // @trace destroy.object
        states_[i] = State::destroyed; // @trace destroy.state
    }
    // @end destroy
    // @begin deallocate
    void deallocate(void* memory) {
        const auto i = index_of(memory); // @trace deallocate.validate
        if (states_[i] == State::free || states_[i] == State::live) { // @trace deallocate.guard
            throw std::logic_error("Cannot return free storage or a live object"); // @trace deallocate.reject
        }
        Block* block = &blocks_[i]; // @trace deallocate.block
        // Placement new activates the pointer union member, never reads dead T.
        ::new (static_cast<void*>(&block->next)) Block*(freeList_); has_link_[i] = true; // @trace deallocate.link
        states_[i] = State::free; // @trace deallocate.free
        freeList_ = block; // @trace deallocate.head
    }
    // @end deallocate
    // @begin read
    T& get(void* memory) {
        const auto i = index_of(memory); // @trace read.validate
        if (states_[i] != State::live) { // @trace read.guard
            throw std::logic_error("Cannot read an object outside its lifetime"); // @trace read.reject
        }
        return *objects_[i]; // @trace read.return
    }
    // @end read
    // @begin create
    template<class... Args>
    T* create(Args&&... args) {
        void* memory = allocate();
        try { return construct(memory, std::forward<Args>(args)...); }
        catch (...) { deallocate(memory); throw; }
    }
    // @end create
    // Read-only teaching observer. It never interprets an inactive union member.
    int slot(const void* p) const noexcept {
        if (!p) return -1;
        for (std::size_t i = 0; i < N; ++i) if (p == static_cast<const void*>(&blocks_[i])) return static_cast<int>(i);
        return -2;
    }
    int free_head() const noexcept { return slot(freeList_); }
    State state(std::size_t i) const { return states_.at(i); }
    bool alive(std::size_t i) const { return objects_.at(i) != nullptr; }
    const T* object(std::size_t i) const { return objects_.at(i); }
    int next(std::size_t i) const { return has_link_.at(i) ? slot(blocks_.at(i).next) : -2; }
};
