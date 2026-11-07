import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { client } from './api/generated/client.gen'
import App from './App.tsx'

// Node's fetch needs an absolute URL; in the browser the SDK uses relative /api paths.
client.setConfig({ baseUrl: 'http://localhost' })

afterEach(() => {
  vi.unstubAllGlobals()
})

test('renders app and shows API status', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ status: 'ok' })),
  )

  render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  )

  expect(screen.getByRole('heading', { name: 'Календарь звонков' })).toBeDefined()
  expect(await screen.findByText('доступен')).toBeDefined()
})
