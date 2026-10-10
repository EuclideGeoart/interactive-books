#include "BinarySearch.hpp"
#include <cassert>
int main() {
    using namespace search_sort;
    assert(binary({},2).result==-1);
    assert(binary({40},40).result==0);
    assert(binary({1,2,2,2,3},2).result==2); // Any match, not first.
    assert(binary({-1000000,0,1000000},1000000).result==2);
    assert(binary({1,2,3},4).result==-1);
    assert(binary({3,1,2},2).fault=="unsorted-domain");
    assert(binary({1},2,"nonprogress").fault=="nonprogress");
    assert(binary({1,2,3,4,5},4,"update").fault=="invalid-update");
}
