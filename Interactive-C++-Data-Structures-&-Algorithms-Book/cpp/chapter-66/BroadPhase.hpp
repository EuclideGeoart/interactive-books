#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <functional>
#include <map>
#include <set>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace chapter66 {
// Bounds are closed in every active dimension. 2D ignores z.
struct AABB { std::array<double,3> min{},max{}; };
struct Object { std::string id; AABB bounds; };
using Pair=std::pair<std::string,std::string>;
struct Cell { std::array<int,3> coords; std::vector<int> items; };
struct State { std::vector<Object> objects; std::vector<Cell> cells; std::vector<Pair> candidates,exact; int memberships=0,pair_attempts=0,tests=0; };
using Observer=std::function<void(const char*,const State&)>;
inline void validate(AABB b,int dimension) {
  if(dimension!=2 && dimension!=3) throw std::invalid_argument("dimension 2 or 3");
  for(int a=0;a<dimension;++a) if(!std::isfinite(b.min[a]) || !std::isfinite(b.max[a]) || std::abs(b.min[a])>8 || std::abs(b.max[a])>8 || b.min[a]>b.max[a]) throw std::invalid_argument("closed finite bounds in [-8,8]");
}
inline bool overlaps(AABB a,AABB b,int dimension) { for(int i=0;i<dimension;++i) if(a.min[i]>b.max[i] || a.max[i]<b.min[i]) return false; return true; }
// @region broad
// @begin broad
inline State broad_phase(std::vector<Object> objects,int dimension=2,double cell_size=4,bool filter=true,Observer observe={}) {
  if(dimension!=2 && dimension!=3) throw std::invalid_argument("dimension 2 or 3");
  if(!std::isfinite(cell_size) || cell_size<1 || cell_size>8 || objects.size()>16) throw std::invalid_argument("cell size 1..8; at most 16 objects");
  std::set<std::string> ids; for(const auto& o:objects) { validate(o.bounds,dimension); if(o.id.empty() || !ids.insert(o.id).second) throw std::invalid_argument("unique nonempty IDs"); }
  State s; s.objects=std::move(objects); const auto emit=[&](const char* tag){if(observe) observe(tag,s);};
  std::map<std::array<int,3>,int> lookup;
  for(int i=0;i<static_cast<int>(s.objects.size());++i) {
    std::array<int,3> lo{},hi{};
    for(int a=0;a<dimension;++a) { lo[a]=static_cast<int>(std::floor(s.objects[i].bounds.min[a]/cell_size)); hi[a]=static_cast<int>(std::floor(s.objects[i].bounds.max[a]/cell_size)); }
    int count=1; for(int a=0;a<dimension;++a) count*=hi[a]-lo[a]+1;
    if(s.memberships+count>4096) throw std::invalid_argument("at most 4096 cell memberships");
    for(int x=lo[0];x<=hi[0];++x) for(int y=lo[1];y<=hi[1];++y) for(int z=lo[2];z<=hi[2];++z) {
      std::array<int,3> key{x,y,z};
      auto [it,inserted]=lookup.emplace(key,static_cast<int>(s.cells.size()));
      if(inserted) s.cells.push_back({key,{}});
      s.cells[it->second].items.push_back(i); ++s.memberships;
    } // @trace broad.index
    emit("broad.index");
  }
  std::set<Pair> seen;
  for(const auto& cell:s.cells) for(std::size_t i=0;i<cell.items.size();++i) for(std::size_t j=i+1;j<cell.items.size();++j) {
    ++s.pair_attempts;
    const auto& a=s.objects[cell.items[i]].id; const auto& b=s.objects[cell.items[j]].id;
    Pair pair=std::minmax(a,b);
    if(!seen.insert(pair).second) continue;
    s.candidates.push_back(pair); // @trace broad.pair
    emit("broad.pair");
  }
  // Enumerate the deduplicated vector once: repeated cell membership never repeats an exact test.
  if(filter) for(const auto& pair:s.candidates) {
    const auto get=[&](const std::string& id)->AABB {return std::find_if(s.objects.begin(),s.objects.end(),[&](const Object& o){return o.id==id;})->bounds;};
    ++s.tests; if(overlaps(get(pair.first),get(pair.second),dimension)) s.exact.push_back(pair); // @trace broad.test
    emit("broad.test");
  }
  emit("broad.done"); return s; // @trace broad.done
}
// @end broad
} // namespace chapter66
