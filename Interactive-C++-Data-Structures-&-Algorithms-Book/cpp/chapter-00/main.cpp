#include "CppFoundations.hpp"

#include <cassert>
#include <thread>

int main() {
    using namespace foundations;
    assert((pointer_explorer() == std::array{10, 20, -1}));
    assert(replace_owning_slot() == 20);
    {
        NoncopyableOwner owner;
        owner.head = new Node{1};
        owner.head->next = new Node{2};
    }
    assert(lifetime_explorer() == 42);
    assert(raw_owner_example() == 10);
    assert(copy_move_explorer());
    const auto growth = vector_growth();
    assert(growth.oldCapacity >= 2 && growth.newCapacity > growth.oldCapacity);
    assert((erase_middle() == std::vector{10, 30}));
    assert(align_up(5, 4) == 8);
    assert(align_up(8, 4) == 8);
    FixedSlots<int, 3> slots;
    slots.at(0) = 9;
    assert(slots.size() == 3 && slots.at(0) == 9);
    assert((PointKey{1, 2} == PointKey{1, 2}));
    assert(!(PointKey{1, 2} == PointKey{2, 1}));
    assert(PointHash{}(PointKey{1, 2}) == PointHash{}(PointKey{1, 2}));
    assert(make_owned<int>(7) && *make_owned<int>(7) == 7);
    assert((ordered_points({{2, 0}, {1, 2}, {1, 1}}) == std::vector<PointKey>{{1, 1}, {1, 2}, {2, 0}}));
    assert(finite_point(1.0, 2.0) && !finite_point(std::numeric_limits<double>::infinity(), 0.0));
    assert(array_allocation_example() == 30);
    std::vector<int> guarded;
    guarded_push(guarded, 1, 7);
    try { guarded_push(guarded, 1, 8); assert(false); }
    catch (const std::overflow_error&) { assert(guarded.size() == 1); }
    assert(find_value(guarded, 7) == 0);
    assert(!find_value(guarded, 8));
    assert(find_value(std::array{10, 20, 30}, 30) == 2);
    assert(starts_with("tree", "tr"));
    assert(midpoint(8, 12) == 10);
    assert(wrap_index(4, 5) == 0);
    assert(!parent_index(0) && parent_index(3) == 1);
    assert(floor_cell(-1, 4) == -1 && floor_cell(5, 4) == 1);
    assert(atomic_publication_preview());
    std::atomic<int> finished{0};
    std::jthread worker([&finished] { finished.store(1, std::memory_order_release); });
    worker.join();
    assert(finished.load(std::memory_order_acquire) == 1);
}
