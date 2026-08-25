import { Counter } from '@/components/Counter'

export default function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8">
      <h1 className="bg-linear-to-r from-brand-500 to-brand-900 bg-clip-text text-5xl font-bold text-transparent">
        All roads lead to Bucharest
      </h1>
      <p className="max-w-prose text-center text-slate-600 dark:text-slate-400">
        Vite + React + TypeScript + Tailwind CSS v4, linted and formatted by Biome, tested with
        Vitest.
      </p>
      <Counter />
    </main>
  )
}
