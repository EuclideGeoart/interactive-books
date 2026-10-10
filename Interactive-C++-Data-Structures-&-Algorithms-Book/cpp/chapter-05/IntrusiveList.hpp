#pragma once
#include <array>
#include <cassert>
#include <cstddef>
#include <stdexcept>
#include <vector>

class IntrusiveList;
struct Object;
enum class HookKind : std::size_t { active, render, dirty };
struct IntrusiveHook {
    Object* prev = nullptr;
    Object* next = nullptr;
    const IntrusiveList* owner = nullptr; // membership, including a singleton
};
// External owners must keep objects stable and alive until all hooks are unlinked.
struct Object {
    int value;
    std::array<IntrusiveHook, 3> hooks{};
    explicit Object(int v) : value(v) {}
    Object(const Object&) = delete;
    Object& operator=(const Object&) = delete;
    Object(Object&&) = delete;
    Object& operator=(Object&&) = delete;
    ~Object() noexcept {
        for (const auto& hook : hooks) { assert(hook.owner == nullptr && "unlink every hook before object destruction"); (void)hook; }
    }
};
class IntrusiveList {
    Object* head_ = nullptr;
    Object* tail_ = nullptr;
    HookKind kind_;
    // @begin hook
    IntrusiveHook& hook(Object& object) const noexcept {
        return object.hooks[static_cast<std::size_t>(kind_)];
    }
    // @end hook
public:
    explicit IntrusiveList(HookKind kind = HookKind::active) noexcept : kind_(kind) {}
    IntrusiveList(const IntrusiveList&) = delete;
    IntrusiveList& operator=(const IntrusiveList&) = delete;
    IntrusiveList(IntrusiveList&&) = delete;
    IntrusiveList& operator=(IntrusiveList&&) = delete;
    ~IntrusiveList() noexcept { clear(); }
    // @begin push-front
    void push_front(Object& object) {
        auto& h = hook(object); // @trace front.hook
        if (h.owner != nullptr) { // @trace front.guard
            throw std::logic_error("This hook already belongs to a list"); // @trace front.reject
        }
        h.prev = nullptr; // @trace front.prev
        h.next = head_; // @trace front.next
        if (head_ != nullptr) { // @trace front.nonempty
            hook(*head_).prev = &object; // @trace front.backlink
        } else {
            tail_ = &object; // @trace front.tail
        }
        head_ = &object; // @trace front.head
        h.owner = this; // @trace front.owner
    }
    // @end push-front
    // @begin push-back
    void push_back(Object& object) {
        auto& h = hook(object); // @trace back.hook
        if (h.owner != nullptr) { // @trace back.guard
            throw std::logic_error("This hook already belongs to a list"); // @trace back.reject
        }
        h.prev = tail_; // @trace back.prev
        h.next = nullptr; // @trace back.next
        if (tail_ != nullptr) { // @trace back.nonempty
            hook(*tail_).next = &object; // @trace back.forward
        } else {
            head_ = &object; // @trace back.head
        }
        tail_ = &object; // @trace back.tail
        h.owner = this; // @trace back.owner
    }
    // @end push-back
    // @begin erase
    void erase(Object& object) {
        auto& h = hook(object); // @trace erase.hook
        if (h.owner != this) { // @trace erase.guard
            throw std::logic_error("This hook is not a member of this list"); // @trace erase.reject
        }
        if (h.prev != nullptr) { // @trace erase.has-prev
            hook(*h.prev).next = h.next; // @trace erase.forward
        } else {
            head_ = h.next; // @trace erase.head
        }
        if (h.next != nullptr) { // @trace erase.has-next
            hook(*h.next).prev = h.prev; // @trace erase.backward
        } else {
            tail_ = h.prev; // @trace erase.tail
        }
        h.prev = nullptr; // @trace erase.prev
        h.next = nullptr; // @trace erase.next
        h.owner = nullptr; // @trace erase.owner
    }
    // @end erase
    // @begin clear
    void clear() noexcept {
        while (head_ != nullptr) { // @trace clear.more
            erase(*head_);
        }
    }
    // @end clear
    // @begin traversal
    std::vector<int> values(bool reverse = false) const {
        std::vector<int> result;
        Object* current = reverse ? tail_ : head_; // @trace walk.start
        while (current != nullptr) { // @trace walk.more
            result.push_back(current->value); // @trace walk.visit
            current = reverse ? hook(*current).prev : hook(*current).next; // @trace walk.advance
        }
        return result; // @trace walk.return
    }
    // @end traversal
    const Object* head() const noexcept { return head_; }
    const Object* tail() const noexcept { return tail_; }
};
