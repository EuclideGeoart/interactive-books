#include "MergeSort.hpp"
#include <cassert>
#include <iostream>
#include <limits>
int main() {
    const std::vector<std::vector<std::int32_t>> fixtures={{},{0},{2,1,2,0},{1,2,3,4},{4,3,2,1},{7,7,7}};
    for (const auto& values:fixtures) {
        const auto s=merge_sort::sort(values);
        auto expected=values; std::sort(expected.begin(),expected.end());
        for (std::size_t i=0;i<expected.size();++i) assert(s.a[i].key==expected[i]);
        for (std::size_t i=1;i<s.a.size();++i) if (s.a[i-1].key==s.a[i].key) assert(s.a[i-1].id<s.a[i].id);
    }
    const auto extremes=merge_sort::sort({std::numeric_limits<std::int32_t>::max(),-1,std::numeric_limits<std::int32_t>::min()});
    assert(extremes.a.front().key==std::numeric_limits<std::int32_t>::min());
    std::cout<<"Chapter 41: all examples passed\n";
}
