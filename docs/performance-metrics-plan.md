# Performance metrics module + VS Code convention support

> **Status:** proposed — not yet implemented. Reviewed and approved in outline;
> open to comment before work starts.
>
> All figures below were measured against `main` as of commit `f1dc0e1`. They are
> reproducible: each came from running the current `astar()` over the full set of
> 380 ordered city pairs.

## Context

The project needs to evaluate its pathfinding objectively — CPU and memory — but
nothing measures anything today. `ControlPanel.tsx` shows "Nodes Explored" from
`exploredOrder.length` and that's the whole story.

Three measurements taken against the current code determine the design:

1. **A single run is unmeasurable in a browser.** `astar('arad','bucharest')`
   takes **~11.5 µs**. `performance.now()` is clamped to 5–100 µs depending on
   cross-origin isolation. Single-run timing is noise; repeated-run benchmarking
   is mandatory.

2. **A quarter of the runtime isn't search.** `astar()` calls `buildAdjacency()`
   on every invocation (`src/algorithms/astar.ts:143`), costing **~3.0 µs of the
   11.5 µs total (26%)**. Timing `astar()` as it stands attributes graph
   construction to the algorithm.

3. **The graph is small enough that differences are narrow.** Averaged over all
   380 ordered pairs: A*/magnetic and A*/straight-line both expand 10.87 nodes;
   uniform-cost expands 11.00. Per-pair, A* beats UCS on **44/380 pairs, by at
   most 3 expansions**. A* currently returns the optimal cost on **380/380**
   pairs.

Finding 3 is not a reason to skip the work — "A* saves expansions on 11.6% of
pairs, never more than 3" is a real result. But it means the module must report
**per-pair distributions and head-to-head counts**, not just averages, or there
will be nothing to see.

Scope decisions already made: structural memory (not `performance.memory`),
repeated-run timing, Dijkstra/UCS as the baseline, **and no UI work** — this is a
library with a CLI entry point. `ControlPanel.tsx` and `App.tsx` stay as they are.

---

## Part A — Metrics module

### A1. Memoize the adjacency map

`src/data/graph.ts` — add `getAdjacency()` that builds once and caches. `edges`
is a module constant, so the map is constant too. Keep `buildAdjacency()`
exported (it returns a fresh map; useful for tests).

Switch `astar()` to `getAdjacency()`. This removes the 26% confound from every
timed path and speeds the interactive path too. Nothing mutates the returned map
today — note it as shared, read-only.

### A2. Split the search core from result assembly

The single most important structural change. Today `astar()` interleaves three
jobs: searching, building the path, and copying `gCost` for the visualiser
(`exploredCosts: { ...gCost }` — an O(V) allocation per call). A benchmark must
time only the first.

New `src/algorithms/search.ts` holds one generic instrumented best-first search:

```ts
export type HeuristicFn = (
  currentPos: Position3D, neighborPos: Position3D,
  goalPos: Position3D, startPos: Position3D,
) => number

export interface SearchOptions {
  heuristic: HeuristicFn | null      // null = uninformed (UCS)
  adjacency?: AdjacencyMap           // defaults to getAdjacency()
  trackExploredOrder?: boolean       // default true; false in benchmarks
}

export function bestFirstSearch(
  startId: string, goalId: string, opts: SearchOptions,
): SearchOutcome | null              // raw state + metrics, no path built
```

A* is this with a heuristic; UCS is this with `heuristic: null`. Reuse the
existing `MinHeap` from `astar.ts` — move it into `search.ts` unchanged.

Preserve the current semantics exactly, including **not reopening closed nodes**
(`astar.ts:161`). That is a real limitation with an inconsistent heuristic, but
changing it now would invalidate the regression check in A8.

### A3. Metrics types and collection

New `src/algorithms/types.ts`:

```ts
export interface SearchMetrics {
  // work performed
  nodesExpanded: number      // closed-set insertions
  nodesGenerated: number     // heap pushes
  edgesRelaxed: number       // neighbour edges examined
  heuristicEvals: number
  heapPushes: number
  heapPops: number           // > nodesExpanded: stale entries get popped
  // space held (structural)
  peakFrontier: number       // high-water mark of open-set size
  closedSize: number
  gCostEntries: number
  cameFromEntries: number
  estimatedBytes: number
  // outcome
  goalReached: boolean
  pathCost: number
  pathLength: number         // hops
}
```

