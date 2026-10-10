#include "TeachingHash.hpp"
#include <cassert>
int main() {
    hashing::validate_key("cat");
    assert(hashing::teaching_hash("cat") == 98262);
    assert(hashing::bucket_index(hashing::teaching_hash("cat"), 8) == 6);
    assert(hashing::bucket_index(hashing::teaching_hash("a"), 8) == hashing::bucket_index(hashing::teaching_hash("i"), 8));
    assert(hashing::bucket_index(hashing::teaching_hash("a"), 16) != hashing::bucket_index(hashing::teaching_hash("i"), 16));
    try { hashing::validate_key("Cat"); assert(false); } catch (const std::invalid_argument&) {}
    try { hashing::bucket_index(1, 0); assert(false); } catch (const std::invalid_argument&) {}
}
