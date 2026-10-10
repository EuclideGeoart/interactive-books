#include "LinearSearch.hpp"
#include <cassert>
int main() {
    using namespace search_sort;
    assert(linear({10,20,30,40,50},40).result==3);
    assert(linear({2,1,2},2).result==0);
    assert(linear({},0).result==-1);
    assert(linear({40},40).counts.comparisons==1);
    assert(linear({-1000000,0,1000000},1000000).result==2);
    assert(linear({1,2,3},4).counts.comparisons==3);
}
