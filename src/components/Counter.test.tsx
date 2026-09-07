import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Counter } from '@/components/Counter'

describe('Counter', () => {
  it('starts at zero', () => {
    render(<Counter />)
    expect(screen.getByRole('button')).toHaveTextContent('count is 0')
  })

  it('increments on click', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toHaveTextContent('count is 2')
  })
})
