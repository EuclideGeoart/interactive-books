import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
mkdirSync(".cpp-build", { recursive: true });
for (let chapter = 24; chapter <= 36; chapter++) {
  const output = `.cpp-build/chapter-${chapter}`;
  execFileSync(process.env.CXX || "g++", [
    "-std=c++20",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-pedantic",
    "-g",
    "-fsanitize=address,undefined",
    "-fno-omit-frame-pointer",
    `cpp/chapter-${chapter}/main.cpp`,
    "-o",
    output,
  ]);
  execFileSync(output, {
    stdio: "inherit",
    env: { ...process.env, ASAN_OPTIONS: "detect_leaks=1" },
  });
  console.log(
    `Chapter ${chapter}: C++20 warnings-as-errors, ASan, UBSan and leaks passed.`,
  );
}
