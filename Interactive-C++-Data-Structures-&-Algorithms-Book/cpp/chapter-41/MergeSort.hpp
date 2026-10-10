#pragma once
#include <algorithm>
#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace merge_sort {
struct Item { std::int32_t key; int id; bool operator==(const Item&) const = default; };
struct Counters {
    int comparisons=0, swaps=0, writes=0, bufferWrites=0, passes=0, maxDepth=0, digitReads=0, maximumScans=0;
};
// Observer fields are diagnostics, not extra algorithmic workspace. No observer
// is required. A callback must be nonthrowing and must not reenter this sort.
struct State {
    std::vector<Item> a;
    std::vector<std::optional<Item>> tmp;
    std::vector<int> counts;
    std::vector<std::pair<int,int>> stack;
    int lo=0, mid=-1, hi=0, i=-1, j=-1, k=-1, pivot=-1, pivotId=-1;
    int heapSize=0, child=-1, right=-1;
    std::int32_t divisor=1, maximum=0;
    int digit=-1;
    bool condition=false;
    std::string phase="ready", fault;
    Counters counters;
};
struct Ignore { void operator()(const char*, const State&) const noexcept {} };
inline State input(const std::vector<std::int32_t>& values) {
    if (values.size()>32) throw std::length_error("at most 32 teaching records");
    State s; s.hi=s.heapSize=static_cast<int>(values.size());
    for (int i=0;i<s.hi;++i) s.a.push_back({values[static_cast<std::size_t>(i)],i});
    return s;
}
// One reusable n-record buffer, plus O(log n) call stack.
// @begin merge
template<class Observe=Ignore> State sort(const std::vector<std::int32_t>& values, Observe observe={}) {
    State s=input(values);
    s.tmp.resize(s.a.size()); // @trace merge.allocate
    observe("merge.allocate",s);
    auto recurse=[&](auto&& self,int lo,int hi)->void {
        s.lo=lo; s.hi=hi; s.mid=-1; s.i=s.j=s.k=-1; s.stack.emplace_back(lo,hi);
        s.counters.maxDepth=std::max(s.counters.maxDepth,static_cast<int>(s.stack.size()));
        s.phase="divide"; // @trace merge.enter
        observe("merge.enter",s);
        s.condition=hi-lo<2; // @trace merge.base
        observe("merge.base",s);
        if (!s.condition) {
            const int mid=lo+(hi-lo)/2; s.mid=mid; // @trace merge.split
            observe("merge.split",s);
            self(self,lo,mid); self(self,mid,hi);
            s.lo=lo; s.hi=hi; s.mid=mid; s.i=lo; s.j=mid; s.k=lo;
            s.phase="merge"; ++s.counters.passes;
            // Reset diagnostic occupancy; not an algorithmic item write.
            for (int p=lo;p<hi;++p) s.tmp[p].reset(); // @trace merge.cursors
            observe("merge.cursors",s);
            while (s.k<hi) {
                s.condition=s.j==hi || (s.i<mid && s.a[s.i].key<=s.a[s.j].key); // @trace merge.choose
                if (s.i<mid && s.j<hi) ++s.counters.comparisons;
                observe("merge.choose",s);
                s.tmp[s.k]=s.a[s.condition?s.i:s.j]; ++s.counters.bufferWrites; // @trace merge.output
                observe("merge.output",s);
                if (s.condition) ++s.i; else ++s.j;
                ++s.k; // @trace merge.advance
                observe("merge.advance",s);
            }
            s.phase="copyback"; s.k=lo; // @trace merge.copy-start
            observe("merge.copy-start",s);
            while (s.k<hi) {
                s.a[s.k]=*s.tmp[s.k]; ++s.counters.writes; // @trace merge.copy
                observe("merge.copy",s);
                ++s.k; // @trace merge.copy-next
                observe("merge.copy-next",s);
            }
        }
        s.lo=lo; s.hi=hi; s.mid=-1; s.i=s.j=s.k=-1;
        s.stack.pop_back(); s.phase="return"; // @trace merge.leave
        observe("merge.leave",s);
    };
    recurse(recurse,0,static_cast<int>(s.a.size()));
    s.phase="done"; // @trace merge.done
    observe("merge.done",s); return s;
}
// @end merge
} // namespace merge_sort
