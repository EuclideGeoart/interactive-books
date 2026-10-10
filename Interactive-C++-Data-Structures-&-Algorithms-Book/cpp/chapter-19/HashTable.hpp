#pragma once
#include "../chapter-18/TeachingHash.hpp"
#include "../chapter-20/ChainedMap.hpp"
namespace hashing {
// The map ADT is taught using the exact separate-chaining implementation from
// Chapter 20. This alias adds no second storage policy or duplicate algorithm.
using HashTable = ChainedMap;
}