Counters are plain integer increments in the search loop — no allocation, so
they can stay always-on. `peakFrontier` updates from `MinHeap.size` after each
push.

`estimatedBytes` must be honest: derive it from a single exported constant block
so a reader can audit the assumptions.

```ts
export const BYTE_ESTIMATES = {
  heapEntry: 48,   // {id: ptr, f: double} + object header
  setEntry: 32,
  recordEntry: 40,
} as const
```

Label it an estimate everywhere it surfaces. It is a structural proxy, not a
measurement of process RAM.

Also define `SearchResult` here (the current `AstarResult` shape plus a
`metrics` field). In `astar.ts` keep `export type AstarResult = SearchResult` so
`App.tsx:12` and `ControlPanel.tsx:5` keep working untouched.

### A4. Thin algorithm wrappers

- `src/algorithms/astar.ts` — keeps its exact public signature
  (`astar(startId, goalId, heuristicName?)`) and its `HEURISTICS` export. Becomes
  a wrapper: call `bestFirstSearch`, then assemble path + `exploredCosts`.
  Adding `metrics` to the returned object is additive and breaks nothing.
- `src/algorithms/dijkstra.ts` — `dijkstra(startId, goalId)`, i.e.
  `bestFirstSearch` with `heuristic: null`.
- A registry both the suite and any future UI can enumerate:
  ```ts
  export const ALGORITHMS = {
    astar:    { label: 'A*',             usesHeuristic: true,  run: ... },
    dijkstra: { label: 'Dijkstra (UCS)', usesHeuristic: false, run: ... },
  } as const
  ```

### A5. Timing harness

New `src/benchmark/timer.ts` — `measure(fn, opts): TimingResult`.

- **Warm up** (~50 ms of calls) so the JIT has settled before calibration.
- **Auto-calibrate**: double the inner iteration count until one trial exceeds
  `minTrialMs` (default 10 ms), putting each trial three orders of magnitude
  above timer resolution.
- **Run `trials`** (default 30) and report `medianUs`, `p25Us`, `p75Us`,
  `minUs`, `meanUs`, `stdDevUs`, plus `iterations` and `trials` so a reader can
  judge the numbers.
- **Report the median, not the mean** — one GC pause otherwise dominates.
- **Defeat dead-code elimination.** A pure call whose result is discarded can be
  optimised away entirely, silently reporting ~0 µs. Accumulate something from
  each result into an exported sink variable.

Uses `performance.now()`, which exists in both Node and the browser, so the
module stays environment-agnostic.

### A6. Suite runner

New `src/benchmark/suite.ts`.

Separate the two kinds of measurement, because they have different costs:

- **Counts — exhaustive.** Every config × all 380 pairs, one pass each. Exact
  and reproducible, and cheap (~milliseconds total).
- **Timing — sampled.** Calibrated timing over a configurable sample of pairs
  (default a fixed representative handful). Timing all 380 × 3 with full
  calibration would take minutes for no extra insight.

Output must carry the distribution, not just means (per finding 3):

- per-config aggregates: mean / median / min / max of each metric
- **head-to-head**: for each metric pair of configs, count pairs where A < B,
  A == B, A > B — this is what surfaces the 44/380
- **optimality**: use `dijkstra` cost as the reference optimum, report
  `suboptimalPairs` and `maxOvershootPct`. Reads 0/380 today; it is the guard
  that catches a regression when someone rescales the heuristic later.

### A7. Reporting and CLI

- `src/benchmark/report.ts` — `formatTable()`, `toCsv()`, `toJson()`. Pure
  string functions, no I/O, so they work from a script or a future UI.
- `scripts/bench.ts` — CLI: `--csv`, `--out <file>`, `--pairs <n>`.
- `package.json` — add `"bench": "tsx scripts/bench.ts"` and `tsx` as a
  devDependency. Native `node file.ts` type-stripping would avoid the dependency
  but isn't reliable on the Node 20 floor the README states.

### A8. Regression check (do this before anything else lands)

The A2 refactor must not change search behaviour. Before refactoring, capture
current output for all 380 pairs × both heuristics (path, cost, expanded count);
after, assert byte-identical. This is the same check that validated the earlier
`astar.ts` strict-mode refactor, and it caught nothing only because it was run.

