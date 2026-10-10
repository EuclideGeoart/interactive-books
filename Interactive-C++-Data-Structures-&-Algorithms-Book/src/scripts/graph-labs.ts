import "../styles/graphs.css";
import { mountTraceLab } from "./trace-lab";
import { InspectionDiagram } from "./inspection-diagram";
import type { LabAdapter } from "../components/controls/lab-types";
import { graphStructureAdapters } from "../visualizers/graph-structure/adapter";
import { dagAdapter } from "../visualizers/graph-dag/model";
import {
  dijkstraAdapter,
  bellmanFordAdapter,
  kruskalAdapter,
  unionFindAdapter,
} from "../visualizers/graph-weighted/adapter";

// Worklists/tables live outside diagram panning. The generic inspector/playback
// stays unchanged; only graph-owned panels and edge keyboard activation bind here.
function bindGraph(root: HTMLElement): void {
  root.classList.add("graph-lab");
  const canvas = root.querySelector<HTMLElement>("[data-svg]")!;
  const mobileCode = root.querySelector<HTMLElement>("[data-mobile-code]");
  if (mobileCode) mobileCode.tabIndex = 0;
  function panels() {
    for (const selector of [".graph-state-strip", ".graph-panels"]) {
      const panel = canvas.querySelector<HTMLElement>(`:scope > ${selector}`);
      if (!panel) continue;
      const old = canvas.parentElement!.querySelector(`:scope > ${selector}`);
      const focus =
        old?.contains(document.activeElement) ||
        panel.contains(document.activeElement)
          ? (document.activeElement as HTMLElement)
          : undefined;
      const key = focus?.dataset.inspect,
        from = focus?.dataset.from;
      old?.remove();
      if (selector === ".graph-state-strip") canvas.before(panel);
      else canvas.after(panel);
      if (focus)
        [...panel.querySelectorAll<HTMLElement>("[data-inspect]")]
          .find((e) => e.dataset.inspect === key && e.dataset.from === from)
          ?.focus({ preventScroll: true });
    }
  }
  panels();
  new MutationObserver(panels).observe(canvas, { childList: true });
  root.addEventListener("keydown", (event) => {
    const target = event.target as Element;
    if (
      ["Enter", " "].includes(event.key) &&
      target.matches("g[data-inspect]")
    ) {
      event.preventDefault();
      target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });
  root.addEventListener("focusin", (event) => {
    const target = event.target as Element;
    if (!target.matches("g[data-node],g[data-inspect]")) return;
    const box = target.getBoundingClientRect(),
      viewport = canvas.getBoundingClientRect();
    if (box.left < viewport.left || box.right > viewport.right)
      canvas.scrollLeft +=
        box.left + box.width / 2 - viewport.left - viewport.width / 2;
    if (box.top < viewport.top || box.bottom > viewport.bottom)
      canvas.scrollTop +=
        box.top + box.height / 2 - viewport.top - viewport.height / 2;
  });
}
function mount<S, E extends { type: string }>(
  key: string,
  adapter: LabAdapter<S, E>,
) {
  for (const root of document.querySelectorAll<HTMLElement>(
    `[data-chapter-lab="${key}"]`,
  )) {
    mountTraceLab(root, adapter);
    bindGraph(root);
  }
  for (const root of document.querySelectorAll<HTMLElement>(
    `[data-structure-preview="${key}"]`,
  )) {
    const inputs = new FormData();
    for (const [k, v] of Object.entries(
      JSON.parse(root.dataset.previewInputs ?? "{}") as Record<string, string>,
    ))
      inputs.set(k, v);
    const trace = adapter.build(root.dataset.previewOperation ?? "", inputs);
    new InspectionDiagram(
      root,
      adapter,
      trace.initial,
      root.dataset.previewId!,
    );
    bindGraph(root);
  }
}
mount("graph-dag", dagAdapter);
for (const [key, adapter] of Object.entries(graphStructureAdapters))
  mount(key, adapter);
mount("dijkstra", dijkstraAdapter);
mount("bellman-ford", bellmanFordAdapter);
mount("kruskal", kruskalAdapter);
mount("union-find", unionFindAdapter);
for (const root of document.querySelectorAll<HTMLElement>(
  "[data-graph-complexity]",
)) {
  const draw = () => {
    const v = Number(
        root.querySelector<HTMLInputElement>('[name="vertices"]')!.value,
      ),
      dense =
        root.querySelector<HTMLSelectElement>('[name="density"]')!.value ===
        "dense";
    const e = Math.min(v * (v - 1), dense ? v * (v - 1) : 2 * v),
      kind = root.dataset.graphComplexity;
    const work =
      kind === "bellman-ford"
        ? Math.max(0, v - 1) * e
        : kind === "dijkstra"
          ? Math.ceil((v + e) * Math.log2(Math.max(2, e)))
          : kind === "mst"
            ? Math.ceil(e * Math.log2(Math.max(2, e)))
            : v + e;
    if (kind === "dsu") {
      const depth = Math.floor(Math.log2(v));
      root.querySelector("output")!.textContent =
        `Elements n = ${v}\nUnion by size bounds depth by floor(log₂ n) = ${depth}\nDeep find before compression: up to ${depth} parent traversals\nSame find after compression: ${v === 1 ? 0 : 1} parent traversal${v === 1 ? "s" : ""}\nO(α(n)) amortized over a sequence; initialization costs O(n).\nThe lab counters measure actual traversals and assignments.`;
      return;
    }
    root.querySelector("output")!.textContent =
      `V = ${v}, E = ${e}\nAdjacency list: V + E = ${v + e} stored entries\nAdjacency matrix: V² = ${v * v} cells\n${kind === "bellman-ford" ? "Up to (V − 1) × E relaxation attempts" : kind === "dijkstra" ? "Queue comparison scale (V + E) log E" : kind === "mst" ? "Edge sorting comparison scale E log E" : "Vertex + edge work scale V + E"} = ${work}\n${kind === "kahn" ? "Kahn counts each edge, retires it once, and emits each vertex once." : ""}`;
  };
  root.addEventListener("input", draw);
  root.addEventListener("change", draw);
  draw();
}
