import {
  arrowDefinitions,
  escapeHtml as esc,
} from "../../components/visualizers/primitives";
import { layoutGraph, nodeWidth, nodeHeight } from "./layout";
import type { GraphScene } from "./types";
const vertexKey = (v: number) => `v:${v}`;
const selectedEdge = (scene: GraphScene, selected: string | null): number => {
  if (selected?.startsWith("e:")) {
    const index = Number(selected.slice(2));
    return Number.isInteger(index) &&
      index >= 0 &&
      index < scene.graph.edges.length
      ? index
      : -1;
  }
  if (selected?.startsWith("cell:")) {
    const [, a, b] = selected.split(":").map(Number);
    return scene.graph.edges.findIndex(
      (e) =>
        (e.from === a && e.to === b) ||
        (!scene.graph.directed && e.from === b && e.to === a),
    );
  }
  return -1;
};
const edgeLabel = (s: GraphScene, i: number): string => {
  const e = s.graph.edges[i]!;
  return `${s.graph.labels[e.from]} ${s.graph.directed ? "→" : "—"} ${s.graph.labels[e.to]}${s.weighted ? ` · weight ${e.weight}` : ""}`;
};
function incident(s: GraphScene, v: number, incoming = false): number[] {
  return s.graph.edges.flatMap((e) =>
    !s.graph.directed
      ? e.from === v
        ? [e.to]
        : e.to === v
          ? [e.from]
          : []
      : incoming
        ? e.to === v
          ? [e.from]
          : []
        : e.from === v
          ? [e.to]
          : [],
  );
}
const valueFields = (s: GraphScene, v: number) =>
  Object.entries(s.fields[v] ?? {});
