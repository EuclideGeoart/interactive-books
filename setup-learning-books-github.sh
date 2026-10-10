#!/usr/bin/env bash
# Publish existing local branches to a NEW private GitHub repository.
# Book II is intentionally outside this checkout until its active work is complete.
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
FEATURE="feat/book-i-dsa-v1"
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null || die "git is required."
command -v gh >/dev/null || die "GitHub CLI (gh) is required."
gh auth status >/dev/null 2>&1 || die "Run 'gh auth login -h github.com -p https' first."

[[ "$(git -C "$ROOT" rev-parse --show-toplevel)" == "$ROOT" ]] || die "Wrong repository: $ROOT"
git -C "$ROOT" show-ref --verify --quiet refs/heads/main || die "Missing local main branch"
git -C "$ROOT" show-ref --verify --quiet "refs/heads/$FEATURE" || die "Missing Book I feature branch"
[[ -z "$(git -C "$ROOT" status --porcelain)" ]] || die "Worktree has uncommitted changes; review them before publishing."

OWNER="$(gh api user --jq '.login')" || die "Unable to identify signed-in GitHub account"
REPO="${LEARNING_REPO:-$OWNER/interactive-books}"
printf 'Proposed destination: %s\n' "$REPO"

if gh repo view "$REPO" >/dev/null 2>&1; then
  die "$REPO already exists. Aborting safely without changing any remote branch; inspect it first."
fi
if git -C "$ROOT" remote get-url origin >/dev/null 2>&1; then
  die "origin already exists. Aborting rather than replacing an existing remote."
fi

gh repo create "$REPO" --private --source "$ROOT" --remote origin
gh auth setup-git -h github.com

git -C "$ROOT" push -u origin main
git -C "$ROOT" push -u origin "$FEATURE"
gh pr create --repo "$REPO" --base main --head "$FEATURE" \
  --title "Book I: Interactive C++ Data Structures & Algorithms v1" \
  --body "## Summary
- Import the completed 67-chapter interactive C++ Data Structures & Algorithms book as Book I.
- Include canonical C++20 examples, Astro learning application, tests and visual baselines, release docs, and base-aware installable PWA.
- Keep generated output, dependencies, and historical duplicate delivery directories out of Git.

## Validated release floor
- 67/67 canonical C++ chapter examples.
- 6,273/6,273 unit tests.
- 1,069 browser tests passed with two intentional viewport skips.
- Root and /book/ base-path PWA/offline checks passed.

## Scope
- Book II stays at its existing location under active development with its current Git history untouched.
- No shared-platform refactor is part of this PR."

printf '\nPR URL:\n'
gh pr view --repo "$REPO" --json url --jq .url
