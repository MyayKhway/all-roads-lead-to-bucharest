# All Roads Lead to Bucharest

A 3D visualiser for pathfinding across the classic Romania road-map problem.
Pick a start and destination, run A\*, and watch the route draw itself city by
city while the camera flies along it.

Built with React 19, TypeScript, Vite and three.js (via React Three Fiber).

> **Current implementation note:** the algorithms in `src/algorithms/` are
> frontend-development placeholders. Real algorithms and heuristics should use
> the contracts and evaluation harness under `src/search/`.

---

## Running it

### Prerequisites

- **Node.js 20.19+ or 22.12+** (Vite 8 requires one of these)
- **npm** (ships with Node)

Check what you have:

```bash
node --version
npm --version
```

### First time

```bash
git clone git@github.com:MyayKhway/all-roads-lead-to-bucharest.git
cd all-roads-lead-to-bucharest
npm install
```

### Start the dev server

```bash
npm run dev
```

Then open **http://localhost:5173**. The page hot-reloads as you edit.

> **Note:** the map needs WebGL. Any current Chrome, Firefox, Edge or Safari is
> fine. If the 3D area is blank but the sidebar renders, WebGL is disabled or
> unavailable — check `chrome://gpu` or try another browser.

---

## Available scripts

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload at http://localhost:5173        |
| `npm run build`     | Typecheck, then produce a production bundle in `dist/`     |
| `npm run preview`   | Serve the built `dist/` locally to check the real bundle   |
| `npm test`          | Typecheck and run the Node test suite                       |
| `npm run benchmark` | Compare registered search variants                          |
| `npm run diagnosis` | Inspect one registered variant on one city pair             |
| `npm run typecheck` | TypeScript only, no bundle                                 |
| `npm run lint`      | Biome — formatting *and* lint rules                        |
| `npm run format`    | Biome — rewrite files to the project's format              |

`npm run benchmark` and `npm run diagnosis` can show help or list the registry
at any time. Running an actual evaluation requires at least one real variant in
`src/search/registry.ts`.

Before pushing, `npm run lint && npm run build` should both pass clean.

---

## Toolchain

One tool per job, so nothing conflicts:

- **Biome** handles both formatting and linting. There is no ESLint or Prettier.
  Install the [Biome VS Code extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
  and the workspace settings in `.vscode/` will format on save for you.
- **Tailwind CSS v4** is available for new components. The existing UI is styled
  by hand in `src/App.css`; Tailwind's design tokens live in `src/index.css`.
  Both are loaded — use whichever suits what you're building.
- **TypeScript** runs in strict mode, including `noUncheckedIndexedAccess`.
  Indexing an array or a `Record` gives you `T | undefined`, so you have to
  handle the missing case. `positionOf()` in `src/data/cities.ts` is there to
  keep that tidy for city lookups.
- Import from `src/` with the `@/` alias, e.g. `import { cn } from '@/lib/cn'`.

---

## Project layout

```
src/
├── algorithms/             Frontend-development placeholders
│   ├── astar.ts
│   └── magneticField.ts
├── components/
│   ├── RomaniaMap.tsx     The 3D scene: lights, ground, roads, cities
│   ├── CityNode.tsx       One city — platform, landmark, label
│   ├── Landmark.tsx       Procedural low-poly buildings
│   ├── Road.tsx           An edge between two cities
│   ├── NavigationPath.tsx The animated green route
│   ├── NavigationCamera.tsx  Camera fly-along + OrbitControls
│   └── ControlPanel.tsx   Sidebar: pickers, legend, results
├── data/
│   ├── cities.ts          20 cities, 3D positions, landmark metadata
│   ├── cityIds.ts         Canonical city identifiers
│   └── graph.ts           Weighted edges (km) + adjacency builder
├── search/
│   ├── contracts.ts       Algorithm, heuristic, probe, result, and event types
│   ├── variant.ts         Variant definition, validation, and lookup
│   ├── registry.ts        Shared variant catalog
│   ├── validation.ts      Returned-path correctness checks
│   └── evaluation/        Diagnosis and benchmarking harness
│       ├── execution.ts   One instrumented and validated search
│       ├── benchmark/     Timing, suites, aggregation, and reports
│       ├── diagnosis/     Detailed inspection of one search
│       └── cli/           Testable command parsing and output
├── App.tsx                State machine: idle → animating → done
└── main.tsx               Entry point

scripts/
├── benchmark.ts           Benchmark command entry point
└── diagnosis.ts           Diagnosis command entry point

docs/search-evaluation/
├── README.md              Usage, vocabulary, and examples
└── INTERNALS.md           Implementation and reviewer walkthrough
```

### How the graph is defined

`src/data/graph.ts` holds the road network as undirected weighted edges, in
kilometres, matching the standard textbook figures:

```ts
{ from: 'arad', to: 'sibiu', distance: 140 }
```

`src/data/cities.ts` holds each city's position on the 3D map plane as
`[x, y, z]`, where `y` is always `0`. These are **scene units for layout, not
kilometres** — the whole country spans about 17 units corner to corner, while
edge weights run 70–211 km. Keep that distinction in mind when working on
heuristics.

---

## Controls

- **Drag** to orbit, **scroll** to zoom, **right-drag** to pan.
- **Click a city** to set it as start or destination.
- Camera controls are disabled while a route is animating.

---

## Search evaluation harness

- **[Usage and vocabulary](docs/search-evaluation/README.md)** — start here to
  implement, register, diagnose, or benchmark a search variant.
- **[Implementation walkthrough](docs/search-evaluation/INTERNALS.md)** — code-level
  architecture and reviewer guide.
- **[Performance metrics plan](docs/performance-metrics-plan.md)** — design history,
  methodology, and remaining questions.

---

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for branch naming, commit
conventions, and the pull request workflow.