Additionally assert `astar` cost == `dijkstra` cost on all 380 pairs.

---

## Part B — VS Code support files

Everyone but you is on VS Code, so make the conventions in `CONTRIBUTING.md`
automatic rather than remembered.

- **`.vscode/settings.json`** (extend the existing file) — per-language
  formatter overrides for `[typescript]`, `[typescriptreact]`, `[json]`,
  `[jsonc]`, `[css]` pointing at Biome; `"prettier.enable": false` and
  `"eslint.enable": false` so a globally-installed extension can't fight the
  project; `files.eol`/`insertFinalNewline`/`trimTrailingWhitespace` mirroring
  `.editorconfig`; `search.exclude` for `dist`/`node_modules`.
- **`.vscode/extensions.json`** — keep the Biome and Tailwind recommendations,
  add `unwantedRecommendations` for `esbenp.prettier-vscode` and
  `dbaeumer.vscode-eslint`, so VS Code actively warns against reintroducing them.
- **`.vscode/tasks.json`** (new) — `dev`, `lint`, `typecheck`, `build` runnable
  from the command palette, `build` as the default build task, `$tsc` problem
  matcher so type errors land in the Problems panel.
- **`.vscode/launch.json`** (new) — Chrome attached to the dev server for
  debugging the app, plus a Node config for stepping through `npm run bench`.
- **`.github/pull_request_template.md`** (new) — checklist mirroring
  `CONTRIBUTING.md`: descriptive branch name, commits split small,
  `npm run lint && npm run build` pass, screenshot if UI changed.
- **`.gitmessage`** (new) + a line in `CONTRIBUTING.md` telling people to run
  `git config commit.template .gitmessage` — commented template encoding the
  imperative-subject / ~72-char / why-not-what rules.

---

## Files

**New:** `src/algorithms/types.ts`, `src/algorithms/search.ts`,
`src/algorithms/dijkstra.ts`, `src/benchmark/timer.ts`,
`src/benchmark/suite.ts`, `src/benchmark/report.ts`, `scripts/bench.ts`,
`.vscode/tasks.json`, `.vscode/launch.json`,
`.github/pull_request_template.md`, `.gitmessage`

**Modified:** `src/algorithms/astar.ts` (slimmed to a wrapper),
`src/data/graph.ts` (memoised accessor), `package.json` (bench script + `tsx`),
`.vscode/settings.json`, `.vscode/extensions.json`, `CONTRIBUTING.md`

**Untouched:** `App.tsx`, `ControlPanel.tsx`, every component — no UI work.

Commits will be split per `CONTRIBUTING.md`: the graph memoisation, the search
extraction, the metrics, Dijkstra, the timer, the suite, the CLI, and the VS
Code files are each their own commit.

---

## Verification

1. **Behaviour preserved** — all 380 pairs × both heuristics produce identical
   path, cost and expanded count before vs after the refactor.
2. **Optimality** — `astar` cost equals `dijkstra` cost on all 380 pairs.
3. **Timer is honest** — `measure()` on a function of known cost lands in the
   right ballpark; confirm reported `iterations` scales with calibration, and
   that removing the DCE sink changes the result (proving the sink matters).
4. **Adjacency hoist worked** — re-measure `astar()`; it should drop from
   ~11.5 µs to ~8.5 µs, with `getAdjacency()` no longer in the timed region.
5. **`npm run bench`** prints the table and reproduces the known figures:
   10.87 / 10.87 / 11.00 mean expansions, and A* < UCS on 44/380 pairs.
6. **`npm run lint && npm run build`** pass clean.
7. **App still runs** — `npm run dev`, Arad → Bucharest still returns
   Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest at 418 km.
8. **VS Code files** — open the folder, confirm the extension prompt appears,
   format-on-save reformats via Biome, and the tasks show in the palette.

---

## Worth flagging

The metrics will show the two heuristics as **identical**, because the magnetic
heuristic returns values in scene units (~17 across the whole map) while edge
weights are kilometres (70–211), making `h` negligible against `g`. That is the
unit mismatch from the earlier review, deliberately out of scope here.

This module is what will *demonstrate* that — the head-to-head counts give you
the evidence rather than the assertion, and the optimality metric is already in
place to catch what happens when it gets fixed.
