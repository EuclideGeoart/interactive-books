import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
export const specializedFiles = {
  avl: ['14', 'AvlTree'],
  rb: ['15', 'RedBlackTree'],
  btree: ['16', 'BTree'],
  bplus: ['16', 'BPlusTree'],
  trie: ['17', 'Trie'],
};
// Only the temporary translation unit is instrumented. The shipped algorithm is read verbatim.
export function compileSpecializedFixture(kind) {
  const [chapter, name] = specializedFiles[kind];
  const folder = resolve('.cpp-build');
  mkdirSync(folder, { recursive: true });
  let header = readFileSync(
    `cpp/chapter-${chapter}/${name}.hpp`,
    'utf8',
  ).replace('#pragma once', '');
  let fields;
  if (kind === 'avl')
    fields =
      'out << "[" << n->key << "," << book_id(n->left) << "," << book_id(n->right) << "," << n->height << "]";';
  else if (kind === 'rb')
    fields =
      'out << "[" << n->key << "," << book_id(n->left) << "," << book_id(n->right) << "," << book_id(n->parent) << "," << n->red << "]";';
  else if (kind === 'trie')
    fields = `out << "[" << n->terminal << ",["; bool first=true;for(auto [c,child]:n->children){if(!first)out << ",";first=false;out << "[\\\"" << c << "\\\"," << book_id(child) << "]";}out << "]]";`;
  else
    fields = `out << "[" << n->leaf << ",[";for(std::size_t j=0;j<n->keys.size();++j){if(j)out << ",";out << n->keys[j];}out << "],[";for(std::size_t j=0;j<n->children.size();++j){if(j)out << ",";out << book_id(n->children[j]);}out << "]";${kind === 'bplus' ? 'out << "," << book_id(n->next);' : ''}out << "]";`;
  header = header.replace(
    '// @book-debug',
    `mutable std::vector<Node*> book_nodes;
 int book_id(const Node* n)const{if(!n)return -1;for(std::size_t i=0;i<book_nodes.size();++i)if(book_nodes[i]==n)return static_cast<int>(i);return -2;}
 std::string book_state()const{std::ostringstream out;out << "[" << book_id(root) << ",[";for(std::size_t i=0;i<book_nodes.size();++i){if(i)out << ",";Node* n=book_nodes[i];if(!n){out << "null";continue;} ${fields}}out << "]]";return out.str();}`,
  );
  header = header
    .split('\n')
    .map((line) => {
      const tag = line.match(/@trace ([\w.-]+)/)?.[1];
      if (!tag) return line;
      const code = line.replace(/\s*\/\/ @trace .*/, '');
      const emit = tag.startsWith('bp.range.')
        ? `book_range_trace("${tag}",book_state(),out);`
        : `book_trace("${tag}",book_state());`;
      if (/^\s*return\b/.test(code)) return `${emit}${code}`;
      if (/Node\* created\s*=\s*new Node/.test(code))
        return `${code} book_nodes.push_back(created); ${emit}`;
      if (/^\s*delete (\w+);/.test(code)) {
        const variable = code.match(/delete (\w+)/)[1];
        return `book_nodes[book_id(${variable})]=nullptr; ${code} ${emit}`;
      }
      return `${code} ${emit}`;
    })
    .join('\n');
  const driver = `#include <iostream>
#include <sstream>
#include <string>
#include <vector>
bool tracing=false;
void book_trace(const char* tag,const std::string& state){if(tracing)std::cout << tag << '|' << state << '\\n';}
void book_range_trace(const char* tag,std::string state,const std::vector<int>& out){state.pop_back();state+=",[";for(std::size_t i=0;i<out.size();++i){if(i)state+=",";state+=std::to_string(out[i]);}state+="]]";book_trace(tag,state);}
${header}
int main(int argc,char** argv){if(argc<4)return 2;${name} tree;std::string op=argv[1];${kind === 'trie' ? 'std::string key=argv[2];' : 'int key=std::stoi(argv[2]);'}for(int i=4;i<argc;++i)tree.insert(${kind === 'trie' ? 'argv[i]' : 'std::stoi(argv[i])'});tracing=true;if(op=="insert")tree.insert(key);else if(op=="search")(void)tree.contains(key);${kind === 'trie' ? 'else if(op=="prefix")(void)tree.starts_with(key);' : ''}${kind === 'avl' || kind === 'trie' ? 'else if(op=="erase")tree.erase(key);' : ''}${kind === 'bplus' ? 'else if(op=="range")(void)tree.range(key,std::stoi(argv[3]));' : ''}tracing=false;if(!tree.valid())return 3;}
`;
  const path = resolve(folder, `${kind}-specialized-trace`);
  writeFileSync(`${path}.cpp`, driver);
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
