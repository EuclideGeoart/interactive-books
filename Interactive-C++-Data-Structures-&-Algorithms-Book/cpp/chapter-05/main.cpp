#include "IntrusiveList.hpp"
#include <iostream>
#include <type_traits>
template<class F> void rejects(F f) { bool caught = false; try { f(); } catch (const std::logic_error&) { caught = true; } assert(caught); }
int main() {
    static_assert(!std::is_copy_constructible_v<Object> && !std::is_move_constructible_v<Object>);
    static_assert(!std::is_copy_constructible_v<IntrusiveList> && !std::is_move_constructible_v<IntrusiveList>);
    Object a(10), b(20), c(30), d(40); // owners are constructed before lists
    {
        IntrusiveList active, render(HookKind::render), dirty(HookKind::dirty), other;
        assert(active.values().empty());
        active.push_back(a);
        assert(a.hooks[0].prev == nullptr && a.hooks[0].next == nullptr && a.hooks[0].owner == &active);
        rejects([&] { active.push_front(a); }); // singleton is already linked
        rejects([&] { other.push_back(a); });
        rejects([&] { other.erase(a); });
        active.push_back(b); active.push_back(c); active.push_front(d);
        assert((active.values() == std::vector<int>{40, 10, 20, 30}));
        assert((active.values(true) == std::vector<int>{30, 20, 10, 40}));
        render.push_back(b); render.push_back(d); dirty.push_back(a); dirty.push_back(d);
        active.erase(b);
        assert(b.value == 20 && b.hooks[0].owner == nullptr && b.hooks[1].owner == &render);
        active.erase(d); active.erase(c); active.erase(a);
        assert(!active.head() && !active.tail());
        rejects([&] { active.erase(a); });
        active.push_front(b); active.clear(); active.clear();
        assert(b.value == 20); // unlink did not destroy external object
        active.push_back(a); // destructor unlinks remaining membership
    } // list destructors run before owner destruction
    for (auto* object : {&a, &b, &c, &d}) for (const auto& hook : object->hooks) assert(!hook.owner && !hook.prev && !hook.next);
    std::cout << "intrusive: singleton membership, endpoints, middle, hooks, guards, owner ordering passed\n";
}
