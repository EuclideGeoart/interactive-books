#pragma once
#include <array>
#include <functional>
#include <stdexcept>
#include <utility>
#include <vector>

namespace chapter57 {
struct State {
  std::vector<int> current, next, processed;
  std::array<bool, 8> current_flags{}, next_flags{};
  int cursor = 0, wave = 0, active = -1, marks = 0, dedupes = 0, visits = 0;
  bool processing = false, broken = false;
};
using Observer = std::function<void(const char*, const State&)>;
class DirtyWorkList {
  State s_; Observer observe_;
  void emit(const char* tag) const { if (observe_) observe_(tag, s_); }
  static void domain(int id) { if (id < 0 || id >= 8) throw std::out_of_range("ID must be 0..7"); }
public:
  explicit DirtyWorkList(Observer observer = {}) : observe_(std::move(observer)) {
    s_.current.reserve(8); s_.next.reserve(8); s_.processed.reserve(8);
  }
  DirtyWorkList(const DirtyWorkList&) = delete;
  DirtyWorkList& operator=(const DirtyWorkList&) = delete;
  DirtyWorkList(DirtyWorkList&&) = delete;
  DirtyWorkList& operator=(DirtyWorkList&&) = delete;
  // Observer callbacks must be nonthrowing and nonreentrant; copy snapshots to retain them.
  const State& state() const { return s_; }
  // @begin dirty
  bool mark(int id) {
    domain(id); s_.active = id; ++s_.marks;
    auto& queue = s_.processing ? s_.next : s_.current;
    auto& flags = s_.processing ? s_.next_flags : s_.current_flags;
    if (flags[id]) {
      ++s_.dedupes; // @trace dirty.dedupe
      emit("dirty.dedupe"); return false;
    }
    queue.push_back(id); flags[id] = true; // @trace dirty.mark
    emit("dirty.mark"); return true;
  }
  bool begin_wave() {
    if (s_.processing) throw std::logic_error("wave already active");
    if (s_.current.empty()) return false;
    s_.processing = true; s_.cursor = 0; s_.processed.clear(); ++s_.wave; // @trace dirty.begin
    emit("dirty.begin"); return true;
  }
  bool process_one() {
    if (!s_.processing) throw std::logic_error("begin a wave first");
    if (s_.cursor == static_cast<int>(s_.current.size())) return false;
    s_.active = s_.current[s_.cursor++]; s_.processed.push_back(s_.active); ++s_.visits; // @trace dirty.process
    emit("dirty.process"); return true;
  }
  void finish_wave() {
    if (!s_.processing || s_.cursor != static_cast<int>(s_.current.size()))
      throw std::logic_error("finish requires the current wave to be consumed");
    s_.current.swap(s_.next); s_.next.clear();
    s_.current_flags = s_.next_flags; s_.next_flags.fill(false);
    s_.processing = false; s_.cursor = 0; // @trace dirty.boundary
    emit("dirty.boundary");
  }
  void clear() {
    if (s_.processing) throw std::logic_error("clear only at a stable boundary");
    s_.current.clear(); s_.next.clear(); s_.current_flags.fill(false); s_.next_flags.fill(false);
    s_.processed.clear(); s_.active = -1; // @trace dirty.clear
    emit("dirty.clear");
  }
  // @end dirty
  // @begin dirty-break
  void break_duplicate(int id) {
    domain(id);
    if (!s_.current_flags[id] || s_.current.size() >= 16) throw std::logic_error("requires a queued ID and room");
    s_.current.push_back(id); s_.broken = true; // @trace dirty.duplicate
    emit("dirty.duplicate");
  }
  void break_flag(int id) {
    domain(id);
    if (!s_.current_flags[id]) throw std::logic_error("requires a queued ID");
    s_.current_flags[id] = false; s_.broken = true; // @trace dirty.corrupt
    emit("dirty.corrupt");
  }
  // @end dirty-break
};
}
