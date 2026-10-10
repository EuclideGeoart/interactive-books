import { expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  avlState,
  avlTrace,
  avlInvariants,
} from '../../src/visualizers/avl/model';
import {
  redBlackState,
  redBlackTrace,
  redBlackInvariants,
} from '../../src/visualizers/red-black/model';
import {
  bTreeState,
  bTreeTrace,
  bTreeInvariants,
} from '../../src/visualizers/b-tree/model';
import {
  trieState,
  trieTrace,
  trieInvariants,
  trieWords,
} from '../../src/visualizers/trie/model';
import { avlAdapter } from '../../src/visualizers/avl/adapter';
import { redBlackAdapter } from '../../src/visualizers/red-black/adapter';
import { bTreeAdapter } from '../../src/visualizers/b-tree/adapter';
import { trieAdapter } from '../../src/visualizers/trie/adapter';
for (const [values, key, directions] of [
  [[30, 20], 10, ['right']],
  [[10, 20], 30, ['left']],
  [[30, 10], 20, ['left', 'right']],
  [[10, 30], 20, ['right', 'left']],
] as const)
  it(`AVL ${directions} preserves identity, restores helper scopes and all invariants`, () => {
    const t = avlTrace('insert', avlState([...values]), key);
    for (const direction of directions) {
      const tags = t.steps.map((s) => s.source);
      const start = tags.indexOf(`avl.${direction}.pivot`);
      expect(tags.slice(start, start + 7)).toEqual(
        [
          'pivot',
          'transfer',
          'detach',
          'attach',
          'old-height',
          'new-height',
          'return',
        ].map((x) => `avl.${direction}.${x}`),
      );
      expect(t.steps[start]!.state.refs).toHaveProperty('x');
      expect(t.steps[start]!.state.refs).toHaveProperty('y');
      const returned = t.steps[start + 7]!;
      expect(returned.event.type).toBe('EndScope');
      expect(returned.state.refs).not.toHaveProperty('transfer');
      expect(returned.state.refs).not.toHaveProperty('x');
    }
    expect(
      avlInvariants(t.steps.at(-1)!.state, true).every(
        (i) => i.status === 'pass',
      ),
    ).toBe(true);
    expect(t.steps.at(-1)!.state.refs).toEqual({});
    expect(t.steps.at(-1)!.state.stack).toEqual([]);
  });
