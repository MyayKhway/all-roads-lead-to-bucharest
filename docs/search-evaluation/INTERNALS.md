# Search evaluation harness internals

This document is for reviewers and contributors who need to understand or
modify the implementation. For the author-facing vocabulary and usage guide,
start with [README.md](README.md).

## How to read this document

You do not need to read every section for every change:

- To review the architecture, start with **Source layout**, **Dependency
  direction**, and **One execution**.
- To change counters, read **Probe implementation** and **Metric derivation**.
- To change benchmarking, read **Timing workflow**, **Benchmark suite
  workflow**, **Aggregation workflow**, and **Reporting**.
- To change terminal commands, read **CLI and process boundaries**.
- Before approving a change, use the **Reviewer checklist** and **Known
  limitations**.

## Design goals

The harness separates candidate search logic from evaluation policy. Candidate
authors should not independently decide how to validate paths, define counters,
measure very short executions, calculate statistics, or format comparisons.

The current design aims to provide:

- one search and heuristic contract;
- one source of canonical graph data;
- standardized structural counters;
- independent result validation;
- a stable Dijkstra correctness oracle;
- detailed single-run diagnosis;
- repeated, calibrated benchmark timing;
- raw records before aggregation;
- paired comparisons over matching city pairs;
- pure formatting functions separated from file and terminal I/O.

It deliberately does not integrate with the frontend yet.

## Evaluation-mode boundaries

The architecture supports two implemented modes and one planned mode:

- **Diagnosis** calls `diagnoseSearch()` for one variant and city pair. It
  emphasizes validation, reference comparison, counters, and event history. It
  does not perform calibrated timing.
- **Benchmark** calls `runBenchmarkSuite()` for selected variants and pairs,
  then aggregates and reports the records. It can perform calibrated timing.
- **Presentation** is deferred. Its frontend-facing input and output contract
  should be designed only after the team agrees on the UI, selected variants,
  animation needs, and displayed metrics.

All three modes can reuse the search contracts and low-level execution tools,
but presentation should not import CLI parsers or benchmark report formatters.
Deferring it prevents an unknown frontend design from becoming embedded in the
general evaluation layers.

## Source layout

```text
src/search/
  contracts.ts                         Public algorithm, heuristic, probe, and event types
  variant.ts                           Variant metadata, validation, and lookup
  registry.ts                          Application-wide variant catalog
  validation.ts                        Candidate-result validation

  evaluation/
    execution.ts                       One instrumented and validated candidate run
    probe.ts                           Counting data-structure implementations
    metrics.ts                         Snapshot-to-metrics derivation
    referenceDijkstra.ts               Stable shortest-path oracle
    referenceComparison.ts             Candidate cost versus oracle cost

    diagnosis/
      diagnoseSearch.ts                One detailed variant and city-pair workflow

    benchmark/
      timer.ts                         Warm-up, calibration, trials, and statistics
      suite.ts                         Multiple variants and city-pair orchestration
      aggregation.ts                   Cross-record summaries and paired comparisons
      report.ts                        Table, CSV, and JSON serialization

    cli/
      diagnosisCommand.ts              Diagnosis argument parsing and text output
      benchmarkCommand.ts              Benchmark selection and output dispatch
      formatVariantList.ts              Shared registry listing

scripts/
  diagnosis.ts                         Node terminal entry point
  benchmark.ts                         Node terminal and file-output entry point
```

Tests mirror these paths under `tests/search/evaluation/`.

## Main entry points

These functions form the most useful path through the implementation:

- [`executeSearch()`](../../src/search/evaluation/execution.ts) runs one
  candidate, captures its counters, validates its result, and derives metrics.
- [`diagnoseSearch()`](../../src/search/evaluation/diagnosis/diagnoseSearch.ts)
  adds reference comparison and an event history for one variant and city pair.
- [`runBenchmarkSuite()`](../../src/search/evaluation/benchmark/suite.ts) runs
  selected variants across selected city pairs and optionally measures time.
- [`aggregateBenchmarkRecords()`](../../src/search/evaluation/benchmark/aggregation.ts)
  summarizes the raw records and compares a focus variant with alternatives.
- The formatters in
  [`report.ts`](../../src/search/evaluation/benchmark/report.ts) turn those
  records and summaries into tables, CSV, or JSON.

A typical benchmark call follows this order:

```text
runBenchmarkSuite()
  -> referenceDijkstra() once per distinct city pair
  -> executeSearch() once per variant and pair
  -> compareWithReference()
  -> measureExecutionTime() when timing is enabled and the result is valid
  -> BenchmarkRecord[]

aggregateBenchmarkRecords()
  -> summaries and focus comparisons

formatBenchmarkReport() / benchmarkRecordsToCsv() / benchmarkReportToJson()
  -> displayable or downloadable text
```

