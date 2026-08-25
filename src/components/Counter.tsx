import { useState } from 'react'

import { cn } from '@/lib/cn'

type CounterProps = {
  label?: string
  className?: string
}

export function Counter({ label = 'count', className }: CounterProps) {
  const [count, setCount] = useState(0)

  return (
    <button
      type="button"
      onClick={() => setCount((c) => c + 1)}
      className={cn(
        'rounded-lg bg-brand-600 px-4 py-2 font-medium text-white shadow-sm transition',
        'hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-brand-500 active:scale-95',
        className,
      )}
    >
      {label} is {count}
    </button>
  )
}
