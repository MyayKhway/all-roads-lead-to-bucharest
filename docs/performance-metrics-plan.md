# Performance metrics module + VS Code convention support

> **Status:** proposed — not yet implemented. Open to comment before work starts.
>
> **Scope note:** everything in `src/algorithms/` today is a placeholder and will
> be replaced. This module is deliberately built *around a contract*, not around
> the current A\*. It does not import from `src/algorithms/`, and no figure
> produced by the current placeholder is treated as a target.

## Context

The project needs to evaluate its pathfinding objectively — CPU and memory — but
nothing measures anything today. `ControlPanel.tsx` shows "Nodes Explored" from
`exploredOrder.length` and that is the whole story.

Since the algorithms themselves are in flux, the useful thing to build now is the
**measuring apparatus**: a harness that any search implementation can plug into
and be compared on equal terms. Whoever writes the real algorithms writes them
against this contract and gets metrics without doing their own bookkeeping.

Two constraints are properties of the environment and the graph rather than of
any particular algorithm, so they hold regardless of what replaces the
placeholder:

1. **A single run is likely unmeasurable in a browser.** `performance.now()` is
   clamped to 5–100 µs depending on cross-origin isolation, and a search over 20
   nodes lands in that same range. Timing must be repeated-run with
   auto-calibration, not a single `now()` delta.

2. **The graph is small — 20 cities, 23 edges.** Any correct search will expand
   somewhere around half the nodes, so *averages* across algorithms will look
   close together. The reporting must therefore carry **per-pair distributions
   and head-to-head counts**, not just means, or there will be nothing to see.

Settled scope: structural memory (not `performance.memory`), repeated-run
timing, the Romania graph stays fixed, and **no UI work** — this is a library
with a CLI entry point.

---

## Part A — Metrics module

Everything lives in `src/benchmark/`. Nothing in `src/algorithms/` or `src/data/`
is modified.

### A1. The contract

An algorithm is anything satisfying this interface. It receives a prebuilt graph
and a probe, and returns a path.

```ts
export interface SearchContext {
  readonly adjacency: AdjacencyMap   // built once, outside the timed region
  readonly cities: CityMap           // positions, for heuristics
  readonly probe: Probe
}

export interface SearchAlgorithm {
  readonly id: string
  readonly label: string
  run(start: string, goal: string, ctx: SearchContext): string[] | null
}
```

Two deliberate properties:

- **The graph is passed in, already built.** Graph construction is out of the
  timed region by construction, rather than by remembering to hoist it. (Worth
  noting: the current `astar()` rebuilds its adjacency map on every call, which
  is ~26% of its runtime — exactly the confound this design removes.)
- **The algorithm returns only the path.** The harness derives the cost itself by
  summing edge weights, and **validates that consecutive cities are actually
  adjacent**. An algorithm cannot misreport its own result, which matters when
  several people are writing implementations to be compared.

### A2. Instrumented data structures

The probe is a **factory** for counting data structures. Roles are explicit, so
counters map unambiguously onto standard search terminology no matter who wrote
the algorithm.

```ts
const frontier = probe.frontier<Node>((a, b) => a.f - b.f)  // counting min-heap
const closed    = probe.closedSet<string>()                  // counting set
const gCost     = probe.costTable<string, number>()          // counting map
```

Use them and the metrics come out consistent and free:

| Metric | Derived from |
| --- | --- |
| `nodesExpanded` | `closed` insertions |
| `nodesGenerated` | `frontier` pushes |
| `heapPops` | `frontier` pops (exceeds expansions when stale entries are popped) |
| `peakFrontier` | `frontier` high-water mark |
| `gCostEntries` | `costTable` size |

This is the part that makes the comparison fair. If each author hand-counted
their own expansions, two implementations could define "expanded" differently and
the numbers wouldn't mean the same thing.

**Escape hatch** for anything the structures can't see — `probe.countHeuristicEval()`,
`probe.count('customName')` — so an algorithm that doesn't fit the heap/set/map
shape (bidirectional, IDA\*, something iterative) is still measurable.

### A3. Metrics and the memory estimate