## Dependency direction

```text
data and search contracts
          |
          v
probe + validation + metrics + reference oracle
          |
          v
      executeSearch
       /         \
      v           v
 diagnosis    benchmark suite
                  |
                  v
             aggregation
                  |
                  v
               report
       \          /
        v        v
         CLI commands
              |
              v
        Node scripts / files
```

Lower layers do not import CLI or script code. Formatters return strings and do
not write files. Only `scripts/benchmark.ts` imports `node:fs`.

## Core contracts

### SearchProblem

`SearchProblem` bundles the prebuilt `WeightedGraph`, start city, and goal city.
Graph construction is outside candidate execution. This prevents each author
from accidentally benchmarking a different graph-building strategy.

### SearchAlgorithm

`SearchAlgorithm` is a function:

```text
(SearchProblem, SearchAlgorithmContext) -> SearchResult
```

`SearchResult` is a discriminated union:

- success: ordered path plus reported path cost;
- failure: `unreachable`.

The harness recalculates successful path costs from graph edges. The reported
cost is still required so validation can identify a mismatch.

### Heuristic

`Heuristic` receives the current city and the complete search problem. It must
return a finite, non-negative estimate in the graph's path-cost units. The
contract currently has no separate preprocessing lifecycle; any future
precomputation policy must be agreed before comparing heuristics that require
substantial setup.

### SearchAlgorithmContext

The context can contain:

- a heuristic selected by the variant;
- a probe for standardized measurement;
- an event listener for observation.

These fields are optional so an implementation can be invoked outside the
harness, but meaningful harness metrics require the candidate to cooperate with
the supplied probe.

## Variant and registry model

`SearchVariant` is the evaluation unit. It deliberately represents the complete
combination rather than only an algorithm:

```text
variant = metadata + algorithm + optional heuristic
```

This allows separate records for A* with heuristic A and A* with heuristic B.

`validateSearchVariants()` enforces:

- non-empty IDs;
- unique IDs in a supplied selection;
- non-empty variant and algorithm names;
- non-empty heuristic names;
- heuristic name/function presence as a pair.

`findSearchVariant()` resolves an ID or throws for an unknown selection.

`registry.ts` owns the application-wide array. It is validated and then exposed
as a readonly frozen array. The array is currently empty because placeholder
frontend algorithms are intentionally not treated as benchmark candidates.

## Probe implementation

`createSearchProbe()` creates isolated mutable state for one execution and
returns an API that hides that state. All structures created by the probe report
to the same state object.

### CountingPriorityFrontier

The frontier is array-backed. `push()` appends and sorts so the smallest entry,
according to the supplied comparator, is at the end; `pop()` removes that entry.

Each successful operation updates:

- pushes and `nodesGenerated` on every insertion;
- pops on every non-empty removal;
- current and peak combined frontier entries.

The implementation prioritizes predictable instrumentation over being the most
efficient heap. On the fixed 20-city graph this is acceptable, but reviewers
should remember that the frontier implementation itself contributes to measured
candidate execution.

### CountingClosedSet

The closed set wraps a JavaScript `Set`. Only the first insertion of a value
increments `nodesExpanded` and `closedSetEntries`. Re-adding the same value
returns `false` and does not increment either counter.

This defines expansion consistently, but it depends on authors adding a state
at the point their algorithm considers it expanded.

### CountingCostTable

The cost table wraps a JavaScript `Map`. Setting a new key increments
`costTableEntries`; replacing the value for an existing key does not.

### Explicit counters

Road examinations and heuristic evaluations are not inferable from general data
structure operations, so authors call:

```text
countEdgeExamined()
countHeuristicEvaluation()
```

`count(name, amount)` is the escape hatch for algorithm-specific work. Names
must be non-empty and amounts must be positive safe integers.

### Snapshot

`snapshot()` copies current counters and custom counts into an immutable value.
Later activity on the probe cannot mutate an earlier snapshot.

## One execution: executeSearch()

`executeSearch()` is the shared low-level runner used by higher workflows.

Its order is significant:

1. Create a fresh probe.
2. Build the algorithm context from the probe, optional heuristic, and optional
   event listener.
3. Emit `search-started` when a listener exists.
4. Invoke the candidate algorithm exactly once.
5. Emit `search-ended` with the returned result.
6. Snapshot the probe immediately.
7. Validate the result.
8. Derive public metrics from the result, validation, and snapshot.
9. Return a frozen `SearchExecution`.

