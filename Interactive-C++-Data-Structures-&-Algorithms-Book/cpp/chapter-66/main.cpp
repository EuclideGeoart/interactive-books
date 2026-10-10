#include "BroadPhase.hpp"
#include <cassert>
#include <iostream>
int main() {
  std::vector<chapter66::Object> objects{{"A",{{-1,-1,-1},{0,0,0}}},{"B",{{0,0,0},{1,1,1}}},{"C",{{0,0,3},{1,1,4}}}};
  const auto s=chapter66::broad_phase(objects,3); assert(s.exact.size()==1); assert(s.tests==static_cast<int>(s.candidates.size()));
  std::cout<<"Broad phase: true 3D AABB overlap, no geometry-contact claim\n";
}
