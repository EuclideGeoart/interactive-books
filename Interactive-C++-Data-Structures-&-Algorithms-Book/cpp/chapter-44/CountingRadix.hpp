#pragma once
#include <algorithm>
#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace integer_sort {
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
// @begin counting
template<class Observe=Ignore> State counting(const std::vector<std::int32_t>& values, int maxKey=9, Observe observe={}) {
    for (const auto v:values) if (v<0) throw std::invalid_argument("nonnegative keys required");
    if (maxKey<0 || maxKey>99) throw std::invalid_argument("maxKey must be 0..99");
    for (const auto v:values) if (v>maxKey) throw std::invalid_argument("key outside counting domain");
    State s=input(values);
    if (!s.a.empty()) do {
        s.counts.assign(static_cast<std::size_t>(maxKey+1),0); s.tmp.assign(s.a.size(),std::nullopt);
        s.counters.bufferWrites+=static_cast<int>(s.counts.size()); ++s.counters.passes;
        s.phase="histogram"; s.i=s.j=s.k=-1; s.digit=-1; // @trace counting.clear
        observe("counting.clear",s);
        for (s.i=0;s.i<static_cast<int>(s.a.size());++s.i) {
            s.digit=s.a[s.i].key;
            
            ++s.counts[s.digit]; ++s.counters.bufferWrites; // @trace counting.count
            observe("counting.count",s);
        }
        s.phase="cumulative";
        for (s.k=1;s.k<static_cast<int>(s.counts.size());++s.k) {
            s.counts[s.k]+=s.counts[s.k-1]; ++s.counters.bufferWrites; // @trace counting.prefix
            observe("counting.prefix",s);
        }
        s.phase="place";
        for (int t=0;t<static_cast<int>(s.a.size());++t) {
            s.i=static_cast<int>(s.a.size())-1-t;
            s.digit=s.a[s.i].key;
            
            --s.counts[s.digit]; s.j=s.counts[s.digit]; ++s.counters.bufferWrites; // @trace counting.reserve
            observe("counting.reserve",s);
            s.tmp[s.j]=s.a[s.i]; ++s.counters.bufferWrites; // @trace counting.output
            observe("counting.output",s);
        }
        s.phase="copyback";
        for (s.k=0;s.k<static_cast<int>(s.a.size());++s.k) {
            s.a[s.k]=*s.tmp[s.k]; ++s.counters.writes; // @trace counting.copy
            observe("counting.copy",s);
        }
        s.phase="pass"; // @trace counting.pass
        observe("counting.pass",s);
        break;
    } while (true);
    s.phase="done"; // @trace counting.done
    observe("counting.done",s); return s;
}
// @end counting

// @begin radix
template<class Observe=Ignore> State radix(const std::vector<std::int32_t>& values, bool unstable=false, Observe observe={}) {
    for (const auto v:values) if (v<0) throw std::invalid_argument("nonnegative keys required");
    State s=input(values);
    for (s.i=0;s.i<static_cast<int>(s.a.size());++s.i) {
        ++s.counters.maximumScans; s.maximum=std::max(s.maximum,s.a[s.i].key); // @trace radix.maximum
        observe("radix.maximum",s);
    }
    if (!s.a.empty()) do {
        s.counts.assign(10,0); s.tmp.assign(s.a.size(),std::nullopt);
        s.counters.bufferWrites+=static_cast<int>(s.counts.size()); ++s.counters.passes;
        s.phase="histogram"; s.i=s.j=s.k=-1; s.digit=-1; // @trace radix.clear
        observe("radix.clear",s);
        for (s.i=0;s.i<static_cast<int>(s.a.size());++s.i) {
            s.digit=(s.a[s.i].key/s.divisor)%10;
            ++s.counters.digitReads;
            ++s.counts[s.digit]; ++s.counters.bufferWrites; // @trace radix.count
            observe("radix.count",s);
        }
        s.phase="cumulative";
        for (s.k=1;s.k<static_cast<int>(s.counts.size());++s.k) {
            s.counts[s.k]+=s.counts[s.k-1]; ++s.counters.bufferWrites; // @trace radix.prefix
            observe("radix.prefix",s);
        }
        s.phase="place";
        for (int t=0;t<static_cast<int>(s.a.size());++t) {
            s.i=unstable?t:static_cast<int>(s.a.size())-1-t;
            s.digit=(s.a[s.i].key/s.divisor)%10;
            ++s.counters.digitReads;
            --s.counts[s.digit]; s.j=s.counts[s.digit]; ++s.counters.bufferWrites; // @trace radix.reserve
            observe("radix.reserve",s);
            s.tmp[s.j]=s.a[s.i]; ++s.counters.bufferWrites; // @trace radix.output
            observe("radix.output",s);
        }
        s.phase="copyback";
        for (s.k=0;s.k<static_cast<int>(s.a.size());++s.k) {
            s.a[s.k]=*s.tmp[s.k]; ++s.counters.writes; // @trace radix.copy
            observe("radix.copy",s);
        }
        s.phase="pass"; // @trace radix.pass
        observe("radix.pass",s);
        // Check BEFORE multiplying: divisor*10 is never evaluated past int32.
        s.condition=s.divisor>s.maximum/10; // @trace radix.last
        observe("radix.last",s);
        if (s.condition) break;
        s.divisor*=10; // @trace radix.divisor
        observe("radix.divisor",s);
    } while (true);
    s.phase="done"; // @trace radix.done
    if (unstable) s.fault="Forward traversal with decrementing ends reverses equal-digit groups; LSD composition is not guaranteed sorted.";
    observe("radix.done",s); return s;
}
// @end radix
} // namespace integer_sort
