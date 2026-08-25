# all-roads-lead-to-bucharest

Vite + React + TypeScript + Tailwind CSS v4, with Biome for lint/format and Vitest for tests.

## Stack

| Concern       | Tool                                              |
| ------------- | ------------------------------------------------- |
| Build / dev   | Vite 8                                            |
| UI            | React 19                                          |
| Language      | TypeScript 6 (strict, `noUncheckedIndexedAccess`) |
| Styling       | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first)  |
| Lint / format | Biome 2                                           |
| Tests         | Vitest + Testing Library + jsdom                  |
| Packages      | pnpm                                              |

## Scripts

```bash
pnpm dev          # start the dev server
pnpm build        # typecheck + production build
pnpm preview      # serve the production build

pnpm test         # run tests once
pnpm test:watch   # watch mode
pnpm test:ui      # Vitest UI
pnpm coverage     # v8 coverage report

pnpm typecheck    # tsc -b
pnpm lint         # biome check .
pnpm lint:fix     # biome check --write .
pnpm format       # biome format --write .
pnpm check        # typecheck + lint + test
```

## Conventions

- `@/*` is aliased to `src/*` (configured in both `tsconfig.app.json` and `vite.config.ts`).
- Tailwind is configured CSS-first in `src/index.css` via `@theme` — there is no `tailwind.config.js`.
  The `brand-*` scale defined there is an example; replace it with your own palette.
- Biome handles formatting, linting, and import organization. VS Code is wired up in
  `.vscode/settings.json` (install the recommended `biomejs.biome` extension).
- Tests live next to the code they cover (`src/components/Counter.test.tsx`); shared setup is in
  `src/test/setup.ts`.
