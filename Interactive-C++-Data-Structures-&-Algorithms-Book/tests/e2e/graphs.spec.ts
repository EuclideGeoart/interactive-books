import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const chapters = [
  ["24-graph-fundamentals", "graph-fundamentals"],
  ["25-adjacency-list-matrix", "graph-representations"],
  ["26-breadth-first-search", "graph-bfs"],
  ["27-depth-first-search", "graph-dfs"],
  ["28-directed-graphs", "graph-directed"],
  ["29-dags", "graph-dag"],
  ["30-topological-sort", "graph-dag"],
  ["31-connected-components", "graph-components"],
  ["32-cycle-detection", "graph-cycle"],
  ["33-dijkstra", "dijkstra"],
  ["34-bellman-ford", "bellman-ford"],
  ["35-minimum-spanning-trees", "kruskal"],
  ["36-union-find", "union-find"],
] as const;
for (const [slug, key] of chapters)
  test(`${slug}: source, reverse, keyboard, both views and themes`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/chapters/${slug}/`);
    const lab = page.locator(`[data-chapter-lab="${key}"]`);
    await expect(lab).toHaveAttribute("data-step", "0");
    await expect(lab.locator("[data-input-error]")).toBeHidden();
    await expect(page.locator("main .chapter-section")).toHaveCount(13);
    const initial = await lab.locator("[data-ascii]").textContent();
    await lab.locator('[data-action="next"]').click();
    await expect(lab.locator(".executing")).toHaveCount(1);
    await lab.locator('[data-action="previous"]').click();
    await expect(lab.locator("[data-ascii]")).toHaveText(initial!);
    const node = lab.locator("[data-node]").first();
    await node.focus();
    await node.press("Enter");
    await expect(node).toHaveAttribute("aria-pressed", "true");
    await expect(node).toBeFocused();
    const ids = await lab
      .locator("[data-node]")
      .evaluateAll((ns) => ns.map((n) => n.getAttribute("data-node")));
    await lab.locator('[data-view="memory"]').click();
    expect(
      await lab
        .locator("[data-node]")
        .evaluateAll((ns) => ns.map((n) => n.getAttribute("data-node"))),
    ).toEqual(ids);
    await expect(lab.locator(".graph-representations")).toBeVisible();
    await expect(lab.locator("[data-svg] .graph-panels")).toHaveCount(0);
    const edge = lab.locator("g[data-inspect]").first();
    if (await edge.count()) {
      await edge.focus();
      await edge.press("Enter");
      await expect(edge).toBeFocused();
      await expect(lab.locator("[data-inspector]")).toContainText("Edge index");
    }
    await lab.locator('[data-phase="after"]').click();
    await expect(lab.locator(".invariant-fail")).toHaveCount(0);
    const after = await lab.locator("[data-ascii]").textContent();
    await lab.locator('[data-action="previous"]').click();
    await lab.locator('[data-action="next"]').click();
    await expect(lab.locator("[data-ascii]")).toHaveText(after!);
    await lab.locator('[data-view="logical"]').click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      const results = await new AxeBuilder({ page }).include("main").analyze();
      expect(results.violations).toEqual([]);
      if (
        [
          "25-adjacency-list-matrix",
          "30-topological-sort",
          "33-dijkstra",
          "36-union-find",
        ].includes(slug)
      ) {
        await page.addStyleTag({
          content:
            ".topbar,.skip-link{visibility:hidden}.playback-controls{position:static}",
        });
        await lab.screenshot({ path: info.outputPath(`${slug}-${theme}.png`) });
      }
    }
    expect(errors).toEqual([]);
  });
test("Kahn exposes an emitted vertex before outgoing decrements; cyclic residue is explicit", async ({
  page,
}) => {
  await page.goto("/chapters/30-topological-sort/");
  const lab = page.locator("[data-chapter-lab]");
  await lab.locator('[name="preset"]').selectOption("diamond");
  await lab.locator('[data-jump="kahn.emit"]').click();
  await expect(lab.locator("[data-event]")).toHaveText("EmitVertex");
  await expect(lab.locator(".graph-edge.accepted")).toHaveCount(0);
  await expect(lab.locator("[data-ascii]")).toContainText("B: D; indegree=1");
  await lab.locator('[data-jump="kahn.decrement"]').click();
  await expect(lab.locator("[data-ascii]")).toContainText("B: D; indegree=0");
  await lab.locator('[name="preset"]').selectOption("cycle");
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator(".graph-result")).toContainText("emitted 2 of 5");
  await expect(lab.locator(".graph-result")).toContainText("downstream");
  await expect(lab.locator(".invariant-fail")).toHaveCount(1);
  for (const preset of ["empty", "single", "disconnected", "self-loop"]) {
    await lab.locator('[name="preset"]').selectOption(preset);
    await lab.locator('[data-phase="after"]').click();
    await expect(lab.locator("[data-input-error]")).toBeHidden();
    await expect(lab.locator(".invariant-fail")).toHaveCount(
      preset === "self-loop" ? 1 : 0,
    );
  }
});
test("adjacency cell selection highlights the same directed edge and zero means no edge", async ({
  page,
}) => {
  await page.goto("/chapters/25-adjacency-list-matrix/");
  const lab = page.locator("[data-chapter-lab]");
  await lab.locator('[name="directed"]').selectOption("true");
  await lab.locator('[data-inspect="cell:0:1"]').click();
  await expect(lab.locator("[data-inspector]")).toContainText("A → B");
  await expect(lab.locator("g.graph-selected-edge")).toHaveCount(1);
  await lab.locator('[data-inspect="cell:1:0"]').click();
  await expect(lab.locator("[data-inspector]")).toContainText("No edge");
});
test("Dijkstra retains stale candidates and rejects negative weights without replacing state", async ({
  page,
}) => {
  await page.goto("/chapters/33-dijkstra/");
  const lab = page.locator("[data-chapter-lab]");
  const scrub = lab.locator("[data-scrubber]"),
    max = Number(await scrub.getAttribute("max"));
  let stale = false;
  for (let i = 1; i <= max; i++) {
    await scrub.fill(String(i));
    if (
      (await lab.locator(".graph-auxiliary").textContent())!.includes("STALE")
    ) {
      stale = true;
      break;
    }
  }
  expect(stale).toBe(true);
  const before = await lab.locator("[data-ascii]").textContent();
  await lab.locator('[name="preset"]').selectOption("negative");
  await expect(lab.locator("[data-input-error]")).toBeVisible();
  await expect(lab.locator("[data-ascii]")).toHaveText(before!);
});
test("Bellman-Ford distinguishes reachable and unreachable negative cycles", async ({
  page,
}) => {
  await page.goto("/chapters/34-bellman-ford/");
  const lab = page.locator("[data-chapter-lab]");
  await lab.locator('[name="preset"]').selectOption("cycle");
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator(".graph-result")).toContainText(/negative cycle/i);
  await lab.locator('[name="preset"]').selectOption("unreachableCycle");
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator(".invariant-fail")).toHaveCount(0);
  await expect(lab.locator(".graph-result")).not.toContainText(
    "reachable negative cycle",
  );
});
test("DSU compresses the actual parent link and reverse restores it", async ({
  page,
}) => {
  await page.goto("/chapters/36-union-find/");
  const lab = page.locator("[data-chapter-lab]");
  const before = await lab.locator("[data-ascii]").textContent();
  await expect(lab.locator("[data-ascii]")).toContainText("D: C");
  await lab.locator('[data-phase="after"]').click();
  await expect(lab.locator("[data-ascii]")).toContainText("D: A");
  await lab.locator('[data-action="reset"]').click();
  await expect(lab.locator("[data-ascii]")).toHaveText(before!);
});
test("Part V is searchable and every canonical chapter header downloads", async ({
  page,
  request,
}) => {
  await page.goto("/chapters/30-topological-sort/");
  await page.locator("[data-search-open]").click();
  await page.locator("#book-search").fill("Kahn");
  await expect(page.locator("[data-search-results]")).toContainText(
    "CHAPTER 30",
  );
  for (const [slug] of chapters) {
    const response = await request.get(`/chapters/${slug}/`);
    expect(response.ok()).toBe(true);
  }
  const headers = [
    "24/Graph",
    "25/Representations",
    "26/BFS",
    "27/DFS",
    "28/Directed",
    "29/Dag",
    "30/Kahn",
    "31/Components",
    "32/Cycles",
    "33/Dijkstra",
    "34/BellmanFord",
    "35/Kruskal",
    "36/UnionFind",
  ];
  for (const file of headers) {
    const r = await request.get(`/source/chapter-${file}.hpp`);
    expect(r.ok()).toBe(true);
    expect(await r.text()).not.toContain("@trace");
  }
});

test("matrix, adjacency and array buttons retain keyboard focus after panel reparenting", async ({
  page,
}) => {
  await page.goto("/chapters/25-adjacency-list-matrix/");
  const lab = page.locator("[data-chapter-lab]");
  const cell = lab.locator('[data-inspect="cell:0:1"]');
  await cell.focus();
  await cell.press("Enter");
  await expect(cell).toBeFocused();
  const entry = lab.locator('.graph-panels [data-inspect="v:2"]').last();
  await entry.focus();
  await entry.press("Enter");
  await expect(entry).toBeFocused();
  for (const selector of [
    '[data-from="adjacency-list"][data-target="v:1"]',
    '[data-from="adjacency-row:0"][data-target="e:0"]',
    '[data-from="adjacency-row:1"][data-target="e:0"]',
  ]) {
    const control = lab.locator(selector);
    await control.focus();
    await control.press("Enter");
    await expect(control).toBeFocused();
  }
});
test("reversing a selected newly-created edge preserves playback and reports its absence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/chapters/36-union-find/");
  const lab = page.locator("[data-chapter-lab]");
  await lab.locator('[data-operation="make-set"]').click();
  await lab.locator('[data-phase="after"]').click();
  const edge = lab.locator('g[data-inspect="e:6"]');
  await edge.focus();
  await edge.press("Enter");
  await lab.locator('[data-phase="before"]').click();
  await expect(lab).toHaveAttribute("data-step", "0");
  await expect(lab.locator("[data-inspector]")).toContainText(
    "Edge no longer present",
  );
  expect(errors).toEqual([]);
});
