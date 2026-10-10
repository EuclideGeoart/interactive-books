#include "UnionFind.hpp"
#include <cassert>
using namespace chapter36;
int main() {
  UnionFind d({"A", "B", "C", "D", "E", "F"});
  assert(d.unite(0, 1));
  assert(d.unite(2, 3));
  assert(d.unite(0, 2));
  assert(d.state().parent[3] == 2);
  assert(d.find(3) == 0 && d.state().parent[3] == 0);
  assert(d.state().size[0] == 4);
  assert(!d.connected(0, 4));
  assert(d.connected(1, 3));
  assert(!d.unite(1, 3));
  assert(d.make_set("G") == 6);
  bool rejected = false;
  try {
    d.find(7);
  } catch (const std::out_of_range &) {
    rejected = true;
  }
  assert(rejected);
  const auto before = d.state().parent;
  rejected = false;
  try {
    d.unite(0, -1);
  } catch (const std::out_of_range &) {
    rejected = true;
  }
  assert(rejected && d.state().parent == before);
  UnionFind empty;
  assert(empty.make_set("A") == 0 && empty.find(0) == 0);
  rejected = false;
  try {
    empty.make_set("A");
  } catch (const std::invalid_argument &) {
    rejected = true;
  }
  assert(rejected);
}