Validation and metric derivation happen after the candidate returns, so they do
not alter its structural counters. Candidate exceptions are not swallowed; they
escape to the calling workflow.

Only `search-started` and `search-ended` are automatic. Internal events must be
emitted by the algorithm.

## Result validation

`validateSearchResult()` establishes validity independently of the candidate's
claims.

For successful results it checks:

1. the path is not empty;
2. the first city is the problem start;
3. the last city is the problem goal;
4. every city belongs to the graph;
5. every consecutive pair shares a road;
6. the reported cost is finite and non-negative;
7. the reported cost equals the sum of canonical road costs.

When an algorithm returns `unreachable`, validation performs an unweighted
reachability traversal. If any route exists, it reports `false-unreachable`.

Validation deliberately does not establish optimality. A connected but longer
path can be valid and suboptimal.

## Metric derivation

`deriveSearchMetrics()` combines the probe snapshot with trusted validation
information.

Important semantics:

- `goalReached` requires both a successful result and valid validation;
- `calculatedPathCost` comes from canonical graph edges;
- `pathEdgeCount` is `path.length - 1` for a successful path;
- `resultValid` says nothing about optimality;
- custom counts are copied again before exposure.

The structural memory estimate is:

```text
peakFrontierEntries * 48
+ closedSetEntries * 32
+ costTableEntries * 40
```

These constants are explicit assumptions, not measurements of JavaScript heap
usage. Parent maps, returned paths, heuristic caches, custom structures, engine
headers, and garbage-collector behavior are not fully represented.

## Reference Dijkstra and optimality

`referenceDijkstra` is a deliberately straightforward O(V²) implementation. It
maintains unvisited cities, best known costs, and predecessor links. Once the
goal is selected, it reconstructs the path by following predecessors backward.

The implementation is harness-owned so the correctness baseline does not move
with candidate optimizations.

`compareWithReference()` consumes a validated `SearchExecution` and a
precomputed reference result:

- invalid or non-comparable results produce `null` comparison fields;
- equal costs are optimal;
- a larger candidate cost records absolute and percentage overshoot;
- a candidate cost below Dijkstra throws because either the candidate,
  validation, graph, or oracle has violated an invariant.

Exact numeric equality is currently appropriate because canonical road costs
are integers. Fractional future costs may require an agreed tolerance.

## Diagnosis workflow

`diagnoseSearch()` handles one variant and one city pair:

1. validate the variant metadata;
2. verify both cities belong to the supplied graph;
3. construct the search problem;
4. run reference Dijkstra outside candidate metrics;
5. collect candidate events in order;
6. call `executeSearch()`;
7. compare the execution with the reference;
8. return frozen metadata, execution, reference, comparison, and event history.

Diagnosis intentionally omits calibrated timing. It is designed for inspecting
correctness and behavior, not producing stable microbenchmarks.

## Timing workflow

`measureExecutionTime()` measures synchronous operations with four phases.

### 1. Validate options

Warm-up time must be finite and non-negative. Minimum trial time must be finite
and positive. Trial and maximum-iteration counts must be positive safe integers.

### 2. Warm up

The operation runs repeatedly for approximately `warmupMs` (default 50 ms).
This reduces the effect of JavaScript JIT compilation on reported trials.

### 3. Calibrate

Calibration starts with one call per batch. It doubles the batch size until a
batch lasts at least `minTrialMs` (default 10 ms), or reaches the safety limit.
This makes one clock interval much larger than timer resolution.

### 4. Measure trials

The timer runs the calibrated batch 30 times by default. Each batch duration is
divided by its iteration count to obtain one per-call sample in microseconds.
It then calculates median, P25, P75, minimum, mean, and population standard
deviation.

Every operation result is assigned to the exported `timingSink`, keeping the
result observable and reducing dead-code-elimination risk.

## Benchmark suite workflow

`runBenchmarkSuite()` accepts a graph, selected variants, city pairs, and
optional timing settings.

### Preparation and reference phase

1. Validate all selected variants.
2. Validate each city pair and build its `SearchProblem`.
3. Compute reference Dijkstra once per distinct ordered pair.
4. Store reference results in a map keyed as `start->goal`.

The complete reference phase finishes before candidate execution.

### Candidate phase

For every prepared pair and every selected variant:

1. call `executeSearch()` once for the validated result and structural metrics;
2. compare that execution with the cached reference;
3. if timing was requested and the result was valid, perform calibrated timing;
4. create one frozen `BenchmarkRecord`.

The timed callback creates a fresh probe and context, then invokes the candidate
directly. Reference Dijkstra, validation, comparison, aggregation, and reporting
are outside the timed callback. Probe/context setup and instrumented data-
structure operations are part of the measured invocation.

