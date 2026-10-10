#include "Recursion.hpp"
#include <cassert>
#include <iostream>
int main() {
  int expected = 1;
  for (int n = 0; n <= 8; ++n) {
    if (n) expected *= n;
    assert(chapter45::factorial_recursive(n).value == expected);
    assert(chapter45::factorial_iterative(n).value == expected);
  }
  std::cout << "4! = " << chapter45::factorial_recursive(4).value << '\n';
}