```ts
export interface SearchMetrics {
  nodesExpanded: number
  nodesGenerated: number
  heapPushes: number
  heapPops: number
  edgesRelaxed: number
  heuristicEvals: number     // 0 for uninformed search
  peakFrontier: number       // structural memory: high-water mark
  closedSize: number
  gCostEntries: number
  estimatedBytes: number
  custom: Record<string, number>
  goalReached: boolean
  pathCost: number           // computed by the harness, not self-reported
  pathLength: number
  pathValid: boolean
}
```

`estimatedBytes` derives from one exported, auditable constant block:

```ts
export const BYTE_ESTIMATES = {
  heapEntry: 48,   // {id: ptr, f: double} + object header
  setEntry: 32,
  mapEntry: 40,
} as const
```

It must be labelled an estimate wherever it surfaces. It is a structural proxy
for what the search holds in memory, not a measurement of process RAM.
`performance.memory` is deliberately not used: Chrome-only, quantised to ~100 KB,
and a search this size would read as 0.

### A4. Reference implementation

`src/benchmark/reference.ts` — a plain, unoptimised Dijkstra written against the
contract. It is owned by the benchmark module and is not going to be replaced.
Three jobs:

- **Correctness oracle.** Shortest path is shortest path. Any candidate algorithm
  claiming a cheaper route than the reference has a bug; any claiming a costlier
  one is suboptimal, and by how much is a reportable metric.
- **Self-test for the harness**, so the apparatus can be validated before there is
  anything real to measure.
- **A baseline that never moves**, so numbers stay comparable across the term.

It also serves as the worked example of how to write against the contract.

### A5. Timing harness

`src/benchmark/timer.ts` — `measure(fn, opts): TimingResult`.

- **Warm up** (~50 ms) so the JIT has settled before calibrating.
- **Auto-calibrate**: double the inner iteration count until a trial exceeds
  `minTrialMs` (default 10 ms), putting each trial orders of magnitude above
  timer resolution. This is what makes the harness work for a fast algorithm and
  a slow one without reconfiguration.
- **Run 30 trials**, report `medianUs`, `p25Us`, `p75Us`, `minUs`, `meanUs`,
  `stdDevUs`, plus `iterations` and `trials` so a reader can judge the numbers.
- **Median, not mean** — one GC pause otherwise dominates.
- **Defeat dead-code elimination.** A pure call whose result is discarded can be
  optimised away, silently reporting ~0 µs. Accumulate from each result into an
  exported sink.

Uses `performance.now()`, which exists in both Node and the browser, so the
module stays environment-agnostic.

### A6. Suite runner

`src/benchmark/suite.ts` — takes a list of registered algorithms and runs them
over a set of city pairs.

Two kinds of measurement, separated because their costs differ by orders of
magnitude:

- **Counts — exhaustive.** Every algorithm × all 380 ordered pairs, one pass
  each. Exact, reproducible, cheap.
- **Timing — sampled.** Calibrated timing over a configurable subset. Timing all
  380 with full calibration would take minutes for no extra insight.

Reported output, shaped by constraint 2 above:

- per-algorithm aggregates: mean / median / min / max of each metric
- **head-to-head**: for each metric and each pair of algorithms, the count of
  city-pairs where A beats, ties, or loses to B — this is where a small
  advantage actually becomes visible
- **optimality**: cost vs the reference Dijkstra — `suboptimalPairs` and
  `maxOvershootPct`
- **validity**: any pair where an algorithm returned a disconnected or
  non-terminating path, surfaced as a failure rather than a number

### A7. Reporting and CLI

- `src/benchmark/report.ts` — `formatTable()`, `toCsv()`, `toJson()`. Pure string
  functions, no I/O, so they work from a script or a future UI.
- `scripts/bench.ts` — CLI: `--csv`, `--out <file>`, `--pairs <n>`, `--algo <id>`.
- `package.json` — add `"bench": "tsx scripts/bench.ts"` plus `tsx` as a
  devDependency. Native `node file.ts` type-stripping would avoid the dependency
  but is not reliable on the Node 20 floor the README states.

---

## Part B — VS Code support files

Everyone but Kent is on VS Code, so make the `CONTRIBUTING.md` conventions
automatic rather than remembered.

