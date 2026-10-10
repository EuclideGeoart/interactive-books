#pragma once
#include <array>
#include <functional>
#include <stdexcept>
#include <utility>
#include <vector>

namespace chapter54 {
struct State {
  std::array<int, 16> sparse{};
  std::vector<int> dense;
  int active = -1, index = -1, moved = -1, lookups = 0, moves = 0, writes = 0;
  bool pending = false, broken = false, found = false;
};
using Observer = std::function<void(const char*, const State&)>;
class SparseSet {
  State s_;
  Observer observe_;
  void emit(const char* tag) const { if (observe_) observe_(tag, s_); }
  static void domain(int id) { if (id < 0 || id >= 16) throw std::out_of_range("ID must be 0..15"); }
public:
  explicit SparseSet(Observer observer = {}) : observe_(std::move(observer)) { s_.dense.reserve(16); }
  SparseSet(const SparseSet&) = delete;
  SparseSet& operator=(const SparseSet&) = delete;
  SparseSet(SparseSet&&) = delete;
  SparseSet& operator=(SparseSet&&) = delete;
  // Observer callbacks must be nonthrowing and nonreentrant; copy snapshots to retain them.
  const State& state() const { return s_; }
  // The fixed owner keeps its reserved capacity; external references do not survive mutations.
  // Observer callbacks must not throw or reenter; take a copy to retain a snapshot.
  // @begin sparse
  bool contains(int id) {
    domain(id); s_.active = id; ++s_.lookups;
    const int i = s_.sparse[id]; s_.index = i;
    s_.found = i >= 0 && i < static_cast<int>(s_.dense.size()) && s_.dense[i] == id; // @trace sparse.lookup
    emit("sparse.lookup"); return s_.found;
  }
  bool insert(int id) {
    if (contains(id)) return false;
    s_.pending = true; s_.index = static_cast<int>(s_.dense.size());
    s_.dense.push_back(id); ++s_.writes; // @trace sparse.append
    emit("sparse.append");
    s_.sparse[id] = s_.index; ++s_.writes; s_.pending = false; // @trace sparse.publish
    emit("sparse.publish"); return true;
  }
  bool erase(int id) {
    if (!contains(id)) return false;
    s_.pending = true; s_.moved = s_.dense.back();
    if (s_.index != static_cast<int>(s_.dense.size()) - 1) {
      s_.dense[s_.index] = s_.moved; ++s_.moves; ++s_.writes; // @trace sparse.move
      emit("sparse.move");
    }
    s_.dense.pop_back(); ++s_.writes; // @trace sparse.pop
    emit("sparse.pop");
    if (s_.index < static_cast<int>(s_.dense.size())) {
      s_.sparse[s_.moved] = s_.index; ++s_.writes; // @trace sparse.repair
      emit("sparse.repair");
    }
    s_.pending = false; // @trace sparse.settle
    emit("sparse.settle"); return true;
  }
  void iterate() {
    for (int id : s_.dense) {
      s_.active = id; s_.index = s_.sparse[id]; // @trace sparse.visit
      emit("sparse.visit");
    }
  }
  // @end sparse
  // Safe teaching corruption: indices stay in allocated storage; never dereference unchecked data.
  // @begin sparse-break
  void break_mapping(int id) {
    if (!contains(id)) throw std::invalid_argument("break requires a member");
    s_.sparse[id] = 16; s_.broken = true; // @trace sparse.corrupt
    emit("sparse.corrupt");
  }
  void break_duplicate(int id) {
    if (!contains(id) || s_.dense.size() >= 16) throw std::invalid_argument("break requires a member and room");
    s_.dense.push_back(id); s_.broken = true; // @trace sparse.duplicate
    emit("sparse.duplicate");
  }
  // @end sparse-break
};
}