Timed calls are not independently validated. The untimed execution immediately
before them must be valid before timing is allowed. Candidate implementations
should therefore be deterministic and must not leak mutable state between calls.

A candidate exception currently aborts the complete suite.

## Aggregation workflow

`aggregateBenchmarkRecords()` is pure post-processing; it never reruns a search.

### Variant summaries

Records are grouped by variant ID. Metadata must remain identical for every
record in the group. Invalid records are counted but excluded from favorable
numeric summaries.

For each available metric, `summarizeNumbers()` returns:

- sample count;
- mean;
- median;
- minimum;
- maximum.

Execution-time summaries use each timed pair's median, not every inner timing
trial pooled together.

### Focus comparisons

Records are indexed by ordered city pair. For every alternative and comparison
metric, the aggregator compares the focus and alternative only when both have a
valid record for the same pair and both values exist.

Lower values win. The result counts focus wins, ties, alternative wins, and the
number of comparable pairs. This pairing controls for the fact that different
city pairs naturally have different difficulty.

Duplicate records for the same variant and ordered pair are rejected during
indexing.

## Reporting

`report.ts` is pure string transformation:

- `formatBenchmarkReport()` renders human-readable tables;
- `benchmarkRecordsToCsv()` flattens raw per-pair records;
- `benchmarkReportToJson()` preserves raw records and aggregation.

The table report emphasizes correctness, summaries, paired comparisons,
warnings, and timing methodology. CSV contains detailed timing distribution
fields per record. JSON retains the full nested evidence.

No report function writes to disk.

## CLI and process boundaries

Command modules parse arguments and call library workflows without terminal or
file I/O. This makes them directly testable.

`scripts/diagnosis.ts`:

1. reads `process.argv`;
2. parses diagnosis options;
3. supplies `searchVariantRegistry` and `romaniaGraph`;
4. writes text to stdout or an error to stderr.

`scripts/benchmark.ts` performs the same boundary work and additionally writes
the returned report string with `writeFileSync` when `--out` is present.

The `scripts/tsconfig.json` configuration supplies Node types without adding
Node-only types to the browser application build.

## Immutability strategy

Interfaces use `readonly` for compile-time protection. Important returned
containers are also frozen at runtime, including probe snapshots, executions,
benchmark records, record arrays, summaries, comparisons, and registry arrays.

`Object.freeze()` is shallow. Nested domain data is treated as readonly by
contract; callers should not mutate graph or result objects.

## Tests

The test suite covers:

- canonical graph integrity;
- result validation failures and truthful unreachable results;
- probe counters and snapshot isolation;
- derived metric semantics;
- Dijkstra reference paths and costs;
- reference comparison and overshoot;
- execution events and exception propagation;
- timer calibration and statistics;
- suite cross-products and timing selection;
- aggregation, invalid-record exclusion, and paired comparisons;
- table, CSV, and JSON reporting;
- CLI parsing and execution;
- diagnosis output.

Run all tests with:

```bash
npm test
```

Run the production typecheck and bundle with:

```bash
npm run build
```

Use the repository-wide checks from `CONTRIBUTING.md` before pushing.

## Reviewer checklist

When reviewing changes to the harness, verify:

- Does candidate work stay separate from validation and reference work?
- Does a metric still have one consistent meaning across algorithms?
- Are invalid results prevented from earning favorable comparisons?
- Is reference work outside the timed callback?
- Are repeated timing calls safe for this candidate?
- Does a new counter require probe instrumentation or metric derivation changes?
- Do CSV and JSON preserve any new raw evidence?
- Does table output label estimates as estimates?
- Are CLI parsing and I/O still separated?
- Do tests include both a valid case and an invalid or boundary case?
- Has any frontend-specific assumption leaked into the general harness?

## Known limitations and deliberate trade-offs

- Probe usage is cooperative; the type system cannot force an author to use the
  supplied counting structures correctly.
- The array-backed priority frontier is simple and observable but not a binary
  heap.
- Structural memory is an estimate of selected structures, not process RAM.
- Timing runs in the same process and can still be influenced by garbage
  collection and operating-system load.
- The current CLI applies timing to every selected pair unless `--no-timing` is
  supplied.
- Candidate exceptions abort a suite rather than becoming failed records.
- Candidate determinism is expected but not automatically checked across timed
  repetitions.
- Duplicate city pairs are accepted by the suite but later rejected by
  aggregation for the same variant and pair.
- The heuristic contract does not yet formalize preprocessing or cache setup.
- The frontend/presentation boundary is intentionally deferred until its authors
  agree on the required interaction and data shape.
