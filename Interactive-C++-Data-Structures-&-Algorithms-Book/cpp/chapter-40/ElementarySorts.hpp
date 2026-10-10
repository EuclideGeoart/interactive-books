#pragma once
#include "../chapter-39/SortState.hpp"
namespace search_sort {
// @begin bubble
template<class Observe=Ignore> State bubble(const std::vector<int>& values, bool descending=false,
                                          bool unstable_ties=false, Observe observe={}) {
    State s=initial(values,"bubble",descending); s.boundary=s.high;
    while(s.boundary>1) {
        ++s.counts.passes; s.changed=false; s.i=0; // @trace bubble.pass
        observe("bubble.pass",s);
        for(int i=0;i+1<s.boundary;++i) {
            s.i=i; s.j=i+1; ++s.counts.comparisons;
            s.condition=before(s.a[static_cast<std::size_t>(i+1)].key,s.a[static_cast<std::size_t>(i)].key,descending)
                || (unstable_ties && s.a[static_cast<std::size_t>(i+1)].key==s.a[static_cast<std::size_t>(i)].key); // @trace bubble.compare
            observe("bubble.compare",s);
            if(s.condition) {
                ++s.counts.swaps; s.counts.writes+=2; s.changed=true;
                std::swap(s.a[static_cast<std::size_t>(i)],s.a[static_cast<std::size_t>(i+1)]); // @trace bubble.swap
                observe("bubble.swap",s);
            }
        }
        --s.boundary; // @trace bubble.finalize
        observe("bubble.finalize",s);
        if(!s.changed) {
            s.boundary=0; // @trace bubble.early
            observe("bubble.early",s); break;
        }
    }
    s.boundary=0; s.done=true;
    if(unstable_ties && !stable(s.a)) s.fault="unstable-ties";
    s.condition=ordered(s.a,descending); // @trace bubble.finish
    observe("bubble.finish",s); return s;
}
// @end bubble
// @begin selection
template<class Observe=Ignore> State selection(const std::vector<int>& values, bool descending=false, Observe observe={}) {
    State s=initial(values,"selection",descending);
    for(int i=0;i+1<s.high;++i) {
        s.i=i; s.minimum=i; ++s.counts.passes; // @trace selection.pass
        observe("selection.pass",s);
        for(int j=i+1;j<s.high;++j) {
            s.j=j; ++s.counts.comparisons;
            s.condition=before(s.a[static_cast<std::size_t>(j)].key,s.a[static_cast<std::size_t>(s.minimum)].key,descending); // @trace selection.compare
            observe("selection.compare",s);
            if(s.condition) {
                s.minimum=j; // @trace selection.minimum
                observe("selection.minimum",s);
            }
        }
        if(s.minimum!=i) {
            ++s.counts.swaps; s.counts.writes+=2;
            std::swap(s.a[static_cast<std::size_t>(i)],s.a[static_cast<std::size_t>(s.minimum)]); // @trace selection.swap
            observe("selection.swap",s);
        }
        s.boundary=i+1; // @trace selection.finalize
        observe("selection.finalize",s);
    }
    s.boundary=s.high; s.done=true; // @trace selection.finish
    observe("selection.finish",s); return s;
}
// @end selection
// @begin insertion
template<class Observe=Ignore> State insertion(const std::vector<int>& values, bool descending=false, Observe observe={}) {
    State s=initial(values,"insertion",descending); s.boundary=std::min(1,s.high);
    for(int i=1;i<s.high;++i) {
        s.i=i; s.j=i; ++s.counts.passes;
        s.held=s.a[static_cast<std::size_t>(i)]; // @trace insertion.hold
        observe("insertion.hold",s);
        while(s.j>0) {
            ++s.counts.comparisons;
            s.condition=before(s.held->key,s.a[static_cast<std::size_t>(s.j-1)].key,descending); // @trace insertion.compare
            observe("insertion.compare",s);
            if(!s.condition) break;
            ++s.counts.shifts; ++s.counts.writes;
            s.a[static_cast<std::size_t>(s.j)]=s.a[static_cast<std::size_t>(s.j-1)]; // @trace insertion.shift
            observe("insertion.shift",s);
            --s.j; // @trace insertion.advance
            observe("insertion.advance",s);
        }
        ++s.counts.writes;
        s.a[static_cast<std::size_t>(s.j)]=*s.held; // @trace insertion.insert
        observe("insertion.insert",s);
        s.held.reset(); s.boundary=i+1; // @trace insertion.finalize
        observe("insertion.finalize",s);
    }
    s.done=true; // @trace insertion.finish
    observe("insertion.finish",s); return s;
}
// @end insertion
} // namespace search_sort
