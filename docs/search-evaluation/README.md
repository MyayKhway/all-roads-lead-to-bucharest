# Search evaluation harness

This guide explains how to use the search evaluation harness. It is written for
people who want to add or test an algorithm without reading all the harness
code.

You do not need to understand every internal file first. The harness takes care
of the repeated evaluation work for you. You provide an algorithm and, when
needed, a heuristic.

If you want to review or change the harness itself, read
[INTERNALS.md](INTERNALS.md) after this guide.

## Essential vocabulary

Start here because these words are needed to understand the rest of the guide.
More specialized terms are explained later, beside the feature that uses them.

### Search problem

One task for an algorithm to solve. It contains:

- the graph;
- the start city;
- the goal city.

For example, “find a route from Arad to Bucharest” is one search problem.

### State

A possible place the search can be in. In this project, each city is a state.

### Search algorithm

A function that tries to solve a search problem. It receives the graph, start
city, goal city, and some optional tools. It returns either:

- a path from start to goal; or
- `unreachable` when no path exists.

Examples include uniform-cost search, greedy best-first search, and A*.

### Heuristic

A function that estimates how much cost remains between the current city and
the goal. A heuristic helps an informed search decide where to search next.

A blind search does not use a heuristic.

### Variant

One complete algorithm-and-heuristic combination.

For example:

- A* with straight-line distance is one variant;
- A* with ALT is another variant;
- uniform-cost search without a heuristic is another variant.

Even when two variants use the same algorithm, they are different variants if
they use different heuristics.

### Registry

The shared list of variants that the application knows about. Think of it as a
catalog.

After an author registers a variant, the diagnosis and benchmark commands can
find it by its ID.

### Harness

The complete testing environment around other people's search code. Think of it
as a test station that every algorithm plugs into.

The harness provides:

- common TypeScript contracts;
- the graph and search problem;
- counting tools;
- result validation;
- a reference shortest-path result;
- timing;
- comparison and statistics;
- reports and command-line tools.

The harness does not decide how an author's search algorithm works.

### Probe

The measurement tool given to an algorithm during a harness run.

The probe can create counting versions of:

- a frontier;
- a closed set;
- a cost table.

It can also count examined roads, heuristic calls, and custom work. Authors use
these tools so every implementation measures work in the same way.

### Diagnosis

One detailed run of one variant on one start-goal pair.

Diagnosis is mainly for developing and debugging. It shows the path, correctness,
optimality, counters, and events from that one run.

### Benchmark

A controlled comparison of selected variants on one or more city pairs. It can
compare correctness, solution quality, structural work, and execution time.

## The three evaluation modes

The project plans to use the shared search contracts in three different ways:

| Mode | Status | Purpose |
| --- | --- | --- |
| Diagnosis | Implemented | Inspect one variant on one city pair while developing or debugging it. |
| Benchmark | Implemented | Compare selected variants across selected city pairs using uniform measurements. |
| Presentation | Deferred | Supply frontend-facing results for the final demonstration. |

Diagnosis and benchmarking are available through command-line tools today.
They share the same algorithm contracts, graph, validation, reference Dijkstra,
probe, and metric meanings.

Presentation mode is intentionally not implemented yet. The team first needs to
agree on what the frontend will show, which variants it will run, whether it
needs events for animation, and what result shape it expects. After that
agreement, presentation can reuse the stable search contracts without making
the frontend depend on benchmark reports or command-line code.

## The current implemented flow

```text
Write an algorithm and an optional heuristic
                    |
                    v
Create a named variant
                    |
                    v
Add the variant to the registry
                    |
          +---------+---------+
          |                   |
          v                   v
 Diagnose one case      Run a benchmark suite
          |                   |
          v                   v
Inspect one search      Compare many records,
in detail               summaries, and timings
```

The author writes the actual search logic. The harness handles the repeated
surrounding work.

An author does not need to write a separate:

- benchmark loop;
- Dijkstra checker;
- path validator;
- statistics calculator;
- CSV or JSON writer;
- command-line parser.

## The shortest path through this guide

If you only want to add and check a variant, follow these sections in order:

1. [What an algorithm receives and returns](#what-an-algorithm-receives-and-returns)
2. [Adding an implementation](#adding-an-implementation)
3. [Diagnosing one variant](#diagnosing-one-variant)
4. [Benchmarking variants](#benchmarking-variants)

The longer probe example explains the TypeScript and counting structures in
detail. Authors already comfortable with those ideas can skim that example and
return to it when implementing their algorithm.

## What an algorithm receives and returns

An algorithm receives a `problem` and a `context`.

The problem contains:

- `problem.graph`: the ready-to-use weighted graph;
- `problem.start`: the start city;
- `problem.goal`: the goal city.

The context may contain:

- `context.heuristic`: the selected heuristic;
- `context.probe`: the measurement tools;
- `context.eventListener`: the function that receives search events.

The algorithm returns either:

- a successful path in start-to-goal order, together with its total road cost;
  or
- a failure with the reason `unreachable`.

The shared types are defined in `src/search/contracts.ts`.

## Adding an implementation

### 1. Write the search algorithm

The graph is already built before the algorithm runs. Use the graph from the
search problem instead of rebuilding it inside the algorithm.

The smallest shape of an implementation looks like this:

```ts
import type { SearchAlgorithm } from '@/search/contracts'

export const mySearch: SearchAlgorithm = (problem, context) => {
  // Use problem.graph, problem.start, problem.goal, and context.
  throw new Error('Implement the search and return a SearchResult')
}
```

The `SearchAlgorithm` type makes TypeScript check that the inputs and returned
result have the required shape.

### 2. Use the probe for measurable data structures

The algorithm author does not implement `frontier()`, `closedSet()`, or
`costTable()`. The harness already implements them inside the probe.

This is the most detailed part of the guide. Read it while implementing an
algorithm that needs comparable structural metrics; otherwise, you can skim it
and continue to [Create a variant](#4-create-a-variant).

<details>
<summary>Detailed TypeScript probe walkthrough</summary>

The author calls these factory functions inside the search algorithm. Each call
creates a data structure for that one search. The author then uses normal
operations such as `push()`, `pop()`, `add()`, `has()`, `get()`, and `set()`.

The author does define the shape of an entry stored in the frontier. Uniform-
cost search could use this shape:

```ts
import type { CityId } from '@/data/cityIds'

interface FrontierEntry {
  readonly city: CityId
  readonly pathCost: number
}
```

This interface says that every frontier entry contains a valid city ID and the
cost of reaching that city. `readonly` prevents the author from accidentally
changing those two properties after creating an entry.

The type inside angle brackets tells TypeScript what the structure stores:

- `frontier<FrontierEntry>` stores `FrontierEntry` objects;
- `closedSet<CityId>` stores city IDs;
- `costTable<CityId, number>` maps each city ID to a number.

Create the structures near the beginning of the algorithm:

```ts
const probe = context.probe

if (probe === undefined) {
  throw new Error('This search requires an evaluation probe')
}

const frontier = probe.frontier<FrontierEntry>(
  (left, right) => left.pathCost - right.pathCost,
)
const closed = probe.closedSet<CityId>()
const bestCost = probe.costTable<CityId, number>()
```

The comparison function tells the frontier which entry has higher priority. In
this example, a smaller path cost should be removed first:

```ts
left.pathCost - right.pathCost
```

If the left entry costs 75 and the right entry costs 140, the result is
negative. This tells the frontier that the left entry should come first.

The probe is optional in the general TypeScript contract because an algorithm
may be called outside the harness. `executeSearch()` always creates and supplies
a fresh probe. The explicit check above lets TypeScript know that `probe` exists
for the rest of the algorithm.

#### Example: using the structures in a search loop

The following excerpt shows how uniform-cost search could use them. It focuses
on the probe structures, so path reconstruction and the final successful return
are left out.

```ts
// Start with the initial city at a cost of zero.
frontier.push({
  city: problem.start,
  pathCost: 0,
})
bestCost.set(problem.start, 0)

while (frontier.size > 0) {
  const current = frontier.pop()

  if (current === undefined) {
    break
  }

  // A repeated or stale frontier entry should not be expanded again.
  if (closed.has(current.city)) {
    continue
  }

  // The city becomes expanded when the algorithm accepts it for processing.
  closed.add(current.city)

  if (current.city === problem.goal) {
    // Reconstruct and return the successful path here.
    break
  }

  for (const neighbor of problem.graph.adjacency[current.city] ?? []) {
    probe.countEdgeExamined()

    const candidateCost = current.pathCost + neighbor.distance
    const knownCost = bestCost.get(neighbor.city) ?? Number.POSITIVE_INFINITY

    if (candidateCost < knownCost) {
      bestCost.set(neighbor.city, candidateCost)

      frontier.push({
        city: neighbor.city,
        pathCost: candidateCost,
      })
    }
  }
}
```

The calls are part of the algorithm's normal logic. The probe measures them at
the same time.

#### What each operation records

When the author calls:

```ts
frontier.push({ city: problem.start, pathCost: 0 })
```

the probe records:

- one frontier push;
- one generated node;
- the new frontier size;
- a new peak frontier size when this size is the largest seen so far.

When the author calls:

```ts
const current = frontier.pop()
```

the probe records one frontier pop when an entry was available. Popping an
empty frontier does not increase the counter.

When the author calls:

```ts
closed.add(current.city)
```

the probe records one expanded node and one closed-set entry only when that
value was not already in that particular closed set.

When the author calls:

```ts
bestCost.set(neighbor.city, candidateCost)
```

the probe records a cost-table entry when the city is a new key. Replacing the
cost of a city already in the table does not create another entry.

#### Small example with Arad

At the beginning of an Arad search, the algorithm pushes:

```ts
{ city: 'arad', pathCost: 0 }
```

It later pops Arad and adds it to the closed set. When examining Arad's roads,
it calls `probe.countEdgeExamined()` for Zerind, Sibiu, and Timisoara. If those
routes are improvements, it stores their costs and pushes entries such as:

```ts
{ city: 'zerind', pathCost: 75 }
{ city: 'timisoara', pathCost: 118 }
{ city: 'sibiu', pathCost: 140 }
```

Because 75 is the smallest cost, Zerind will be popped first.

#### Explicit and custom counters

The probe cannot automatically know when an author examines a road or calls a
heuristic. Count that work directly:

```ts
probe.countEdgeExamined()
probe.countHeuristicEvaluation()
```

For work that is special to one algorithm, use:

```ts
probe.count('customCounterName')
```

Use custom counters only when the standard counters cannot describe the work.

If an algorithm ignores the probe, it may still return a correct path. However,
its structural metrics will be zero or incomplete, so comparisons with properly
instrumented algorithms will not be meaningful.

After one search finishes, the harness takes a **snapshot**: a fixed copy of the
probe's counters. Later probe activity cannot change that earlier snapshot.

</details>

### 3. Emit useful search events

An **event** is a message describing something that happened during a search,
such as discovering, expanding, or updating a city. Events are useful for
diagnosis and can later support frontend animation.

The harness automatically emits:

- `search-started` before calling the algorithm;
- `search-ended` after the algorithm returns.

The algorithm must emit its own internal events when they are useful:

- `node-discovered`;
- `node-expanded`;
- `node-updated`;
- `frontier-size-changed`;
- `heuristic-evaluated`.

Send an event with `context.eventListener?.(...)`.

If an algorithm does not emit internal events, it can still run and be
benchmarked. However, diagnosis will only show the automatic start and end
events.

### 4. Create a variant

A variant connects an implementation to the rest of the application.

```ts
import type { SearchVariant } from '@/search/variant'

export const myVariant: SearchVariant = {
  id: 'astar-my-heuristic',
  name: 'A* with my heuristic',
  algorithmName: 'A*',
  heuristicName: 'My heuristic',
  author: 'Your name',
  algorithm: mySearch,
  heuristic: myHeuristic,
}
```

The variant does not create or operate the frontier, closed set, or cost table.
It only points to the algorithm that does that work:

```text
myVariant
  |
  +-- algorithm: mySearch
                    |
                    +-- calls probe.frontier()
                    +-- calls probe.closedSet()
                    +-- calls probe.costTable()
```

In practice, the same person may write both the algorithm and its variant entry.
They write the probe calls inside the algorithm and place only the algorithm
reference and descriptive information inside the variant.

For a blind search:

- set `heuristicName` to `null`;
- do not include `heuristic`.

The harness checks the following rules:

- every variant ID must contain text;
- every selected variant ID must be unique;
- variant and algorithm names must contain text;
- a heuristic name cannot be empty;
- the heuristic name and heuristic function must either both exist or both be
  absent.

### 5. Register the variant

Import the variant and add it to the `variants` array in
`src/search/registry.ts`.

Think of this step as putting the variant into the shared catalog. Diagnosis,
benchmarking, and future application integration use this same registry.

The registry is currently empty because the existing frontend algorithms are
placeholders and do not follow the new contract yet.

While the registry is empty:

- `--help` still works;
- `--list` reports that no variants are registered;
- diagnosis and benchmarking cannot run a candidate.

### 6. Check the project

Run:

```bash
npm test
npm run build
```

Before pushing, also follow the checks and Git workflow in `CONTRIBUTING.md`.

## How correctness and optimality are checked

The harness performs two separate checks after an algorithm returns.

**Validation** checks whether the returned answer is legitimate. It verifies
the cities, path endpoints, roads, and reported path cost. A path may pass
validation even when a shorter valid path exists.

The **reference oracle** is the harness-owned Dijkstra implementation. Here,
“oracle” means a trusted answer used for comparison, not artificial
intelligence. It supplies the known shortest-path cost for the same problem.

A valid result is **optimal** when its path cost equals the reference cost. This
separation is important: a path can be valid but suboptimal.

## Diagnosing one variant

Use diagnosis while writing or debugging an algorithm. It gives detailed
information about one search instead of broad statistics about many searches.

### List registered variants

```bash
npm run diagnosis -- --list
```

### Diagnose one city pair

```bash
npm run diagnosis -- \
  --variant astar-my-heuristic \
  --start arad \
  --goal bucharest
```

On PowerShell, writing the command on one line is simpler:

```powershell
npm run diagnosis -- --variant astar-my-heuristic --start arad --goal bucharest
```

The output shows:

- which variant, algorithm, heuristic, and author were selected;
- the returned path or the `unreachable` failure;
- the cost reported by the algorithm;
- validation problems, if any;
- the path cost calculated from the graph;
- the reference Dijkstra cost;
- whether the valid path was optimal;
- structural work and estimated memory;
- events in the order they were received.

Diagnosis does not run repeated calibrated timing. It is meant to explain one
run clearly.

Diagnosis can show whether one result is valid and optimal. It cannot
mathematically prove that an algorithm is complete for every possible problem.
It also cannot prove that a heuristic is admissible or consistent.

## Benchmarking variants

Use benchmarking when you want to compare several variants under the same
rules.

The benchmark vocabulary is:

- A **case** is one variant tested on one ordered city pair. Arad to Bucharest
  and Bucharest to Arad are different cases.
- A **suite** is a group of cases covering selected variants and city pairs.
- A **record** is the raw result of one case, including correctness, metrics,
  reference comparison, and optional timing.
- **Aggregation** combines records into summaries and paired comparisons. It
  does not run the algorithms again.
- The **focus variant** is the main variant being studied. The report compares
  it with every other selected variant.

### List registered variants

```bash
npm run benchmark -- --list
```

### Compare variants on one pair

```powershell
npm run benchmark -- --focus astar-my-heuristic --variants astar-my-heuristic,uniform-cost --pairs arad:bucharest
```

Here:

- `astar-my-heuristic` is the focus;
- both listed variants are included;
- the suite evaluates Arad to Bucharest;
- timing is enabled because `--no-timing` was not supplied.

### Collect structural metrics for every ordered pair

There are 20 cities, so there are 380 ordered pairs where start and goal are
different.

```powershell
npm run benchmark -- --focus astar-my-heuristic --variants astar-my-heuristic,uniform-cost --pairs all --no-timing
```

`--no-timing` is important here. Exact counters need one candidate execution per
case. Calibrated timing needs many repeated executions per case and would make
an all-pairs run much slower.

### Save CSV output

```powershell
npm run benchmark -- --focus astar-my-heuristic --variants astar-my-heuristic,uniform-cost --pairs arad:bucharest,oradea:eforie --format csv --out results.csv
```

CSV contains one flattened row for each raw benchmark record. It is convenient
for opening the results in spreadsheet software.

### Save JSON output

```powershell
npm run benchmark -- --focus astar-my-heuristic --variants astar-my-heuristic,uniform-cost --pairs arad:bucharest --format json --out results.json
```

JSON keeps both the raw records and the calculated aggregation. It is convenient
when another program needs to read the results without losing their nested
structure.

### See every option

```bash
npm run benchmark -- --help
npm run diagnosis -- --help
```

The extra `--` belongs to npm. It tells npm to pass everything after it to the
benchmark or diagnosis script.

## How timing works

Timing is enabled by default for every pair selected by the current benchmark
command.

Three timing terms matter here:

- **Warm-up** runs the search before measuring it, giving the JavaScript engine
  time to perform just-in-time, or JIT, optimization.
- **Calibration** finds how many repeated searches should be timed together
  because one search may be too short for a reliable clock reading.
- A **trial** is one timed batch after warm-up and calibration. The timer uses
  30 trials by default.

For each timed variant and pair, the timer:

1. warms up the operation for about 50 milliseconds by default;
2. calibrates how many searches belong in one trial;
3. performs 30 timed trials by default;
4. calculates per-search timing statistics.

One trial may contain many search iterations. This is necessary because one
search over 20 cities may finish too quickly for a reliable clock reading.

Do not normally use timing with `--pairs all`. Use `--no-timing` for exhaustive
structural counts. Use a smaller, representative list of pairs for timing.

## Understanding the metrics

A **metric** is a value describing the returned solution or the work performed.
Examples include path cost, nodes expanded, peak frontier size, and execution
time.

### Nodes generated

`nodesGenerated` is the number of frontier pushes. Pushing the same city more
than once counts more than once.

### Nodes expanded

`nodesExpanded` counts successful first insertions into an instrumented closed
set. Adding the same value to that set again does not increase the count.

### Frontier pushes and pops

`frontierPushes` counts inserted frontier entries. It is currently the same as
`nodesGenerated`.

`frontierPops` counts successful removals from the frontier. Pops can be greater
than expansions when an algorithm removes stale or repeated entries.

### Peak frontier entries

`peakFrontierEntries` is the largest combined number of entries held by the
probe's frontiers at one time.

### Closed-set entries

`closedSetEntries` counts unique values stored in the instrumented closed sets.

### Cost-table entries

`costTableEntries` counts unique keys stored in instrumented cost tables.
Changing the value of a key that already exists does not add another entry.

### Edges examined

`edgesExamined` counts roads inspected while expanding cities. The algorithm
author must increment this counter.

### Heuristic evaluations

`heuristicEvaluations` counts heuristic calls recorded by the algorithm author.
A blind search should report zero.

### Calculated path cost

`calculatedPathCost` is recalculated using the canonical road costs. The harness
does not simply trust the cost reported by the algorithm.

### Path edge count

`pathEdgeCount` is the number of roads in the returned path, not the number of
cities.

For example:

```text
Arad -> Sibiu -> Fagaras
```

contains three cities but two roads, so its path edge count is 2.

### Estimated bytes

`estimatedBytes` is a structural estimate based on frontier, closed-set, and
cost-table entries.

It is not a measurement of total browser memory or process RAM. It does not
fully include parent maps, returned paths, heuristic caches, custom structures,
or JavaScript engine overhead.

### Result valid

`resultValid` means the returned answer passed validation. It does not mean the
path is optimal.

### Execution time

Timing values use microseconds per candidate call.

The median is the main value because it is less affected by one unusually slow
trial. CSV and JSON also include:

- P25, the value at or below which about one quarter of samples fall;
- P75, the value at or below which about three quarters of samples fall;
- minimum;
- mean, which is the ordinary average;
- standard deviation, which describes how spread out the samples are;
- iterations per trial;
- number of trials.

## Understanding the benchmark report

The human-readable report has four important sections.

### 1. Variant results

Shows how many pairs were valid, invalid, optimal, suboptimal, or not
comparable.

### 2. Performance summary

Shows the sample count, mean, median, minimum, and maximum for each metric. Only
valid records contribute performance values.

- **Sample count** says how many records supplied a value.
- **Mean** is the ordinary average.
- **Median** is the middle value after sorting.
- **Minimum** and **maximum** show the observed range.

These values summarize different city pairs, which may have different levels
of difficulty. Do not use one average as the only evidence.

### 3. Focus comparisons

Compares the focus variant with each alternative on matching city pairs. For
each metric, it counts:

- focus wins;
- ties;
- alternative wins.

Lower values win. Pairing the same city problem on both sides makes this more
informative than comparing unrelated runs.

### 4. Warnings

Highlights invalid and suboptimal results. Invalid results are counted, but
they are not allowed to earn favorable performance comparisons.

## Rules for a fair comparison

### Use the canonical graph

Use the graph and road costs from `src/data/graph.ts`.

The positions in `src/data/cities.ts` are 3D scene coordinates. They are not
kilometres. Do not mix scene positions and road costs unless the conversion is
intentional and agreed upon.

### Use the probe consistently

If one author uses the counting frontier and another author manually counts
something different, their numbers may not mean the same thing.

### Keep repeated calls independent

The timer calls an algorithm many times. An algorithm should be deterministic
and should not leave mutable state that affects the next call.

### Leave validation and Dijkstra outside the algorithm

Do not call the harness validator or reference Dijkstra inside a candidate
algorithm. The harness runs them separately so they do not become part of the
candidate's measured work.

### Treat memory as an estimate

Use structural entry counts when making strong memory claims. Always label
`estimatedBytes` as an estimate.

### Do not reward incorrect results

A fast invalid answer is not a useful win. The aggregation excludes invalid
records from performance summaries and paired comparisons.

## Current boundaries and limitations

These are important when deciding what the current harness can prove.

- Real search variants have not been registered yet.
- The frontend and presentation contract will be designed with the frontend
  team later. It is not implemented today.
- The harness currently evaluates synchronous algorithms.
- If a candidate throws an error, the current diagnosis or benchmark suite
  stops and exposes that error.
- The memory estimate covers instrumented frontier, closed-set, and cost-table
  entries. It is not total JavaScript memory.
- Structural metrics depend on authors using the probe correctly.
- Candidate determinism is expected but is not automatically checked across all
  timed repetitions.
- The current CLI times every selected pair unless `--no-timing` is used.
- Duplicate city pairs can reach the suite but are rejected later during
  aggregation for the same variant and pair.
- The heuristic contract does not yet define a standard setup phase for
  expensive preprocessing or caches.

For the code-level explanation, dependency flow, and reviewer checklist, read
[INTERNALS.md](INTERNALS.md).
