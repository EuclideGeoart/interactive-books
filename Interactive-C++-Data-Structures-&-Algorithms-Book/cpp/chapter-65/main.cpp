#include "BVH.hpp"
#include <cassert>
#include <iostream>
int main() {
  chapter65::BVH tree({{"A",{-3,-3,-1,-1}},{"B",{0,0,2,2}},{"C",{3,3,4,4}}});
  tree.move("A",{1,1,3,3}); assert(tree.query({2,2,2,2}).size()==2);
  tree.move("A",{1,1,3,3},true); assert(tree.query({2,2,2,2}).size()==2);
  std::cout<<"BVH: refit and rebuild preserve query correctness\n";
}
