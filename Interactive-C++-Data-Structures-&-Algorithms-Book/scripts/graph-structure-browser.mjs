import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
const base = process.env.GRAPH_STRUCTURE_URL || "http://127.0.0.1:4340";
const chapters = [
  "24-graph-fundamentals",
  "25-adjacency-list-matrix",
  "26-breadth-first-search",
  "27-depth-first-search",
  "28-directed-graphs",
  "31-connected-components",
  "32-cycle-detection",
];
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});
mkdirSync("/tmp/graph-structure-browser", { recursive: true });
let checks = 0;
try {
  for (const width of [1440, 1024, 390])
    for (const slug of chapters) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
        isMobile: width === 390,
        hasTouch: width === 390,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${base}/chapters/${slug}/`);
      const lab = page.locator("[data-chapter-lab]");
      await lab.locator("svg").waitFor();
      assert.equal(await page.locator("section.chapter-section").count(), 13);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        "page has horizontal overflow",
      );
      const sourceBefore = await lab.locator("[data-ascii]").textContent();
      await lab.locator('[data-action="next"]').click();
      assert.equal(
        await lab.locator("[data-source].executing").count(),
        1,
        "one step must highlight exactly one source statement",
      );
      await lab.locator('[data-action="previous"]').click();
      assert.equal(
        await lab.locator("[data-ascii]").textContent(),
        sourceBefore,
      );
      const node = lab.locator("g[data-node]").first();
      await node.focus();
      await node.press("Enter");
      assert.equal(
        await lab.locator("[data-inspector-shell]").getAttribute("open"),
        "",
      );
      await lab.locator('[data-view="memory"]').click();
      assert.equal(
        await lab.locator('[data-view="memory"]').getAttribute("aria-pressed"),
        "true",
      );
      await lab.locator('[data-view="logical"]').click();
      await lab.locator('[data-phase="after"]').click();
      assert.equal(await lab.locator("[data-invariants] .fail").count(), 0);
      await lab.locator('[data-phase="before"]').click();
      const fault = page.locator("[data-graph-structure-break]");
      await fault.locator("select").selectOption("fault");
      assert.match(
        await fault.locator("[data-fault-result]").textContent(),
        /FAIL/,
      );
      await fault.locator("button").click();
      assert.match(
        await fault.locator("[data-fault-result]").textContent(),
        /PASS/,
      );
      const complexity = page.locator("[data-graph-complexity]");
      const before = await complexity.locator("output").textContent();
      await complexity.locator("select").selectOption("dense");
      assert.notEqual(await complexity.locator("output").textContent(), before);
      if (slug.startsWith("25")) {
        const cell = lab.locator('[data-inspect="cell:0:1"]');
        await cell.click();
        assert.match(await lab.locator("[data-inspector]").textContent(), /A/);
        assert.ok((await lab.locator(".graph-corresponding").count()) > 0);
      }
      if (slug.startsWith("32")) {
        await lab.locator('[name="preset"]').selectOption("diamond");
        await lab.locator('[name="directed"]').selectOption("true");
        await lab.locator('form button[type="submit"]').click();
        await lab.locator('[data-phase="after"]').click();
        assert.match(
          await lab.locator("[data-ascii]").textContent(),
          /Cycle found: no/,
        );
      }
      await lab.locator("[data-svg]").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `/tmp/graph-structure-browser/${slug}-${width}.png`,
      });
      const violations = (
        await new AxeBuilder({ page })
          .include("[data-chapter-lab]")
          .include("[data-structure-preview]")
          .analyze()
      ).violations;
      if (violations.length)
        console.log(
          "AXE",
          slug,
          width,
          JSON.stringify(
            violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
          ),
        );
      assert.deepEqual(
        violations
          .filter(
            (v) =>
              !(
                process.env.GRAPH_ALLOW_KNOWN_A11Y === "1" &&
                v.id === "landmark-unique"
              ),
          )
          .map((v) => v.id),
        [],
      );
      if (width === 390) {
        await page.evaluate(() => {
          document.documentElement.dataset.theme = "dark";
        });
        await page.screenshot({
          path: `/tmp/graph-structure-browser/${slug}-${width}-dark.png`,
        });
      }
      assert.deepEqual(errors, []);
      checks++;
      console.log(
        `${width} ${slug}: playback, keyboard, views, controls, overflow passed; axe findings=${violations.length}`,
      );
      await context.close();
    }
} finally {
  await browser.close();
}
console.log(`${checks} responsive chapter cases passed.`);
