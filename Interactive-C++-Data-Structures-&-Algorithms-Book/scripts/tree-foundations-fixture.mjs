import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// Compile instrumented copies of the SHIPPED headers. Hooks never change the
// canonical algorithms; each condition records after evaluating its operand,
// and each recursive call records after the actual helper returns.
export function compileTreeFoundationsFixture() {
  const build = resolve('.cpp-build/tree-foundations');
  mkdirSync(build, { recursive: true });
  let base = readFileSync('cpp/chapter-10/BinaryTree.hpp', 'utf8');
  let bst = readFileSync('cpp/chapter-11/BinarySearchTree.hpp', 'utf8');
  let traversal = readFileSync('cpp/chapter-12/Traversal.hpp', 'utf8');
  const constructor = /explicit Node\(int v\)\s*:\s*value\(v\)\s*\{\s*\}/;
  if (!constructor.test(base))
    throw new Error('Canonical Node constructor hook not found.');
  base = base.replace(
    constructor,
    'explicit Node(int v) : value(v) { book_nodes.push_back(this); book_identity.push_back(this); }\n        ~Node() { for(auto& p:book_nodes) if(p==this) {p=nullptr;break;} }',
  );
  // Actual recursive frames, including null child calls, live until return.
  const dfsEntry =
    /inline void dfs\(const Node\* node, Order order, std::vector<int>& output\)\s*\{/;
  if (!dfsEntry.test(traversal))
    throw new Error('Canonical DFS frame hook not found.');
  traversal = traversal.replace(
    dfsEntry,
    'inline void dfs(const Node* node, Order order, std::vector<int>& output) {\n    BookFrame book_frame(node);',
  );
  const transform = (source) =>
    source
      .replace(/^#pragma once\n/gm, '')
      .replace(/^#include "[^\n]+\n/gm, '')
      .split('\n')
      .map((line) => {
        const tag = line.match(/\/\/ @trace ([\w.-]+)/)?.[1];
        if (!tag) return line;
        const code = line.replace(/\s*\/\/ @trace .*/, '');
        let prepare = '';
        // Hooks read current native vectors/queues after the corresponding statement.
        if (tag === 'dfs.output' || tag === 'bfs.output')
          prepare = 'book_output = &output;';
        if (tag === 'append.index') prepare += 'book_queue_cursor = &i;';
        if (tag.startsWith('append.') && !['append.slot'].includes(tag))
          prepare +=
            'book_queue.clear(); for(auto* p:queue) book_queue.push_back(book_id(p));';
        if (tag.startsWith('bfs.') && !['bfs.output'].includes(tag))
          prepare +=
            'book_queue.clear(); {auto copy=queue; while(!copy.empty()){book_queue.push_back(book_id(copy.front()));copy.pop();}}';
        const emit = `${prepare} book_trace("${tag}");`;
        if (/\b(if|while) \(/.test(code))
          return code.replace(
            /(if|while) \((.*)\) \{/,
            `$1 ([&] { bool condition = ($2); ${emit} return condition; }()) {`,
          );
        if (/\b(return|break)\b/.test(code)) return `${emit} ${code}`;
        const local = code.match(/(?:const )?Node(\*\*|\*) (\w+) =/);
        const registration = local
          ? `${local[1] === '**' ? 'BookSlot' : 'BookRef'} book_local_${local[2]}("${local[2]}", &${local[2]});`
          : '';
        return `${code} ${registration} ${emit}`;
      })
      .join('\n');
  const cpp = `#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <queue>
#include <map>
#include <functional>
std::vector<const void*> book_nodes, book_identity;
std::vector<int>* book_output=nullptr;
const std::size_t* book_queue_cursor=nullptr;
std::vector<int> book_queue, book_frames;
bool tracing=false;
int book_id(const void* p) { if(!p)return -1;for(std::size_t i=0;i<book_identity.size();++i)if(book_identity[i]==p)return static_cast<int>(i);return -2; }
std::map<std::string,std::function<int()>> book_refs;
std::pair<int,std::string> book_slot_info(const void*);
std::map<std::string,std::function<std::pair<int,std::string>()>> book_slots;
struct BookRef {
 std::string name;
 template<typename T> BookRef(const char* n,T** p):name(n){book_refs[name]=[p]{return book_id(*p);};}
 ~BookRef(){book_refs.erase(name);}
};
struct BookSlot {
 std::string name;
 template<typename T> BookSlot(const char* n,T*** p):name(n){book_slots[name]=[p]{return book_slot_info(*p);};}
 ~BookSlot(){book_slots.erase(name);}
};
struct BookFrame { explicit BookFrame(const void* p) { book_frames.push_back(book_id(p)); } ~BookFrame(){book_frames.pop_back();} };
void book_trace(const char*);
${transform(base)}
${transform(bst)}
${transform(traversal)}
const BinaryTree* binary_ptr=nullptr;
const BinarySearchTree* bst_ptr=nullptr;
std::pair<int,std::string> book_slot_info(const void* slot) {
 for(std::size_t i=0;i<book_nodes.size();++i) {
   auto* n=static_cast<const BinaryTree::Node*>(book_nodes[i]);if(!n)continue;
   if(slot==&n->left)return {static_cast<int>(i),"left"};
   if(slot==&n->right)return {static_cast<int>(i),"right"};
 }
 return {-1,"root"};
}
void book_trace(const char* tag) {
 if(!tracing)return;
 auto root=bst_ptr?bst_ptr->root():binary_ptr->root();
 std::cout << tag << "|[" << book_id(root) << ",[";
 for(std::size_t i=0;i<book_nodes.size();++i) {if(i)std::cout<<",";auto* n=static_cast<const BinaryTree::Node*>(book_nodes[i]);if(!n)std::cout<<"null";else std::cout<<"["<<n->value<<","<<book_id(n->left)<<","<<book_id(n->right)<<"]";}
 auto print=[](const std::vector<int>& v){std::cout<<"[";for(std::size_t i=0;i<v.size();++i){if(i)std::cout<<",";std::cout<<v[i];}std::cout<<"]";};
 std::cout<<"],";print(book_output?*book_output:std::vector<int>{});std::cout<<",";print(book_queue);std::cout<<",";print(book_frames);
 std::cout<<",{";bool first=true;for(const auto& [name,read]:book_refs){if(!first)std::cout<<",";first=false;std::cout<<"\\\""<<name<<"\\\":"<<read();}
 std::cout<<"},{";first=true;for(const auto& [name,read]:book_slots){if(!first)std::cout<<",";first=false;auto [owner,field]=read();std::cout<<"\\\""<<name<<"\\\":["<<owner<<",\\\""<<field<<"\\\"]";}
 std::cout<<"},";if(book_queue_cursor)std::cout<<*book_queue_cursor;else std::cout<<"null";std::cout<<"]\\n";
}
int main(int argc,char** argv) {
 if(argc<4)return 2;
 const std::string kind=argv[1],op=argv[2];const int value=std::stoi(argv[3]);
 BinaryTree binary;BinarySearchTree bst;const bool ordered=kind=="bst";
 for(int i=4;i<argc;++i){if(ordered)bst.insert(std::stoi(argv[i]));else binary.append(std::stoi(argv[i]));}
 if(ordered)bst_ptr=&bst;else binary_ptr=&binary;
 book_queue.clear();book_queue_cursor=nullptr;tracing=true;
 std::string result="null";
 auto pointer_result=[&](const BinaryTree::Node* p){result=p?std::to_string(p->value):"null";};
 auto vector_result=[&](const std::vector<int>& v){std::ostringstream out;out<<"[";for(std::size_t i=0;i<v.size();++i){if(i)out<<",";out<<v[i];}out<<"]";result=out.str();};
 if(op=="insert")result=bst.insert(value)?"true":"false";
 else if(op=="erase")result=bst.erase(value)?"true":"false";
 else if(op=="search")pointer_result(bst.search(value));
 else if(op=="minimum")pointer_result(bst.minimum());
 else if(op=="maximum")pointer_result(bst.maximum());
 else if(op=="successor")pointer_result(bst.successor(value));
 else if(op=="predecessor")pointer_result(bst.predecessor(value));
 else if(op=="append")binary.append(value);
 else if(op=="clear"){if(ordered)bst.clear();else binary.clear();}
 else if(op=="bfs")vector_result(tree_traversal::breadth_first(ordered?bst.root():binary.root()));
 else vector_result(tree_traversal::depth_first(ordered?bst.root():binary.root(),op=="preorder"?tree_traversal::Order::preorder:op=="inorder"?tree_traversal::Order::inorder:tree_traversal::Order::postorder));
 std::cout<<"RESULT|"<<result<<"\\n";
 tracing=false;book_output=nullptr;book_queue_cursor=nullptr;
}
`;
  const path = `${build}/trace`;
  writeFileSync(`${path}.cpp`, cpp);
  execFileSync(process.env.CXX || 'g++', [
    '-std=c++20',
    '-Wall',
    '-Wextra',
    '-Werror',
    '-pedantic',
    `${path}.cpp`,
    '-o',
    path,
  ]);
  return path;
}
