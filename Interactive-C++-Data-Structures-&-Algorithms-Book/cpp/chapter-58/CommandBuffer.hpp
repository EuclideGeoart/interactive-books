#pragma once
#include <array>
#include <functional>
#include <limits>
#include <optional>
#include <stdexcept>
#include <utility>
#include <vector>

namespace chapter58 {
struct Handle { int index = -1, generation = 0; };
enum class Kind { Create, Move, Delete };
// Owned scalar payload. Create uses value; Move uses target and delta=value; Delete uses target.
struct Command { Kind kind; Handle target{}; int value = 0; };
struct Slot { int generation = 1; std::optional<int> value; };
// code: 0 success, 1 stale handle, 2 full world, 3 arithmetic overflow.
struct Report { int command, code; Handle handle; };
struct State {
  std::array<Slot, 8> slots{};
  std::vector<Command> commands;
  std::vector<Report> reports;
  int cursor = 0, recorded = 0, executed = 0, failures = 0, validations = 0;
  bool flushing = false;
};
using Observer = std::function<void(const char*, const State&)>;
class CommandBuffer {
  State s_; Observer observe_;
  void emit(const char* tag) const { if (observe_) observe_(tag, s_); }
public:
  explicit CommandBuffer(Observer observer = {}) : observe_(std::move(observer)) {
    s_.commands.reserve(16); s_.reports.reserve(16);
    s_.slots[0].value = 10; // Known initial world; handle {0,1}.
  }
  CommandBuffer(const CommandBuffer&) = delete;
  CommandBuffer& operator=(const CommandBuffer&) = delete;
  CommandBuffer(CommandBuffer&&) = delete;
  CommandBuffer& operator=(CommandBuffer&&) = delete;
  // Observer callbacks must be nonthrowing and nonreentrant; copy snapshots to retain them.
  const State& state() const { return s_; }
  // Fixed owner with pre-reserved records/reports; no borrowed payload lifetimes.
  // @begin commands
  void record(Command c) {
    if (s_.flushing || s_.commands.size() >= 16) throw std::length_error("record at boundary; capacity 16");
    if (c.kind != Kind::Create && c.kind != Kind::Move && c.kind != Kind::Delete) throw std::invalid_argument("unknown command");
    if (c.value < -100 || c.value > 100) throw std::out_of_range("payload -100..100");
    s_.commands.push_back(c); ++s_.recorded; // @trace commands.record
    emit("commands.record");
  }
  void flush() {
    if (s_.flushing) throw std::logic_error("nonreentrant flush");
    s_.flushing = true; s_.cursor = 0; s_.reports.clear(); // @trace commands.begin
    emit("commands.begin");
    for (const auto& c : s_.commands) {
      int code = 0; Handle result = c.target;
      if (c.kind == Kind::Create) {
        int free = -1;
        for (int i = 0; i < 8; ++i) if (!s_.slots[i].value && s_.slots[i].generation < 65535) { free = i; break; }
        if (free < 0) code = 2;
        else {
          s_.slots[free].value = c.value; result = {free, s_.slots[free].generation}; // @trace commands.create
          emit("commands.create");
        }
      } else {
        ++s_.validations;
        const bool valid = c.target.index >= 0 && c.target.index < 8 && s_.slots[c.target.index].value && s_.slots[c.target.index].generation == c.target.generation; // @trace commands.validate
        emit("commands.validate");
        if (!valid) code = 1;
        else if (c.kind == Kind::Delete) {
          auto& slot = s_.slots[c.target.index]; slot.value.reset(); ++slot.generation; // @trace commands.delete
          emit("commands.delete");
        } else {
          auto& value = *s_.slots[c.target.index].value;
          if ((c.value > 0 && value > std::numeric_limits<int>::max() - c.value) || (c.value < 0 && value < std::numeric_limits<int>::min() - c.value)) code = 3;
          else {
            value += c.value; // @trace commands.move
            emit("commands.move");
          }
        }
      }
      s_.reports.push_back({s_.cursor, code, result}); ++s_.executed; if (code) ++s_.failures;
      ++s_.cursor; // @trace commands.report
      emit("commands.report");
    }
    s_.commands.clear(); s_.flushing = false; s_.cursor = 0; // @trace commands.end
    emit("commands.end");
  }
  // @end commands
};
}
