#pragma once
#include "SortState.hpp"
namespace search_sort {
// @begin explore
// Count strict inversions; equal keys are not inversions in either direction.
template<class Observe=Ignore> State fundamentals(const std::vector<int>& values, bool descending=false,
                                                 int left=-1, int right=-1, Observe observe={}) {
    State s=initial(values,"fundamentals",descending);
    if(left!=-1 || right!=-1) {
        if(left<0 || right<0 || left>=s.high || right>=s.high) throw std::out_of_range("swap indices");
        s.i=left; s.j=right;
        if(left!=right) { ++s.counts.swaps; s.counts.writes+=2; }
        std::swap(s.a[static_cast<std::size_t>(left)],s.a[static_cast<std::size_t>(right)]); // @trace explore.swap
        observe("explore.swap",s);
    }
    for(int i=0;i<s.high;++i) for(int j=i+1;j<s.high;++j) {
        s.i=i; s.j=j; ++s.checked; ++s.counts.comparisons;
        s.condition=before(s.a[static_cast<std::size_t>(j)].key,s.a[static_cast<std::size_t>(i)].key,descending); // @trace explore.compare
        observe("explore.compare",s);
        if(s.condition) {
            ++s.inversions; s.pairs.emplace_back(i,j); // @trace explore.inversion
            observe("explore.inversion",s);
        }
    }
    s.done=true; // @trace explore.finish
    observe("explore.finish",s); return s;
}
// @end explore
} // namespace search_sort
