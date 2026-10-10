#include <functional>
#include <iostream>
#include <string>
#include <vector>
std::function<void(const char*)> observer;
void ownership_trace(const char* tag) { if (observer) observer(tag); }
const void* walk_current = nullptr;
std::vector<int> walk_values;
template<class P, class V> void ownership_walk(const char* tag, P current, const V& result) {
    walk_current = current; walk_values.assign(result.begin(), result.end()); ownership_trace(tag);
}
#include "IntrusiveList.hpp"
int main(int argc, char** argv) {
    if (argc != 5) return 2;
    const std::string op = argv[1], preset = argv[2]; const auto selected = std::stoi(argv[3]);
    Object a(10), b(20), c(30), d(std::stoi(argv[4]));
    std::array<Object*, 4> objects{&a, &b, &c, &d};
    IntrusiveList active(HookKind::active), render(HookKind::render), dirty(HookKind::dirty);
    std::array<IntrusiveList*, 3> lists{&active, &render, &dirty}; auto& list = *lists.at(selected);
    const int count = preset == "empty" ? 0 : preset == "single" ? 1 : 3;
    for (int i = 0; i < count; ++i) list.push_back(*objects[i]);
    if (op == "multiple-hooks") {
        for (auto* item : lists) item->clear();
        active.push_back(a); active.push_back(b); active.push_back(c);
        render.push_back(b); render.push_back(d); dirty.push_back(a); dirty.push_back(d);
    }
    auto index = [&](const Object* object) { for (int i = 0; i < 4; ++i) if (objects[i] == object) return i; return -1; };
    auto owner = [&](const IntrusiveList* p) { for (int i = 0; i < 3; ++i) if (lists[i] == p) return i; return -1; };
    observer = [&](const char* tag) {
        std::cout << tag;
        for (auto* item : lists) std::cout << '|' << index(item->head()) << ',' << index(item->tail());
        for (auto* object : objects) for (const auto& hook : object->hooks) std::cout << '|' << index(hook.prev) << ',' << index(hook.next) << ',' << owner(hook.owner);
        std::cout << '|' << index(static_cast<const Object*>(walk_current)) << '|';
        for (int value : walk_values) std::cout << value << ',';
        std::cout << '\n';
    };
    try {
        if (op == "push-front") list.push_front(d);
        else if (op == "push-back") list.push_back(d);
        else if (op == "remove-head") list.erase(count ? *objects[0] : a);
        else if (op == "remove-tail") list.erase(count ? *objects[count - 1] : a);
        else if (op == "remove-middle") list.erase(count == 3 ? b : a);
        else if (op == "clear") list.clear();
        else if (op == "reinsert") { if (count) list.erase(a); list.push_back(a); }
        else if (op == "double-insert") { if (!count) list.push_back(a); list.push_front(a); }
        else if (op == "wrong-list") list.erase(d);
        else if (op == "forward") list.values();
        else if (op == "backward") list.values(true);
        else if (op == "multiple-hooks") list.erase(*objects[index(list.head())]);
    } catch (const std::logic_error&) {}
    observer = {};
}
