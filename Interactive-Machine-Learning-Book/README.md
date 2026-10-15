# Interactive Machine Learning — Book III

Nine Parts and 41 chapters: from samples and prediction to evaluation and the transition to neural networks. Each chapter connects a manipulable numerical model with equations, executable Python+NumPy, independent mathematical oracles and browser state.

**Copyright © 2026 Mario Balit.** Original Book III educational content is licensed under CC BY-NC-SA 4.0 as described in [COPYRIGHT_AND_LICENSING.md](COPYRIGHT_AND_LICENSING.md). Original software, source code and code examples remain all rights reserved. The maintainer commands below grant no permission to execute or build the software locally, copy or run it in classroom demonstrations, copy or modify the code, incorporate it into another project, or redistribute it. The public source archive is provided for reading and inspection; separate permission is required for those uses unless an applicable legal exception applies. Third-party material retains its own license terms.

Book III is complete and locally accepted at **41/41 chapters across nine Parts**. Public content and source-code terms are in [COPYRIGHT_AND_LICENSING.md](COPYRIGHT_AND_LICENSING.md). The annotated tag `book-iii-complete-freeze-20261014` resolves to `5cf15d69199972f01cdbb0fe21d39049589f4850`. See `documentation/BOOK_III_COMPLETE_ACCEPTANCE.md` for the source-bound acceptance and `documentation/BOOK_III_PUBLICATION_GO_NO_GO.md` for the separate publication decision. Contracts remain in `documentation/MASTER_PLAN.md`, `documentation/ARCHITECTURE_DECISIONS.md` and `documentation/CHAPTER_AUTHORING.md`.

Use the actual provisioned Node/NumPy environment. Node packages are linked individually from the installed native Linux packages with independent worktree caches; `.venv` is a read-only environment link. Do not overwrite the canonical Windows installations or create a clone/environment.

```sh
npm run dev
npm run validation:enumerate
flock /tmp/interactive-books-heavy-gate.lock -c 'npm run validate:milestone'
npm run serve             # http://127.0.0.1:4461/
npm run serve:subpath     # http://127.0.0.1:4462/machine-learning/
```

`npm run build` targets `/`. `npm run build:subpath` targets `/machine-learning/` or an explicitly selected `BOOK_BASE`; the build wrapper normalizes that mount and refuses source/configuration changes during compilation. `PUBLIC_BOOK_II_BASE` explicitly selects the Book II prerequisite deployment (default `/math-foundations/`), using the frozen 97 real ID-to-slug mappings. The same configuration must apply when auditing its build. A local standalone Book III server serves Book III; a collection host supplies the Book II mount or an explicit separate Book II URL.

Part manifests are plain JSON in `src/parts/pNN/manifest.json`, so Astro and validation use the same registration validator. Content IDs derive from physical files, not frontmatter overrides. Part-local oracle manifests and real numerical/browser suites are mandatory. All heavy tests/builds/browser work use the integrator's single slot; Windows requires separate coordination. Root/subpath production audits check links/assets, source freshness and offline paths; browser tests cover 1440/820/390 layouts, both themes and actual numeric/physical state.

No push or deployment is authorized. Books I/II, their accepted releases and visual baselines remain read-only. Native Windows, real touch hardware and human screen-reader acceptance must be reported separately from emulated Linux browser checks.
