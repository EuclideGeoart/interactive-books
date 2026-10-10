#include <functional>
#include <iostream>
#include <string>
std::function<void(const char*)> observer;
void ownership_trace(const char* tag) { if (observer) observer(tag); }
const void* observed_block = nullptr;
void ownership_pool(const char* tag, const void* block) { observed_block = block; ownership_trace(tag); }
#include "Pool.hpp"
struct Item { int value; explicit Item(int v) : value(v) { if (v == -1000) throw std::runtime_error("failure"); } ~Item() noexcept = default; };
template<std::size_t N> void run(const std::string& op, int value) {
    Pool<Item, N> pool;
    void* memory = nullptr;
    if (op == "construct" || op == "destroy" || op == "deallocate" || op == "live-return") {
        memory = pool.allocate();
        if (op != "construct") pool.construct(memory, value);
        if (op == "deallocate") pool.destroy(memory);
    }
    observer = [&](const char* tag) {
        std::cout << tag << '|' << pool.free_head() << '|' << pool.slot(observed_block);
        for (std::size_t i = 0; i < N; ++i) {
            std::cout << '|' << static_cast<int>(pool.state(i)) << ',' << pool.alive(i) << ',' << pool.next(i) << ',';
            if (pool.object(i)) std::cout << pool.object(i)->value; else std::cout << "null";
        }
        std::cout << '\n';
    };
    try {
        if (op == "allocate") pool.allocate();
        else if (op == "construct") pool.construct(memory, value);
        else if (op == "destroy") pool.destroy(memory);
        else if (op == "deallocate" || op == "live-return") pool.deallocate(memory);
        else if (op == "foreign") { int foreign = 0; pool.deallocate(&foreign); }
        else if (op == "exhaustion") { for (std::size_t i = 0; i <= N; ++i) pool.allocate(); }
        else if (op == "reorder") { void* a = pool.allocate(); void* b = N > 1 ? pool.allocate() : nullptr; pool.deallocate(a); if (b) pool.deallocate(b); }
        else if (op == "failure") pool.create(-1000);
        else {
            memory = pool.allocate(); pool.construct(memory, value); pool.destroy(memory);
            if (op == "use-after-destroy") pool.get(memory);
            else {
                pool.deallocate(memory);
                if (op == "double-free") pool.deallocate(memory);
                if (op == "reuse") { memory = pool.allocate(); pool.construct(memory, value + 1); }
            }
        }
    } catch (const std::exception&) {}
    observer = {};
}
int main(int argc, char** argv) {
    if (argc != 4) return 2;
    const auto count = std::stoi(argv[2]); const auto value = std::stoi(argv[3]);
    switch (count) {
        case 1: run<1>(argv[1], value); break; case 2: run<2>(argv[1], value); break;
        case 3: run<3>(argv[1], value); break; case 4: run<4>(argv[1], value); break;
        case 5: run<5>(argv[1], value); break; case 6: run<6>(argv[1], value); break;
        default: return 2;
    }
}
