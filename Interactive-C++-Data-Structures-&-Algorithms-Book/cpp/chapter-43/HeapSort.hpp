#pragma once
#include <algorithm>
#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace heap_sort {
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
// Exact Chapter 9 sift-down child guard, strict better-child policy and
// parent stop rule, adapted to heapSize so finalized suffix records remain.
// @begin heap
template<class Observe=Ignore> State sort(const std::vector<std::int32_t>& values, Observe observe={}) {
    State s=input(values);
    auto swap=[&](int a,int b) { std::swap(s.a[a],s.a[b]); ++s.counters.swaps; s.counters.writes+=2; };
    auto down=[&](int start) {
        s.i=start; s.child=s.right=-1;
        while (true) {
            s.child=s.right=-1; s.condition=s.i<s.heapSize/2; // @trace heap.has-child
            observe("heap.has-child",s);
            if (!s.condition) break;
            s.child=2*s.i+1; // @trace heap.left
            observe("heap.left",s);
            s.right=s.child+1; // @trace heap.right
            observe("heap.right",s);
            if (s.right<s.heapSize) ++s.counters.comparisons;
            s.condition=s.right<s.heapSize && s.a[s.right].key>s.a[s.child].key; // @trace heap.choose
            observe("heap.choose",s);
            if (s.condition) {
                s.child=s.right; // @trace heap.child
                observe("heap.child",s);
            }
            ++s.counters.comparisons; s.condition=s.a[s.child].key<=s.a[s.i].key; // @trace heap.ordered
            observe("heap.ordered",s);
            if (s.condition) break;
            swap(s.i,s.child); // @trace heap.swap
            observe("heap.swap",s);
            s.i=s.child; // @trace heap.advance
            observe("heap.advance",s);
        }
    };
    s.phase="build"; // @trace heap.build
    observe("heap.build",s);
    for (int start=s.heapSize/2;start>0;) {
        --start; s.k=start; // @trace heap.root
        observe("heap.root",s); down(start);
    }
    s.phase="heap"; s.i=s.child=s.right=-1; // @trace heap.built
    observe("heap.built",s);
    while (s.heapSize>1) {
        s.phase="extract"; swap(0,s.heapSize-1); ++s.counters.passes; // @trace heap.extract
        observe("heap.extract",s);
        --s.heapSize; s.phase="sift"; // @trace heap.shrink
        observe("heap.shrink",s);
        down(0); s.phase="heap"; s.i=s.child=s.right=-1; // @trace heap.restored
        observe("heap.restored",s);
    }
    s.heapSize=0; s.phase="done"; // @trace heap.done
    observe("heap.done",s); return s;
}
// @end heap
} // namespace heap_sort
