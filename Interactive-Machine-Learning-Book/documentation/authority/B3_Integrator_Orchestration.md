# /goal — Book III Astra Ultra integrator / Part-agent orchestration

**Role:** integrator, shared-architecture owner, independent acceptance reviewer; **not** a Part implementation agent. This guide is activated **only after** the Book III M0/M1 + III-07 reference is accepted/frozen in the canonical D: monorepo.

## Preflight (hard gate)

- Canonical: `/media/mario-geometry/WD_SN7100_NVMe/coding-projects/interactive-books`; Windows `D:\coding-projects\interactive-books`.
- Read the accepted M0/M1/III-07 freeze commit, Book III directory, authoritative 9-Part / 41-chapter plan, chapter manifest schema, stable Book II prerequisite IDs, trace/state API, golden-oracle contract, validation scripts, navigator UX constraints and current Git/worktree state.
- On 2026-10-13 the canonical main repository contains Books I/II only; Book III must be authored/frozen by the foundation agent before these Part tasks can be launched. Do not base work on obsolete pre-foundation SHA `325f7bdf`.
- Verify root `.gitignore` explicitly permits the Book III directory (it previously allowed only Books I and II). Do not change Book I/II release state.
- Keep Book I/II publication audit worktrees entirely separate. Use D:-resident linked worktrees for Part agents; their branch names are in the individual prompts. Lock Linux-only worktrees and document safe Windows retirement/recreation.
- Freeze ownership map BEFORE agents begin. Confirm separate Part-local folders, fixtures, tests, documentation and data; identify any shared-code requests for integrator handling.
- Consider frozen III-07 canonical: Agent P02 extends it via documented contracts but cannot rewrite it.

## Recommended release waves (two Part agents at a time)

1. **Wave A:** P01 ML Foundations + P02 Regression/Classification remainder (III-08..16; III-07 is frozen).
2. **Wave B:** P03 k-NN/Naive Bayes + P04 Trees/Ensembles.
3. **Wave C:** P05 Clustering + P06 PCA/Dimensionality Reduction.
4. **Wave D:** P07 SVM + P08 Evaluation/Practical ML.
5. **Wave E:** P09 Neural-network transition (Book III scope only).

Each Part has one accountable agent; neither Part agent owns shared architecture or another Part's files. Execute Part agents simultaneously **within a wave**, but schedule only one expensive build/oracle sweep/Playwright run at any moment across the full repository and across operating systems. Linux heavy slots use `flock /tmp/interactive-books-heavy-gate.lock -c '...actual M1 runner command...'`; Windows work must be coordinated outside this Linux lock.

## Suggested worktree provisioning (integrator only)

Use the **actual post-foundation main SHA** as base. Create worktrees from the canonical repo on D: using `git worktree add --lock ... -b ... <path> <accepted-base>` after verifying no preexisting branches/paths; do not repeat if they already exist. Avoid blindly doing a bulk worktree add for all nine before scheduling them. Protect each worktree's Linux-specific admin path; do not `prune` from Windows. No independent clones. No direct agent push.

## Part registration and integration

- Frozen foundation should support Part-local declarative manifests or predictable module discovery; agents must not edit a central chapter registry concurrently. If foundation lacks this, open one integrator-only compatibility patch before wave A.
- Agents may request a shared API change in a Part-local `INTEGRATION_REQUESTS.md`, with failing fixture and minimal compatibility design; defer to integrator, do not patch shared internals opportunistically.
- On handoff, review *exact diff vs approved wave base*, mathematical semantics, independent oracle independence, Python↔TypeScript trace parity, deterministic seeds, on-screen state, accessible responsive layouts, browser / PWA path correctness and baseline impact.
- **Do not integrate a Part just because its author reports green tests.** Independently rerun critical oracles and failure cases. Reject hidden branch/registry collisions, missing links, invented data, untested layouts and unsupported math claims.
- Integrate accepted commits only into canonical main after review, one at a time, preserving unrelated changes; run the **combined** suite after both Parts are integrated. No automated GitHub push or Cloudflare publish.
- Freeze the combined wave only after both focused gates and cross-Part regression pass; update curriculum availability and navigation through integrator-owned registration, not by individual agents.

## Final acceptance outcomes

Use **BLOCK**, **CORRECTION REQUIRED**, **ACCEPT WITH LIMITATIONS**, or **ACCEPT / FREEZE**. Record accepted HEAD, tests and screenshots/baseline hashes, known limitations, dependency resolution and follow-up tasks. Start the next wave only after the preceding wave is accepted. If project policy later authorizes more than two concurrent agents, raise code concurrency without relaxing shared-file ownership or single heavy-test scheduling.

## Absolute constraints

No old Linux checkout development; no agent session/config/history deletion; no `reset --hard`, `git clean`, force pushes, historical rewriting, blanket snapshot update, Windows `node_modules` overwritten by Linux installs, Book I/II release mutation or unsolicited deployment.
