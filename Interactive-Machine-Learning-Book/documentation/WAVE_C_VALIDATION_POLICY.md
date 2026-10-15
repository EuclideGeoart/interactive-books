# Wave C implementation and validation ownership

2026-10-14 · integration-owner operational record · starting delivery `944594728554eca8777773f9d12b70e08613ba77`.

The user's current Wave C assignment supersedes the validation duties in the preserved Part V/VI prompts and authoring instructions. P05 and P06 implement concurrently in their dedicated linked D-volume worktrees, using GPT-6.1 Sol High. Their eight Part-local ownership prefixes remain authoritative. They may read, author and commit; they may not execute tests, oracles, fixture generation/freshness, type/lint/compile/build checks, browsers/captures, benchmarks or validation runners. Their handoffs must say **IMPLEMENTATION COMPLETE — UNVALIDATED — OWNER VALIDATION REQUIRED**.

The integration owner reviews both complete sources before provisional history-preserving merges. Any pending fixture generation is owner-controlled and confined to the new Parts. The owner records the integrated source commit and validation signature, then runs one combined `npm run validate:milestone` without `--part`, serialized with `/tmp/interactive-books-heavy-gate.lock`. All nine gates cover all registered chapters. Failures retain their raw evidence and require precise corrections and the necessary owner-controlled reruns; a partial pass is never acceptance.

The owner independently reviews the mathematics, canonical Python, oracle independence, state/trace/render synchronization, exercises, physical layouts and actual production screenshots. A delegated independent reviewer may inspect source only and may not execute validation or edit files. Accepted source, all 13 III-07 hashes, protected books, original tags and prior fixture/screenshot/evidence baselines remain immutable.

The work stops after a locally accepted Wave C delivery and annotated freeze tag, with III-01–31 complete and a handoff for a separate Wave D conversation. Canonical main, push and deployment remain outside the authorization.
