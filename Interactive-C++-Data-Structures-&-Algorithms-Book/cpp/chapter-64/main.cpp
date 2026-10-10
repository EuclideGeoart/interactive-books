#include "RTree.hpp"
#include <cassert>
#include <iostream>
int main() {
  chapter64::RTree tree;
  tree.insert({"A",{-3,-3,-1,-1}}); tree.insert({"B",{0,0,2,2}}); tree.insert({"C",{2,2,4,4}}); tree.insert({"D",{-1,1,1,3}});
  auto result=tree.query({2,2,3,3}); std::sort(result.begin(),result.end()); assert((result==std::vector<std::string>{"B","C"}));
  std::cout<<"R-tree: touching boxes B and C accepted\n";
}
