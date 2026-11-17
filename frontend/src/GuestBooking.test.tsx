import { MantineProvider } from '@mantine/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import App from './App'

const type = { id: '3be6d035-b7bd-4ab7-964d-004ffea00e07', name: 'Знакомство', durationMinutes: 30 }

function openBooking() {
  window.history.replaceState(null, '', '/book')
  render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  )
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.unstubAllGlobals()
})

test('гость меняет день, различает статусы и продолжает со свободным слотом в МСК', async () => {
  vi.stubGlobal('fetch', async (request: Request) => {
    const { pathname, searchParams } = new URL(request.url)
    if (pathname === '/api/meeting-types') return Response.json([type])
    if (pathname === `/api/meeting-types/${type.id}/availability`) {
      return Response.json([
        { date: '2026-11-10', freeCount: 0 },
        { date: '2026-11-11', freeCount: 1 },
      ])
    }
    if (pathname === `/api/meeting-types/${type.id}/slots`) {
      if (searchParams.get('date') === '2026-11-10')
        return Response.json([
          { startsAt: '2026-11-10T14:30:00Z', endsAt: '2026-11-10T15:00:00Z', status: 'busy' },
        ])
      if (searchParams.get('date') === '2026-11-11')
        return Response.json([
          { startsAt: '2026-11-11T06:00:00Z', endsAt: '2026-11-11T06:30:00Z', status: 'busy' },
          { startsAt: '2026-11-11T06:30:00Z', endsAt: '2026-11-11T07:00:00Z', status: 'available' },
        ])
    }
    throw new Error('Неизвестный путь')
  })
  openBooking()
  fireEvent.click(await screen.findByRole('button', { name: type.name }))
  fireEvent.click(await screen.findByRole('button', { name: /10 ноября.*0/ }))
  expect(await screen.findByText('На этот день свободного времени нет')).toBeDefined()
  const busy = await screen.findByRole<HTMLButtonElement>('button', {
    name: /17:30–18:00 МСК.*Занято/,
  })
  expect(busy.disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: /11 ноября.*1/ }))
  const free = await screen.findByRole('button', { name: /09:30–10:00 МСК.*Свободно/ })
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Продолжить' }).disabled).toBe(true)
  fireEvent.click(free)
  expect(free.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
  expect(await screen.findByRole('heading', { name: 'Подтверждение записи' })).toBeDefined()
  expect(screen.getByText(/11 ноября.*09:30–10:00 МСК/)).toBeDefined()
})

test('когда свободного времени нет за все 14 дней, гость может выбрать другой тип', async () => {
  vi.stubGlobal('fetch', async (request: Request) =>
    new URL(request.url).pathname === '/api/meeting-types'
      ? Response.json([
          type,
          { ...type, id: 'f33bdf25-d530-4cec-834f-3db31600eeef', name: 'Короткий звонок' },
        ])
      : Response.json(
          Array.from({ length: 14 }, (_, i) => ({ date: '2026-11-' + (10 + i), freeCount: 0 })),
        ),
  )
  openBooking()
  fireEvent.click(await screen.findByRole('button', { name: type.name }))
  expect(await screen.findByText('За ближайшие 14 дней свободного времени нет')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Выбрать другой тип встречи' }))
  expect(await screen.findByRole('button', { name: 'Короткий звонок' })).toBeDefined()
})

test('запоздалый ответ не меняет слоты нового выбранного дня', async () => {
  let finishRequest: (response: Response) => void = () => {
    throw new Error('Запрос ещё не начался')
  }
  vi.stubGlobal('fetch', async (request: Request) => {
    const { pathname, searchParams } = new URL(request.url)
    if (pathname.endsWith('/meeting-types')) return Response.json([type])
    if (pathname.endsWith('/availability'))
      return Response.json([
        { date: '2026-11-10', freeCount: 1 },
        { date: '2026-11-11', freeCount: 1 },
      ])
    if (searchParams.get('date') === '2026-11-10') {
      return new Promise<Response>((resolve) => {
        finishRequest = resolve
      })
    }
    return Response.json([
      { startsAt: '2026-11-11T06:00:00Z', endsAt: '2026-11-11T06:30:00Z', status: 'available' },
    ])
  })
  openBooking()
  fireEvent.click(await screen.findByRole('button', { name: type.name }))
  fireEvent.click(await screen.findByRole('button', { name: /10 ноября/ }))
  expect(await screen.findByText('Загрузка слотов…')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: /11 ноября/ }))
  const chosen = await screen.findByRole('button', { name: /09:00–09:30 МСК/ })
  fireEvent.click(chosen)
  await act(async () => {
    finishRequest(Response.json([]))
  })
  expect(screen.queryByText('На этот день свободного времени нет')).toBeNull()
  expect(chosen.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
  expect(screen.getByText(/11 ноября.*09:00–09:30 МСК/)).toBeDefined()
})
