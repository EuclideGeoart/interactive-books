# P04 native-scroll assertion correction

Correction commit: `b0b3dd000667e89790ce931d20f757100492872f`. The only test change is:

```ts
await wrapper.focus();
await wrapper.press('ArrowRight');
await expect.poll(() => wrapper.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
```

The previous assertion read the native scroll position immediately after the key event. The product uses ordinary browser scrolling; no keyboard handler is added. Focus/ArrowRight actions, overflow detection, the requirement for positive actual scrollLeft, all mobile cases, physical viewport checks and geometry tolerances are unchanged. No fixed delay or numerical loosening was introduced.

## Retained failed run

Owner source/delivery `6312c583b81f2ccbbe0df63b21f6281ec416aa4f`: first seven gates green (74 units, 12 Python tests, 23 fresh cases); root browser collected 144 cases, **121 passed / 23 failed**, recorded CLI exit **1**. Subpath browser was not run. Outer tool cleanup 143 is separate from that CLI result.

The owner attributed 15 owned mobile failures to the immediate native-scroll assertion. The held-slider-reset case passed all viewports; numerical geometry/state cases otherwise passed as reported by the owner. The retained JSON also distinguishes seven shared publication timeouts from one shared-test **III-25 mobile physical-width assertion failure at book.spec.ts:58** (duration 20534 ms). That width observation remains for investigation; it is not relabeled as a timing failure.

Read-only owner evidence:
- `artifacts/integrator-focused-validation-6312c58.log` SHA256 `1639aaac0fe462cba8e5ba3708b771a7f7d1b963ca0e6af22999fb18514098a6`
- `artifacts/integrator-focused-6312c58-exit.txt` SHA256 `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865`
- `artifacts/browser-root.json` SHA256 `b8fa1ad64b71c35bf50bcfda1e53db5d293003f9706fbf3a38b3f8999c7e72d3`
- `artifacts/integrator-browser-diagnosis-6312c58.json` SHA256 `d8b7549e700b80c2b9f42332cd542e9149b0f174b9027edb898536e8e2e2a7b3`

Raw report, manifest, exit file and failure PNGs were not changed. Only a scoped evidence summary is committed.

## Owner measured diagnosis

On the profiled current-production mobile page, the focused table had clientWidth 340, scrollWidth 545, immediate scrollLeft 0, and scrollLeft 40 after 250 ms. The diagnosis JSON records focus as true, innerWidth 390 and document scrollWidth 390.

The same profiled page had 4551 DOM nodes / 281327 HTML characters. Single-worker full-page Axe took 6675.239984 ms in light and 6412.163992 ms in dark, with zero violations in each scan. Owner also reported numeric commit 34 ms and page load 192 ms. These measurements support asynchronous native scrolling and a shared concurrent accessibility-scan budget issue; they do not constitute all-chapter visual acceptance.

The shared per-chapter publication test performs two full-page/theme scans with the existing two-worker/default-30-second budget. A scoped request for the measured timing issue is in INTEGRATION_REQUESTS.md. Shared tests/config remain untouched. Any compatibility synchronization awaits the owner's exact approved SHA; original Wave A/reference tags remain immutable.

## Verification and hold

Author inspected the one-line test diff and passed whitespace checks. No browser, compile, build, oracle sweep or other heavy job was run for this correction, and no corrected browser pass is claimed. Owner will rerun after preflight and its separate validation-budget decision. P04 remains runtime **CORRECTION REQUIRED**, with subpath/full visual acceptance pending.