it('AVL recursion restores the caller current and does not leak rotation locals', () => {
  const t = avlTrace('insert', avlState([40, 20, 60, 10, 30]), 5);
  for (const step of t.steps.filter(
    (s) => s.title === 'Return from insert' && s.state.stack?.length,
  )) {
    expect(step.state.refs.current).not.toBeNull();
    expect(step.state.refs).not.toHaveProperty('created');
  }
  for (const step of t.steps.filter((s) => s.source === 'avl.repair.node'))
    expect(Object.keys(step.state.refs)).toEqual(['n']);
});
it('RB has actual parent links and helper scopes restore P/U/G after rotations', () => {
  const t = redBlackTrace('insert', redBlackState([30, 10]), 20);
  for (const step of t.steps.filter((s) => s.title === 'Return from rotate')) {
    expect(step.state.refs).toHaveProperty('P');
    expect(step.state.refs).toHaveProperty('G');
    expect(step.state.refs).not.toHaveProperty('transfer');
    expect(step.state.refs).not.toHaveProperty('x');
  }
  const after = t.steps.find((s) => s.title === 'Return from fix_insert')!;
  expect(Object.keys(after.state.refs).sort()).toEqual([
    'created',
    'current',
    'p',
  ]);
  expect(
    redBlackInvariants(t.steps.at(-1)!.state, true).every(
      (i) => i.status === 'pass',
    ),
  ).toBe(true);
});
it('Trie distinguishes word from prefix and safely preserves shared suffix ownership', () => {
  let s = trieState();
  expect(trieTrace('search', s, 'ca').steps.at(-1)!.state.result).toBe(
    'Word not found',
  );
  expect(trieTrace('prefix', s, 'ca').steps.at(-1)!.state.result).toBe(
    'Prefix exists',
  );
  s = trieTrace('erase', s, 'car').steps.at(-1)!.state;
  expect(trieWords(s)).toEqual(['care', 'cat', 'dog']);
  const t = trieTrace('erase', s, 'care');
  expect(trieWords(t.steps.at(-1)!.state)).toEqual(['cat', 'dog']);
  for (const step of t.steps.filter((s) => s.source === 'trie.erase.unlink')) {
    const current = step.state.refs.current!,
      child = step.state.refs.child!;
    expect(Object.values(step.state.nodes[current]!.children)).not.toContain(
      child,
    );
    expect(step.state.nodes[child]!.live).toBe(true);
  }
  const absent = trieTrace('search', s, 'cab').steps.find(
    (s) => s.source === 'trie.search.terminal',
  )!;
  expect(absent.state.refs.current).toBeNull();
  expect(absent.state.stack).toEqual([]);
});
it('B+ search helpers and split scopes leave no stale full/created references', () => {
  const t = bTreeTrace('insert', bTreeState('bplus', [1, 2, 3]), 4);
  const endSearch = t.steps.find((s) => s.title === 'Return from contains')!;
  expect(endSearch.state.refs).toEqual({});
  const split = t.steps.find((s) => s.title === 'Return from split')!;
  expect(split.state.refs).not.toHaveProperty('full');
  expect(
    bTreeInvariants(t.steps.at(-1)!.state, true).every(
      (i) => i.status === 'pass',
    ),
  ).toBe(true);
});
it('block-local allocation pointers end after their publishing blocks', () => {
  for (const values of [[], [1, 2, 3]])
    for (const kind of ['btree', 'bplus'] as const) {
      const t = bTreeTrace('insert', bTreeState(kind, values), 4);
      const added = t.steps.find(
        (step) =>
          step.source === (kind === 'btree' ? 'bt' : 'bp') + '.insert.added',
      )!;
      expect(added.state.refs).not.toHaveProperty('created');
    }
  const t = trieTrace('insert', trieState([]), 'cat');
  for (const step of t.steps.filter((step) =>
    [
      'trie.insert.start',
      'trie.insert.advance',
      'trie.insert.terminal',
    ].includes(step.source ?? ''),
  ))
    expect(step.state.refs).not.toHaveProperty('created');
});
it('family invariant checkers reject controlled faults', () => {
  const avl = avlState([20, 10, 30]);
  avl.nodes[avl.root!]!.height = 99;
  expect(avlInvariants(avl, true).some((i) => i.status === 'fail')).toBe(true);
  const rb = redBlackState([20, 10, 30]);
  rb.nodes[rb.root!]!.red = true;
  expect(redBlackInvariants(rb, true).some((i) => i.status === 'fail')).toBe(
    true,
  );
  const bt = bTreeState('bplus', [1, 2, 3, 4]);
  const leaf = bt.nodes.find((n) => n.leaf && n.next !== null)!;
  leaf.next = null;
  expect(bTreeInvariants(bt, true).some((i) => i.status === 'fail')).toBe(true);
  const trie = trieState(['a']);
  trie.nodes[trie.root!]!.children['A'] = trie.root!;
  expect(trieInvariants(trie, true).some((i) => i.status === 'fail')).toBe(
    true,
  );
});
it('all adapters reject invalid, unbounded and unknown operations', () => {
  for (const adapter of [avlAdapter, redBlackAdapter, bTreeAdapter]) {
    const inputs = new FormData();
    inputs.set('values', '1,2,NaN');
    expect(() => adapter.build('insert', inputs)).toThrow();
    inputs.set('values', Array(25).fill('1').join(','));
    expect(() => adapter.build('insert', inputs)).toThrow();
    inputs.set('values', '1,2');
    inputs.set('value', '1000');
    expect(() => adapter.build('insert', inputs)).toThrow();
    inputs.set('value', '3');
    expect(() => adapter.build('invent', inputs)).toThrow();
  }
  const words = new FormData();
  words.set('word', 'Car');
  expect(() => trieAdapter.build('insert', words)).toThrow();
  words.set('word', 'a'.repeat(13));
  expect(() => trieAdapter.build('insert', words)).toThrow();
  expect(() => trieState(Array(9).fill('a'))).toThrow();
  expect(() => bTreeTrace('range', bTreeState('bplus'), 20, 10)).toThrow();
});
it('canonical cores pass randomized set oracle, complete deletion and allocation-failure recovery under ASan/UBSan', () => {
  const build = resolve('.cpp-build');
  mkdirSync(build, { recursive: true });
  const path = resolve(build, 'specialized-core');
  const source = `#include <algorithm>
#include <cassert>
#include <cstdlib>
#include <new>
#include <random>
#include <limits>
#include <type_traits>
#include <set>
#include <string>
#include <vector>
#include "${resolve('cpp/chapter-14/AvlTree.hpp')}"
#include "${resolve('cpp/chapter-15/RedBlackTree.hpp')}"
#include "${resolve('cpp/chapter-16/BTree.hpp')}"
#include "${resolve('cpp/chapter-16/BPlusTree.hpp')}"
#include "${resolve('cpp/chapter-17/Trie.hpp')}"
static int budget=-1;
void* operator new(std::size_t n){if(budget==0)throw std::bad_alloc();if(budget>0)--budget;if(void* p=std::malloc(n?n:1))return p;throw std::bad_alloc();}
void operator delete(void* p)noexcept{std::free(p);}
void operator delete(void* p,std::size_t)noexcept{std::free(p);}
template<class T>void numeric(){
 static_assert(!std::is_copy_constructible_v<T> && !std::is_move_constructible_v<T>);
 {T extremes;for(int key:{std::numeric_limits<int>::min(),0,std::numeric_limits<int>::max()}){assert(extremes.insert(key));assert(extremes.valid());}for(int key:{0,std::numeric_limits<int>::max(),std::numeric_limits<int>::min()}){assert(extremes.erase(key));assert(extremes.valid());}}
 std::mt19937 rng(123456);for(int round=0;round<60;++round){T tree;std::set<int> oracle;for(int i=0;i<350;++i){int key=static_cast<int>(rng()%101)-50;if(rng()%2){assert(tree.insert(key)==oracle.insert(key).second);}else{assert(tree.erase(key)==(oracle.erase(key)>0));}assert(tree.valid());assert(tree.values()==std::vector<int>(oracle.begin(),oracle.end()));for(int k:{-50,0,50})assert(tree.contains(k)==oracle.contains(k));}std::vector<int> keys(oracle.begin(),oracle.end());std::shuffle(keys.begin(),keys.end(),rng);for(int key:keys){assert(tree.erase(key));assert(tree.valid());}assert(tree.empty());tree.clear();assert(tree.valid());}
 for(int count:{0,3,15,63,127})for(int limit=0;limit<30;++limit){T tree;for(int i=0;i<count;++i)tree.insert(i*2);auto before=tree.values();budget=limit;bool threw=false;try{tree.insert(count*2+1);}catch(const std::bad_alloc&){threw=true;}budget=-1;assert(tree.valid());if(threw)assert(tree.values()==before);tree.insert(count*2+1);assert(tree.valid());assert(tree.contains(count*2+1));}
}
int main(){numeric<AvlTree>();numeric<RedBlackTree>();numeric<BTree>();numeric<BPlusTree>();
 for(int limit=0;limit<35;++limit){Trie trie;trie.insert("car");trie.insert("dog");auto before=trie.words();budget=limit;bool threw=false;try{trie.insert("cartography");}catch(const std::bad_alloc&){threw=true;}budget=-1;assert(trie.valid());if(threw)assert(trie.words()==before);trie.insert("cartography");assert(trie.contains("cartography"));assert(trie.erase("car"));assert(trie.contains("cartography"));assert(trie.valid());}
 for(int limit=0;limit<25;++limit){Trie trie;budget=limit;try{trie.insert("abcdef");}catch(const std::bad_alloc&){}budget=-1;assert(trie.valid());assert(trie.empty()==trie.words().empty());}
 Trie trie;for(const char* w:{"","cat","car","care","dog","z","za"}){assert(trie.insert(w));assert(!trie.insert(w));}assert(trie.starts_with("ca"));assert(!trie.contains("ca"));for(const char* w:{"car","care","cat","dog","za","z",""}){assert(trie.erase(w));assert(trie.valid());}assert(trie.empty());bool bad=false;try{trie.insert("A");}catch(const std::invalid_argument&){bad=true;}assert(bad&&trie.empty());
 for(int limit=0;limit<90;++limit){BPlusTree tree;for(int i=0;i<30;++i)tree.insert(i);auto before=tree.values();budget=limit;bool threw=false;try{tree.erase(15);}catch(const std::bad_alloc&){threw=true;}budget=-1;assert(tree.valid());if(threw)assert(tree.values()==before);else assert(!tree.contains(15));}
 BPlusTree pages;for(int i=0;i<80;++i)pages.insert(i);assert(pages.range(20,24)==std::vector<int>({20,21,22,23,24}));assert(pages.range(5,3).empty());
}
`;
  writeFileSync(`${path}.cpp`, source);
  execFileSync(process.env.CXX || 'g++', [
    '-std=c++20',
    '-Wall',
    '-Wextra',
    '-Werror',
    '-pedantic',
    '-fsanitize=address,undefined',
    '-fno-omit-frame-pointer',
    '-no-pie',
    `${path}.cpp`,
    '-o',
    path,
  ]);
  expect(() =>
    execFileSync(path, [], {
      env: { ...process.env, ASAN_OPTIONS: 'detect_leaks=1' },
      timeout: 60000,
    }),
  ).not.toThrow();
}, 90000);
