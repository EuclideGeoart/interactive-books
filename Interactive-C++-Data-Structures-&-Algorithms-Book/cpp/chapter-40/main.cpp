#include "ElementarySorts.hpp"
#include <cassert>
int main() {
    using namespace search_sort;
    const std::vector<std::vector<int>> cases={{},{1},{2,2,1},{1,2,3},{3,2,1},{2,2,2},{-1000000,0,1000000,-2}};
    for(const auto& values:cases) for(const bool descending:{false,true}) {
        const auto b=bubble(values,descending),s=selection(values,descending),i=insertion(values,descending);
        assert(ordered(b.a,descending) && ordered(s.a,descending) && ordered(i.a,descending));
        assert(stable(b.a) && stable(i.a));
    }
    assert(!stable(selection({2,2,1}).a));
    assert(bubble({1,2,3,4}).counts.comparisons==3);
    assert(insertion({3,2,1}).counts.shifts==3);
    assert(bubble({2,2,1},false,true).fault=="unstable-ties");
}
