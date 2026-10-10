#include "Fundamentals.hpp"
#include <cassert>
int main() {
    using namespace search_sort;
    assert(fundamentals({4,2,5,1,3}).inversions==6);
    assert(fundamentals({1,2,2,3}).inversions==0);
    assert(fundamentals({3,2,1},true).inversions==0);
    assert(fundamentals({}).checked==0);
    assert(fundamentals({40}).inversions==0);
    assert(!stable(fundamentals({2,1,2},false,0,2).a));
}
