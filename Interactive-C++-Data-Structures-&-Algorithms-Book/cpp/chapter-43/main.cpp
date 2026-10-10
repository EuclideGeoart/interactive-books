#include "HeapSort.hpp"
#include <cassert>
#include <iostream>
#include <limits>
int main() {
    const std::vector<std::vector<std::int32_t>> fixtures={{},{0},{2,1,2,0},{1,2,3,4},{4,3,2,1},{7,7,7}};
    for (const auto& values:fixtures) {
        const auto s=heap_sort::sort(values);
        auto expected=values; std::sort(expected.begin(),expected.end());
        for (std::size_t i=0;i<expected.size();++i) assert(s.a[i].key==expected[i]);
    }
    const auto extremes=heap_sort::sort({std::numeric_limits<std::int32_t>::max(),-1,std::numeric_limits<std::int32_t>::min()});
    assert(extremes.a.front().key==std::numeric_limits<std::int32_t>::min());
    std::cout<<"Chapter 43: all examples passed\n";
}
