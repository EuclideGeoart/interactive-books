#pragma once
#include <array>
#include <functional>
#include <limits>
#include <optional>
#include <stdexcept>
#include <utility>
#include <vector>

namespace chapter56 {
struct Handle { int index, generation; };
struct Slot { int generation = 1; bool alive = false; };
struct Pool {
  std::array<int, 8> sparse{};
  std::vector<int> dense, values;
  Pool() { dense.reserve(8); values.reserve(8); }
  bool contains(int id) const {
    return id >= 0 && id < 8 && sparse[id] >= 0 && sparse[id] < static_cast<int>(dense.size()) && dense[sparse[id]] == id;
  }
};
struct State {
  std::array<Slot, 8> slots{};
  Pool position, velocity;
  int active = -1, pool = 0, index = -1, moved = -1, validations = 0, probes = 0, updates = 0;
  bool pending = false;
};
using Observer = std::function<void(const char*, const State&)>;
class Registry {
  State s_; Observer observe_;
  void emit(const char* tag) const { if (observe_) observe_(tag, s_); }
  Pool& pool(int kind) { if (kind < 0 || kind > 1) throw std::invalid_argument("pool is 0 or 1"); return kind ? s_.velocity : s_.position; }
  void erase_pool(int kind, int id) {
    auto& p = pool(kind); if (!p.contains(id)) return;
    s_.pool = kind; s_.index = p.sparse[id]; s_.moved = p.dense.back(); s_.pending = true;
    // @begin ecs-remove
    if (s_.index != static_cast<int>(p.dense.size()) - 1) {
      p.dense[s_.index] = p.dense.back(); p.values[s_.index] = p.values.back(); // @trace ecs.move
      emit("ecs.move");
    }
    p.dense.pop_back(); p.values.pop_back(); // @trace ecs.pop
    emit("ecs.pop");
    if (s_.index < static_cast<int>(p.dense.size())) {
      p.sparse[s_.moved] = s_.index; // @trace ecs.repair
      emit("ecs.repair");
    }
    s_.pending = false; // @trace ecs.settle
    emit("ecs.settle");
    // @end ecs-remove
  }
public:
  explicit Registry(Observer observer = {}) : observe_(std::move(observer)) {}
  Registry(const Registry&) = delete;
  Registry& operator=(const Registry&) = delete;
  Registry(Registry&&) = delete;
  Registry& operator=(Registry&&) = delete;
  // Observer callbacks must be nonthrowing and nonreentrant; copy snapshots to retain them.
  const State& state() const { return s_; }
  // Destruction advancing generation from 65534 to 65535 retires the slot; never wrap.
  // Values own component data. Handles are identity checks, not owners or pointers.
  // @begin ecs
  bool valid(Handle h) {
    s_.active = h.index; ++s_.validations;
    const bool ok = h.index >= 0 && h.index < 8 && s_.slots[h.index].alive && s_.slots[h.index].generation == h.generation; // @trace ecs.validate
    emit("ecs.validate"); return ok;
  }
  std::optional<Handle> create() {
    for (int i = 0; i < 8; ++i) if (!s_.slots[i].alive && s_.slots[i].generation < 65535) {
      s_.slots[i].alive = true; s_.active = i; // @trace ecs.create
      emit("ecs.create"); return Handle{i, s_.slots[i].generation};
    }
    emit("ecs.full"); return std::nullopt; // @trace ecs.full
  }
  bool add(Handle h, int kind, int value) {
    auto& p = pool(kind);
    if (value < -100 || value > 100) throw std::out_of_range("component input -100..100");
    if (!valid(h) || p.contains(h.index)) return false;
    s_.pool = kind; s_.index = static_cast<int>(p.dense.size()); s_.pending = true;
    p.dense.push_back(h.index); p.values.push_back(value); // @trace ecs.append
    emit("ecs.append");
    p.sparse[h.index] = s_.index; s_.pending = false; // @trace ecs.publish
    emit("ecs.publish"); return true;
  }
  bool remove(Handle h, int kind) {
    auto& p = pool(kind); if (!valid(h) || !p.contains(h.index)) return false;
    erase_pool(kind, h.index); return true;
  }
  bool destroy(Handle h) {
    if (!valid(h)) return false;
    erase_pool(0, h.index); erase_pool(1, h.index);
    s_.slots[h.index].alive = false; ++s_.slots[h.index].generation; // @trace ecs.destroy
    emit("ecs.destroy"); return true;
  }
  void tick() {
    // Structural mutations are forbidden during this traversal; query joins by ID.
    for (int id : s_.velocity.dense) {
      s_.active = id; ++s_.probes; // @trace ecs.probe
      emit("ecs.probe");
      if (!s_.position.contains(id)) continue;
      auto& x = s_.position.values[s_.position.sparse[id]];
      const int dx = s_.velocity.values[s_.velocity.sparse[id]];
      if ((dx > 0 && x > std::numeric_limits<int>::max() - dx) || (dx < 0 && x < std::numeric_limits<int>::min() - dx))
        throw std::overflow_error("position overflow");
      x += dx; ++s_.updates; // @trace ecs.update
      emit("ecs.update");
    }
  }
  // @end ecs
};
}
