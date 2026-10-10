#pragma once
#include "../chapter-39/SortState.hpp"
namespace search_sort {
// @begin binary
// Half-open [low,high), ANY match. Validation and observer diagnostics are excluded from counts.
// Fault injection is bounded: invalid updates are reported before another iteration.
template<class Observe=Ignore> State binary(const std::vector<int>& values, int target,
                                           const std::string& mode="normal", Observe observe={}) {
    if(mode!="normal" && mode!="unsorted" && mode!="update" && mode!="nonprogress")
        throw std::invalid_argument("binary fault mode");
    if(target < -1000000 || target > 1000000) throw std::out_of_range("teaching target bound");
    State s=initial(values,"binary"); s.target=target;
    s.condition=ordered(s.a); // @trace binary.validate
    observe("binary.validate",s);
    if(!s.condition) {
        s.fault="unsorted-domain"; s.done=true; // @trace binary.unsorted
        observe("binary.unsorted",s); return s;
    }
    while(s.low<s.high) {
        const int old_low=s.low, old_high=s.high;
        s.mid=s.low+(s.high-s.low)/2; // @trace binary.mid
        observe("binary.mid",s);
        ++s.counts.comparisons;
        s.condition=s.a[static_cast<std::size_t>(s.mid)].key==target; // @trace binary.equal
        observe("binary.equal",s);
        if(s.condition) {
            s.result=s.mid; // @trace binary.found
            observe("binary.found",s); break;
        }
        ++s.counts.comparisons;
        s.condition=s.a[static_cast<std::size_t>(s.mid)].key<target; // @trace binary.less
        observe("binary.less",s);
        if(s.condition) {
            s.low=mode=="nonprogress" ? s.mid : mode=="update" ? std::min(s.high,s.mid+2) : s.mid+1; // @trace binary.low
            observe("binary.low",s);
        } else {
            s.high=mode=="nonprogress" ? s.mid+1 : mode=="update" ? std::max(s.low,s.mid-1) : s.mid; // @trace binary.high
            observe("binary.high",s);
        }
        if(s.high-s.low>=old_high-old_low) {
            s.fault="nonprogress"; s.done=true; // @trace binary.nonprogress
            observe("binary.nonprogress",s); return s;
        }
        if(s.low!=(s.condition?s.mid+1:old_low) || s.high!=(s.condition?old_high:s.mid)) {
            s.fault="invalid-update"; s.done=true; // @trace binary.update
            observe("binary.update",s); return s;
        }
    }
    s.done=true; // @trace binary.finish
    observe("binary.finish",s);
    return s;
}
// @end binary
} // namespace search_sort
