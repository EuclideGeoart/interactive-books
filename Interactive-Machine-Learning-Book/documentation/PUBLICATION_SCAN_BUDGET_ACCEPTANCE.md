# Publication accessibility scan budget — validation pending

The owner changes only the time budget of each shared chapter publication test with `test.slow()`. Both full-page/theme Axe scans, every assertion and all numerical/layout checks remain required. No test is skipped, no correctness tolerance changes, and the shared product APIs, reference and release trees remain unchanged.

Held P04 source `6312c583b81f2ccbbe0df63b21f6281ec416aa4f` passed the first seven focused gates, then root browser reported 121 passed/23 failed. Fifteen owned mobile failures checked native keyboard scrolling before its asynchronous completion; eight shared publication cases exceeded 30 seconds. The actual runner exited 1; outer tool cleanup 143 is separately recorded.

An independent serialized current-production diagnostic on mobile loaded Random Forests in 192 ms, committed a numeric query in 34 ms, and found 4551 DOM nodes. Light/dark full-page Axe scans took 6.675/6.412 seconds each in isolation with zero violations. Concurrent browser workers compounded the two scans enough to cross the original case budget. The owner grants the existing Playwright slow-test budget for these deliberately extensive publication checks. This does not change product responsiveness requirements. The native keyboard-scroll test is corrected separately within P04 to await real scroll completion.

All 16 existing accepted chapters must pass the full nine-gate milestone before this compatibility correction is accepted, merged or used as a new wave base. The original Wave A tag remains immutable. Final validation signature, actual command exit, manifest, browser reports and protected hashes will be recorded before acceptance.
