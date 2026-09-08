# All Roads Lead to Bucharest

A 3D visualiser for pathfinding across the classic Romania road-map problem.
Pick a start and destination, run A\*, and watch the route draw itself city by
city while the camera flies along it.

Built with React 19, TypeScript, Vite and three.js (via React Three Fiber).

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
| `npm run typecheck` | TypeScript only, no bundle                                 |
| `npm run lint`      | Biome — formatting *and* lint rules                        |
| `npm run format`    | Biome — rewrite files to the project's format              |

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
├── algorithms/
│   ├── astar.ts           A* search + binary min-heap
│   └── magneticField.ts   Heuristics: magnetic field, straight line
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
│   └── graph.ts           Weighted edges (km) + adjacency builder
├── App.tsx                State machine: idle → animating → done
└── main.tsx               Entry point
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

## Contributing

Work on a branch named after yourself, then open a PR into `main`:

```bash
git checkout -b your-name
# ... work ...
npm run lint && npm run build
git push -u origin your-name
```
