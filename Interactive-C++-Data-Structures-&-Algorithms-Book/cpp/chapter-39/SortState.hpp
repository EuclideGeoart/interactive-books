#pragma once
#include <algorithm>
#include <cstddef>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

// Shared only by Chapters 37–40. Observer diagnostics are not algorithm workspace.
namespace search_sort {
struct Item { int key; int id; bool operator==(const Item&) const = default; };
struct Counters { int comparisons=0, swaps=0, shifts=0, writes=0, passes=0; };
struct State {
    std::vector<Item> a, original;
    std::optional<Item> held;
    std::string algorithm, fault;
    int target=0, i=-1, j=-1, low=0, high=0, mid=-1, minimum=-1;
    int boundary=0, result=-1, checked=0, inversions=0;
    bool descending=false, condition=false, done=false, changed=false;
    std::vector<std::pair<int,int>> pairs;
    Counters counts;
};
struct Ignore { void operator()(const char*, const State&) const {} };
inline State initial(const std::vector<int>& values, const std::string& algorithm, bool descending=false) {
    if (values.size()>64) throw std::length_error("at most 64 teaching items");
    State s; s.algorithm=algorithm; s.descending=descending;
    for (std::size_t i=0;i<values.size();++i) {
        if(values[i]<-1000000 || values[i]>1000000) throw std::out_of_range("teaching key bound");
        s.a.push_back({values[i],static_cast<int>(i)});
    }
    s.original=s.a; s.high=static_cast<int>(s.a.size());
    return s;
}
inline bool before(int a, int b, bool descending) { return descending ? a>b : a<b; }
inline bool ordered(const std::vector<Item>& a, bool descending=false) {
    for(std::size_t i=1;i<a.size();++i) if(before(a[i].key,a[i-1].key,descending)) return false;
    return true;
}
inline bool stable(const std::vector<Item>& a) {
    for(std::size_t i=0;i<a.size();++i) for(std::size_t j=i+1;j<a.size();++j)
        if(a[i].key==a[j].key && a[i].id>a[j].id) return false;
    return true;
}
} // namespace search_sort
