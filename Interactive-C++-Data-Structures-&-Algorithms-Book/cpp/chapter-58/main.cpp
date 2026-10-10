#include "CommandBuffer.hpp"
#include <cassert>
#include <iostream>
#include <map>
#include <type_traits>
static_assert(!std::is_copy_constructible_v<chapter58::CommandBuffer> && !std::is_copy_assignable_v<chapter58::CommandBuffer>
           && !std::is_move_constructible_v<chapter58::CommandBuffer> && !std::is_move_assignable_v<chapter58::CommandBuffer>);
int main() {
  using namespace chapter58;
  CommandBuffer buffer;
  const std::vector<Command> log{{Kind::Create,{},11}, {Kind::Move,{1,1},5}, {Kind::Delete,{0,1},0}, {Kind::Move,{0,1},5}, {Kind::Create,{},22}, {Kind::Move,{0,2},5}};
  for (auto c : log) buffer.record(c);
  assert(buffer.state().slots[0].value == 10 && !buffer.state().slots[1].value);
  buffer.flush(); const auto& s = buffer.state();
  assert(s.reports.size() == 6 && s.reports[3].code == 1 && s.failures == 1);
  const std::map<int,int> expected{{0,27},{1,16}};
  for (int i = 0; i < 8; ++i) assert(expected.contains(i) ? s.slots[i].value == expected.at(i) : !s.slots[i].value);
  assert(s.slots[0].generation == 2 && s.commands.empty());
  CommandBuffer replay; for (auto c : log) replay.record(c); replay.flush();
  for (int i = 0; i < 8; ++i) assert(s.slots[i].value == replay.state().slots[i].value && s.slots[i].generation == replay.state().slots[i].generation);
  buffer.flush(); assert(buffer.state().reports.empty()); // Consumed records do not execute twice.
  CommandBuffer full; for (int i = 0; i < 9; ++i) full.record({Kind::Create,{},i}); full.flush(); assert(full.state().failures == 2 && full.state().reports.size() == 9);
  CommandBuffer capacity; for (int i = 0; i < 16; ++i) capacity.record({Kind::Move,{-1,1},1});
  bool rejected = false; try { capacity.record({Kind::Create,{},1}); } catch (const std::length_error&) { rejected = true; } assert(rejected);
  capacity.flush(); assert(capacity.state().failures == 16);
  CommandBuffer invalid; rejected = false; try { invalid.record({Kind::Create,{},101}); } catch (const std::out_of_range&) { rejected = true; } assert(rejected);
  rejected = false; try { invalid.record({static_cast<Kind>(8),{},1}); } catch (const std::invalid_argument&) { rejected = true; } assert(rejected);
  CommandBuffer owned; Command payload{Kind::Move,{0,1},5}; owned.record(payload);
  payload.target = {-1,1}; payload.value = 99; // Caller changes cannot alter the recorded value or target.
  owned.flush(); assert(owned.state().slots[0].value == 15 && owned.state().reports[0].code == 0);
  owned.record({Kind::Move,{0,1},2}); owned.flush();
  assert(owned.state().slots[0].value == 17 && owned.state().executed == 2);
  assert(owned.state().reports.size() == 1 && owned.state().reports[0].command == 0);
  CommandBuffer retirement;
  for (int generation = 1; generation < 65535; ++generation) {
    retirement.record({Kind::Delete,{0,generation},0}); retirement.record({Kind::Create,{},1}); retirement.flush();
    assert(retirement.state().reports[0].code == 0 && retirement.state().reports[1].code == 0);
    const auto created = retirement.state().reports[1].handle;
    assert(created.index == (generation == 65534 ? 1 : 0));
    assert(created.generation == (generation == 65534 ? 1 : generation + 1));
  }
  assert(!retirement.state().slots[0].value && retirement.state().slots[0].generation == 65535);
  retirement.record({Kind::Move,{0,1},1}); retirement.flush(); assert(retirement.state().reports[0].code == 1);
  std::cout << "chapter58: independent expected world, record/flush boundary, order, stale continuation, replay, exhaustion passed\n";
}