- **`.vscode/settings.json`** (extend) — per-language formatter overrides for
  `[typescript]`, `[typescriptreact]`, `[json]`, `[jsonc]`, `[css]` pointing at
  Biome; `"prettier.enable": false` and `"eslint.enable": false` so a globally
  installed extension can't fight the project; `files.eol` /
  `insertFinalNewline` / `trimTrailingWhitespace` mirroring `.editorconfig`;
  `search.exclude` for `dist` and `node_modules`.
- **`.vscode/extensions.json`** (extend) — keep the Biome and Tailwind
  recommendations, add `unwantedRecommendations` for `esbenp.prettier-vscode` and
  `dbaeumer.vscode-eslint` so VS Code actively warns against reintroducing them.
- **`.vscode/tasks.json`** (new) — `dev`, `lint`, `typecheck`, `build`, `bench`
  from the command palette; `build` as the default build task; `$tsc` problem
  matcher so type errors land in the Problems panel.
- **`.vscode/launch.json`** (new) — Chrome against the dev server for debugging
  the app, plus a Node config for stepping through `npm run bench`.
- **`.github/pull_request_template.md`** (new) — checklist mirroring
  `CONTRIBUTING.md`: descriptive branch name, commits split small,
  `npm run lint && npm run build` pass, screenshot if UI changed.
- **`.gitmessage`** (new) + a line in `CONTRIBUTING.md` pointing at
  `git config commit.template .gitmessage` — a commented template encoding the
  imperative-subject / ~72-char / why-not-what rules.

---

## Files

**New:** `src/benchmark/contract.ts`, `src/benchmark/probe.ts`,
`src/benchmark/instruments.ts`, `src/benchmark/metrics.ts`,
`src/benchmark/reference.ts`, `src/benchmark/timer.ts`,
`src/benchmark/suite.ts`, `src/benchmark/report.ts`, `scripts/bench.ts`,
`.vscode/tasks.json`, `.vscode/launch.json`,
`.github/pull_request_template.md`, `.gitmessage`

**Modified:** `package.json` (bench script + `tsx`), `.vscode/settings.json`,
`.vscode/extensions.json`, `CONTRIBUTING.md`

**Untouched:** all of `src/algorithms/`, all of `src/data/`, `App.tsx`,
`ControlPanel.tsx`, every component. The module has no dependency on code that
is being replaced.

Commits split per `CONTRIBUTING.md` — contract and metric types, instrumented
structures, reference Dijkstra, timer, suite, reporting, CLI, and the VS Code
files are each their own commit.

---

## Verification

Assertions here rest on the **graph**, which is fixed, rather than on any
algorithm, which is not.

1. **Reference correctness** — reference Dijkstra returns
   Arad → Sibiu → Rimnicu Vilcea → Pitesti → Bucharest at 418 km, the standard
   textbook result for this graph.
2. **Path validation catches bad output** — feed the harness a deliberately
   broken algorithm (returns a path with a non-adjacent hop, or a path that skips
   the goal) and confirm it is reported as invalid rather than scored.
3. **Instruments count correctly** — hand-verify the probe's counters against a
   traced run on a small pair, so the derived metrics are known-good before
   anyone relies on them.
4. **Timer is honest** — `measure()` on a function of known cost lands in the
   right ballpark; `iterations` scales with calibration; removing the DCE sink
   changes the result, proving the sink is doing its job.
5. **Determinism** — counts are identical across repeated runs. Only the timing
   fields may vary.
6. **`npm run bench`** produces the table and CSV.
7. **`npm run lint && npm run build`** pass clean.
8. **App unaffected** — `npm run dev` still renders and routes, since nothing it
   imports was touched.
9. **VS Code files** — open the folder, confirm the extension prompt appears,
   format-on-save reformats via Biome, and the tasks appear in the palette.

---

## Open question for the group

The harness is built to compare algorithms, but on a 20-node graph even a good
heuristic saves only a handful of expansions. If the goal is a report with
visible separation between approaches, it may be worth adding a larger synthetic
graph to run alongside Romania.

That would mean parameterising the module by graph rather than importing the
Romania one directly — a small change now, a larger one later. Flagging it while
it is still cheap.
