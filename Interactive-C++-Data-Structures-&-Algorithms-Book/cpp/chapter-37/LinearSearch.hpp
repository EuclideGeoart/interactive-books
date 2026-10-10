#pragma once
#include "../chapter-39/SortState.hpp"
namespace search_sort {
// @begin linear
// First match, including in unsorted input. The observer sees each completed statement.
template<class Observe=Ignore> State linear(const std::vector<int>& values, int target, Observe observe={}) {
    if(target < -1000000 || target > 1000000) throw std::out_of_range("teaching target bound");
    State s=initial(values,"linear"); s.target=target;
    s.i=0; // @trace linear.start
    observe("linear.start",s);
    while(s.i<s.high) {
        // Inspect selects a valid index before reading its key.
        s.j=s.i; // @trace linear.inspect
        observe("linear.inspect",s);
        ++s.counts.comparisons;
        s.condition=s.a[static_cast<std::size_t>(s.i)].key==target; // @trace linear.compare
        observe("linear.compare",s);
        if(s.condition) {
            s.result=s.i; // @trace linear.found
            observe("linear.found",s);
            break;
        }
        ++s.i; // @trace linear.advance
        observe("linear.advance",s);
    }
    s.done=true; // @trace linear.finish
    observe("linear.finish",s);
    return s;
}
// @end linear
} // namespace search_sort
