#pragma once
#include <algorithm>
#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace quick_sort {
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
enum class Fault { none, bounds, pivot, no_progress };
// Half-open Lomuto. i is the next free position in the <= pivot partition.
// Swap storage is O(1); worst-case recursive stack is O(n).
// @begin quick
template<class Observe=Ignore> State sort(const std::vector<std::int32_t>& values, Fault fault=Fault::none, Observe observe={}) {
    State s=input(values);
    auto swap=[&](int a,int b) { std::swap(s.a[a],s.a[b]); ++s.counters.swaps; s.counters.writes+=2; };
    auto recurse=[&](auto&& self,int lo,int hi)->void {
        s.lo=lo; s.hi=hi; s.i=s.j=s.pivot=s.pivotId=-1; s.stack.emplace_back(lo,hi);
        s.counters.maxDepth=std::max(s.counters.maxDepth,static_cast<int>(s.stack.size()));
        s.phase="partition"; // @trace quick.enter
        observe("quick.enter",s);
        s.condition=hi-lo<2; // @trace quick.base
        observe("quick.base",s);
        if (!s.condition) {
            s.pivot=hi-1; s.pivotId=s.a[s.pivot].id; s.i=lo; s.j=lo; ++s.counters.passes;
            const auto pivotKey=s.a[s.pivot].key; // @trace quick.pivot
            observe("quick.pivot",s);
            if (fault==Fault::bounds) {
                s.j=hi; s.phase="fault";
                s.fault="Scan index equals exclusive high; guard prevents an out-of-bounds read."; // @trace quick.bounds-fault
                observe("quick.bounds-fault",s); return;
            }
            if (fault==Fault::pivot) {
                swap(lo,s.pivot); s.phase="fault";
                s.fault="Pivot identity moved before partition; saved pivot index no longer owns that record."; // @trace quick.pivot-fault
                observe("quick.pivot-fault",s); return;
            }
            while (true) {
                s.condition=s.j<hi-1; // @trace quick.scan
                observe("quick.scan",s);
                if (!s.condition) break;
                ++s.counters.comparisons; s.condition=s.a[s.j].key<=pivotKey; // @trace quick.compare
                observe("quick.compare",s);
                if (s.condition) {
                    swap(s.i,s.j); // @trace quick.swap
                    observe("quick.swap",s);
                    ++s.i; // @trace quick.grow
                    observe("quick.grow",s);
                }
                ++s.j; // @trace quick.advance
                observe("quick.advance",s);
            }
            swap(s.i,hi-1); s.pivot=s.i; s.phase="partitioned"; // @trace quick.place
            observe("quick.place",s);
            const int p=s.i;
            if (fault==Fault::no_progress) {
                const int requestedChildSize=hi-lo;
                s.condition=requestedChildSize<hi-lo; s.phase="fault";
                s.fault="Requested child equals its parent range. Strict-shrink guard stops recursion."; // @trace quick.progress-fault
                observe("quick.progress-fault",s); return;
            }
            self(self,lo,p); self(self,p+1,hi);
        }
        s.lo=lo; s.hi=hi; s.i=s.j=s.pivot=s.pivotId=-1;
        s.stack.pop_back(); s.phase="return"; // @trace quick.leave
        observe("quick.leave",s);
    };
    recurse(recurse,0,static_cast<int>(s.a.size()));
    if (s.fault.empty()) {
        s.phase="done"; // @trace quick.done
        observe("quick.done",s);
    }
    return s;
}
// @end quick
} // namespace quick_sort
