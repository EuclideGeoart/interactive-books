#include "CountingRadix.hpp"
#include <cassert>
#include <iostream>
#include <limits>
int main() {
    const std::vector<std::vector<std::int32_t>> fixtures={{},{0},{2,1,2,0},{1,2,3,4},{4,3,2,1},{7,7,7}};
    for (const auto& values:fixtures) {
        const auto s=integer_sort::counting(values,9);
        auto expected=values; std::sort(expected.begin(),expected.end());
        for (std::size_t i=0;i<expected.size();++i) assert(s.a[i].key==expected[i]);
        for (std::size_t i=1;i<s.a.size();++i) if (s.a[i-1].key==s.a[i].key) assert(s.a[i-1].id<s.a[i].id);
        const auto r=integer_sort::radix(values); assert(r.a==s.a);
    }
    const auto extreme=integer_sort::radix({2147483647,0,1000000000,2147483647});
    assert(extreme.a.front().key==0 && extreme.counters.passes==10);
    const auto broken=integer_sort::radix({21,22,11,12},true);
    assert(!std::is_sorted(broken.a.begin(),broken.a.end(),[](const auto& a,const auto& b){return a.key<b.key;}));
    bool rejected=false;
    try { (void)integer_sort::counting({-1}); } catch(const std::invalid_argument&) { rejected=true; }
    assert(rejected);
    std::cout<<"Chapter 44: all examples passed\n";
}