export function describeGraph(s: GraphScene): string {
  return [
    s.graph.labels.length
      ? `${s.graph.directed ? "Directed" : "Undirected"} graph; vertex IDs are array indices, not addresses.`
      : "Empty graph: V=0, E=0.",
    ...s.graph.labels.map(
      (label, v) =>
        `${v} ${label}: ${
          incident(s, v)
            .map((u) => s.graph.labels[u])
            .join(", ") || "no outgoing neighbors"
        }; ${valueFields(s, v)
          .map(([k, val]) => `${k}=${val}`)
          .join(", ")}`,
    ),
    ...s.graph.edges.map((_, i) => edgeLabel(s, i)),
    ...s.auxiliary.map((a) => `${a.label}: [${a.entries.join(", ")}]`),
    `Output: [${s.output.join(", ")}]`,
    s.result,
  ]
    .filter(Boolean)
    .join("\n");
}
function representations(
  s: GraphScene,
  selected: string | null,
  id: string,
): string {
  const selectedIndex = selectedEdge(s, selected);
  const list = s.graph.labels
    .map(
      (label, v) =>
        `<li><button type="button" data-inspect="v:${v}" data-target="v:${v}" data-from="adjacency-list">${esc(label)}</button>: ${
          s.graph.edges
            .flatMap((e, i) => {
              const target =
                e.from === v
                  ? e.to
                  : !s.graph.directed && e.to === v
                    ? e.from
                    : null;
              return target === null
                ? []
                : [
                    `<button type="button" class="${i === selectedIndex ? "graph-corresponding" : ""}" data-inspect="e:${i}" data-target="e:${i}" data-from="adjacency-row:${v}" aria-label="Adjacency ${esc(label)} to ${esc(s.graph.labels[target])}">${esc(s.graph.labels[target])}${s.weighted ? ` (${e.weight})` : ""}</button>`,
                  ];
            })
            .join(", ") || "∅"
        }</li>`,
    )
    .join("");
  const matrix = s.graph.labels
    .map(
      (label, u) =>
        `<tr><th scope="row">${esc(label)}</th>${s.graph.labels
          .map((other, v) => {
            const index = s.graph.edges.findIndex(
              (e) =>
                (e.from === u && e.to === v) ||
                (!s.graph.directed && e.from === v && e.to === u),
            );
            const key = `cell:${u}:${v}`,
              isSelected =
                selected === key || (index >= 0 && index === selectedIndex);
            return `<td><button type="button" data-inspect="${key}" class="${isSelected ? "graph-corresponding" : ""}" aria-pressed="${isSelected}" aria-label="Matrix ${esc(label)} to ${esc(other)}: ${index < 0 ? "no edge" : s.weighted ? `weight ${s.graph.edges[index]!.weight}` : "edge"}">${index < 0 ? (s.weighted ? "∅" : "0") : s.weighted ? s.graph.edges[index]!.weight : "1"}</button></td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  return `<div class="graph-representations" aria-label="Equivalent graph representations"><div><h4>Adjacency list</h4><ul>${list || "<li>empty</li>"}</ul></div><div class="graph-table-scroll" tabindex="0" role="region" aria-label="Adjacency matrix · ${esc(id)}"><table><caption>Adjacency matrix${s.weighted ? " · ∅ means no edge" : " · 1 means edge"}</caption><thead><tr><th scope="col">from / to</th>${s.graph.labels.map((l) => `<th scope="col">${esc(l)}</th>`).join("")}</tr></thead><tbody>${matrix}</tbody></table></div></div>`;
}
export function drawGraph(
  s: GraphScene,
  id: string,
  view: "logical" | "memory",
  selected: string | null,
): string {
  const layout = layoutGraph(s),
    selectedIndex = selectedEdge(s, selected);
  const selectedVertex = selected?.startsWith("v:")
    ? Number(selected.slice(2))
    : -1;
  const edges = s.graph.edges
    .map((e, i) => {
      const route = layout.routes[i]!,
        state = s.edgeStates[i] ?? "";
      const highlighted =
        i === selectedIndex ||
        e.from === selectedVertex ||
        e.to === selectedVertex;
      return `<g class="graph-edge ${state} ${highlighted ? "graph-selected-edge" : ""}" data-inspect="e:${i}" role="button" tabindex="0" aria-label="Inspect edge ${esc(edgeLabel(s, i))}" aria-pressed="${i === selectedIndex}"><title>${esc(edgeLabel(s, i))}${state ? ` · ${state}` : ""}</title><path class="reference-arrow" d="${route.path}" ${s.graph.directed ? `marker-end="url(#${id}-${state === "active" ? "active" : "arrow"})"` : ""}/><path class="arrow-hit-area" d="${route.path}"/>${s.weighted ? `${route.leader ? `<path class="graph-label-leader" d="M${route.leader.x} ${route.leader.y} L${route.label.x} ${route.label.y}"/>` : ""}<rect class="graph-weight-background" x="${route.label.x - 31}" y="${route.label.y - 12}" width="62" height="23" rx="4"/><text class="graph-weight" x="${route.label.x}" y="${route.label.y + 4}" text-anchor="middle">${e.weight}</text>` : ""}</g>`;
    })
    .join("");
  const nodes = s.graph.labels
    .map((label, v) => {
      const { x, y } = layout.positions[v]!;
      const status =
        s.active === v
          ? "current"
          : s.visited.includes(v)
            ? "visited"
            : s.discovered.includes(v)
              ? "discovered"
              : "unseen";
      const split =
        label.length > 12
          ? label.lastIndexOf(" ", 14) > 0
            ? label.lastIndexOf(" ", 14)
            : 12
          : -1;
      const labelMarkup =
        split < 0
          ? `<text class="graph-label" x="${x}" y="${y - 3}" text-anchor="middle">${esc(label)}</text>`
          : `<text class="graph-label" x="${x}" y="${y - 13}" text-anchor="middle">${esc(label.slice(0, split))}</text><text class="graph-label" x="${x}" y="${y + 1}" text-anchor="middle">${esc(label.slice(split).trim())}</text>`;
      return `<g class="data-node graph-node ${status} ${selectedVertex === v ? "selected" : ""}" data-node="${vertexKey(v)}" role="button" tabindex="0" aria-pressed="${selectedVertex === v}" aria-label="Inspect vertex ${esc(label)}: ${status}"><title>${esc(label)} · ${status}</title><rect x="${x - nodeWidth / 2}" y="${y - nodeHeight / 2}" width="${nodeWidth}" height="${nodeHeight}" rx="12"/>${labelMarkup}<text class="graph-status" x="${x}" y="${y + 16}" text-anchor="middle">${status}</text></g>`;
    })
    .join("");
  const columns = [...new Set(s.fields.flatMap((f) => Object.keys(f)))];
  const table = `<div class="graph-table-scroll" tabindex="0" role="region" aria-label="Algorithm arrays · ${esc(id)}"><table><caption>Canonical algorithm state · indexed by vertex ID</caption><thead><tr><th scope="col">Vertex</th>${columns.map((k) => `<th scope="col">${esc(k)}</th>`).join("")}</tr></thead><tbody>${s.graph.labels.map((l, v) => `<tr class="${s.active === v ? "graph-current-row" : ""}"><th scope="row"><button type="button" data-inspect="v:${v}" data-target="v:${v}" data-from="algorithm-array">${v} · ${esc(l)}</button></th>${columns.map((k) => `<td>${esc(s.fields[v]?.[k] ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  return `<div class="graph-state-strip"><span>V = ${s.graph.labels.length} · E = ${s.graph.edges.length}</span><span>${s.graph.directed ? "Directed →" : "Undirected —"}</span><span>Current: ${esc(s.active === null ? "none" : s.graph.labels[s.active])}</span></div><svg class="memory-diagram graph-diagram" viewBox="0 0 ${layout.width} ${layout.height}" style="min-width:640px" role="group" aria-label="Graph vertices and edges">${arrowDefinitions(id)}${edges}${nodes}${!s.graph.labels.length ? '<text class="empty-note" x="36" y="100">Empty graph · no vertices or edges</text>' : ""}</svg><div class="graph-panels">${view === "memory" || s.showRepresentations ? representations(s, selected, id) : ""}<div class="graph-auxiliary" aria-label="Graph worklists">${s.auxiliary.map((a) => `<div><strong>${esc(a.label)}</strong><p>${a.entries.length ? a.entries.map((entry) => `<span>${esc(entry)}</span>`).join(" ") : "<span>empty</span>"}</p></div>`).join("")}<div><strong>Output</strong><p>${esc(s.output.join(" → ") || "empty")}</p></div><p class="graph-result" role="status">${esc(s.result)}</p></div>${table}</div>`;
}
export function inspectGraph(s: GraphScene, selected: string | null): string {
  const v = selected?.startsWith("v:") ? Number(selected.slice(2)) : -1,
    edge = selectedEdge(s, selected);
  const links = (vs: number[], group: string) =>
    vs
      .map(
        (u) =>
          `<button type="button" data-inspect="v:${u}" data-target="v:${u}" data-from="inspector-${group}">${esc(s.graph.labels[u])}</button>`,
      )
      .join(", ") || "∅";
  let body =
    "<p>Select a vertex, edge, adjacency entry or matrix cell. Array indices identify vertices; graph layout is not a parent hierarchy.</p>";
  if (v >= 0 && v < s.graph.labels.length) {
    const incoming = incident(s, v, true),
      outgoing = incident(s, v);
    const degree = s.graph.edges.reduce(
      (n, e) => n + Number(e.from === v) + Number(e.to === v),
      0,
    );
    body = `<h4>${esc(s.graph.labels[v])} · vertex ${v}</h4><dl class="node-fields"><div><dt>${s.graph.directed ? "incoming" : "neighbors"}</dt><dd>${links(incoming, "incoming")}</dd></div>${s.graph.directed ? `<div><dt>outgoing</dt><dd>${links(outgoing, "outgoing")}</dd></div><div><dt>indegree / outdegree</dt><dd>${incoming.length} / ${outgoing.length}</dd></div>` : `<div><dt>degree</dt><dd>${degree} (loop counts twice)</dd></div>`}${valueFields(
      s,
      v,
    )
      .map(
        ([k, value]) => `<div><dt>${esc(k)}</dt><dd>${esc(value)}</dd></div>`,
      )
      .join("")}</dl>`;
  } else if (edge >= 0) {
    const e = s.graph.edges[edge]!;
    body = `<h4>${esc(edgeLabel(s, edge))}</h4><p>Edge index ${edge} · ${esc(s.edgeStates[edge] ?? "not classified")}</p><dl class="node-fields"><div><dt>from</dt><dd>${links([e.from], "from")}</dd></div><div><dt>to</dt><dd>${links([e.to], "to")}</dd></div><div><dt>weight</dt><dd>${e.weight}</dd></div></dl>`;
  } else if (selected?.startsWith("e:"))
    body =
      "<h4>Edge no longer present</h4><p>This earlier snapshot does not contain the selected edge. Select an existing vertex or edge.</p>";
  else if (selected?.startsWith("cell:"))
    body =
      "<h4>No edge</h4><p>This matrix cell denotes absence. A weighted edge of weight zero is still an edge.</p>";
  return `<div class="inspector-heading"><span class="eyebrow">Graph inspector</span></div>${body}`;
}
