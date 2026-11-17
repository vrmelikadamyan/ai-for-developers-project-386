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

test('если последний слот заняли до выбора даты, обновляются счётчики дня и всего окна', async () => {
  vi.stubGlobal('fetch', async (request: Request) => {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/meeting-types') return Response.json([type])
    if (pathname === `/api/meeting-types/${type.id}/availability`) {
      return Response.json([
        { date: '2026-11-10', freeCount: 0 },
        { date: '2026-11-11', freeCount: 1 },
      ])
    }
    if (pathname === `/api/meeting-types/${type.id}/slots`)
      return Response.json([
        { startsAt: '2026-11-11T06:00:00Z', endsAt: '2026-11-11T06:30:00Z', status: 'busy' },
      ])
    throw new Error('Неизвестный путь')
  })
  openBooking()
  fireEvent.click(await screen.findByRole('button', { name: type.name }))
  fireEvent.click(await screen.findByRole('button', { name: '11 ноября · Свободно 1' }))
  expect(await screen.findByText('На этот день свободного времени нет')).toBeDefined()
  expect(screen.getByRole('button', { name: '11 ноября · Свободно 0' })).toBeDefined()
  expect(screen.getByText('За ближайшие 14 дней свободного времени нет')).toBeDefined()
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
  expect(screen.getByRole('button', { name: '10 ноября · Свободно 1' })).toBeDefined()
  expect(chosen.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
  expect(screen.getByText(/11 ноября.*09:00–09:30 МСК/)).toBeDefined()
})

test('гость подтверждает запись и начинает новую с актуальным календарём и пустыми контактами', async () => {
  const startsAt = '2026-11-11T06:30:00Z'
  let confirmed = false
  vi.stubGlobal('fetch', async (request: Request) => {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/meeting-types') return Response.json([type])
    if (pathname.endsWith('/availability'))
      return Response.json([{ date: '2026-11-11', freeCount: confirmed ? 17 : 18 }])
    if (pathname.endsWith('/slots'))
      return Response.json([
        { startsAt, endsAt: '2026-11-11T07:00:00Z', status: confirmed ? 'busy' : 'available' },
        { startsAt: '2026-11-11T07:00:00Z', endsAt: '2026-11-11T07:30:00Z', status: 'available' },
      ])
    if (request.method === 'POST' && pathname === '/api/bookings') {
      const contact = await request.json()
      if (
        contact.meetingTypeId === type.id &&
        contact.startsAt === startsAt &&
        contact.guestName === 'Анна-Мария Ли' &&
        contact.guestEmail === 'anna+work@example.org'
      ) {
        confirmed = true
        return Response.json(
          {
            id: 'cf2da02c-36de-48cc-909a-b13db0e61591',
            ...contact,
            meetingTypeName: type.name,
            endsAt: '2026-11-11T07:00:00Z',
            createdAt: '2026-11-10T07:00:00Z',
          },
          { status: 201 },
        )
      }
    }
    throw new Error('Некорректный запрос')
  })
  openBooking()
  fireEvent.click(await screen.findByRole('button', { name: type.name }))
  fireEvent.click(await screen.findByRole('button', { name: /11 ноября.*18/ }))
  fireEvent.click(await screen.findByRole('button', { name: /09:30–10:00 МСК.*Свободно/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
  fireEvent.change(screen.getByRole('textbox', { name: /Имя/ }), {
    target: { value: ' Анна-Мария Ли  ' },
  })
  fireEvent.change(screen.getByRole('textbox', { name: /Email/i }), {
    target: { value: ' anna+work@example.org  ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))
  expect(await screen.findByText('Бронь подтверждена. До встречи!')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Забронировать ещё' }))
  fireEvent.click(await screen.findByRole('button', { name: type.name }))
  fireEvent.click(await screen.findByRole('button', { name: /11 ноября.*17/ }))
  expect(
    (await screen.findByRole<HTMLButtonElement>('button', { name: /09:30–10:00 МСК.*Занято/ }))
      .disabled,
  ).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: /10:00–10:30 МСК.*Свободно/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: /Имя/ }).value).toBe('')
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: /Email/i }).value).toBe('')
})

test('форма проверяет имя и email, сохраняет выбранный слот и позволяет исправить контакты', async () => {
  const submissions: unknown[] = []
  vi.stubGlobal('fetch', async (request: Request) => {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/meeting-types') return Response.json([type])
    if (pathname.endsWith('/availability'))
      return Response.json([{ date: '2026-11-11', freeCount: 1 }])
    if (pathname.endsWith('/slots'))
      return Response.json([
        { startsAt: '2026-11-11T06:30:00Z', endsAt: '2026-11-11T07:00:00Z', status: 'available' },
      ])
    if (request.method === 'POST' && pathname === '/api/bookings') {
      submissions.push(await request.json())
      return Response.json({}, { status: 201 })
    }
    throw new Error('Некорректный запрос')
  })
  openBooking()
  fireEvent.click(await screen.findByRole('button', { name: type.name }))
  fireEvent.click(await screen.findByRole('button', { name: /11 ноября/ }))
  fireEvent.click(await screen.findByRole('button', { name: /09:30–10:00 МСК/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
  const name = screen.getByRole<HTMLInputElement>('textbox', { name: /Имя/ })
  const email = screen.getByRole<HTMLInputElement>('textbox', { name: /Email/i })
  const confirm = screen.getByRole('button', { name: 'Подтвердить запись' })
  for (const [invalidName, invalidEmail] of [
    ['   ', 'missing-at'],
    ['😀'.repeat(101), 'a'.repeat(243) + '@example.org'],
    ['', 'guest@'],
    ['', 'a b@example.org'],
  ]) {
    fireEvent.change(name, { target: { value: invalidName } })
    fireEvent.change(email, { target: { value: invalidEmail } })
    fireEvent.click(confirm)
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(name.value).toBe(invalidName)
    expect(email.value).toBe(invalidEmail)
    expect(screen.getByText(/11 ноября.*09:30–10:00 МСК/)).toBeDefined()
  }
  expect(submissions).toHaveLength(0)
  fireEvent.change(name, { target: { value: 'Анна' } })
  for (const invalidEmail of ['anna@.', 'anna@example..org', 'anna@-example.org']) {
    fireEvent.change(email, { target: { value: invalidEmail } })
    fireEvent.click(confirm)
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(email.value).toBe(invalidEmail)
    expect(screen.getByText(/11 ноября.*09:30–10:00 МСК/)).toBeDefined()
  }
  expect(submissions).toHaveLength(0)
  const validName = '😀'.repeat(100)
  const validEmail = 'a'.repeat(242) + '@example.org'
  fireEvent.change(name, { target: { value: ' ' + validName + ' ' } })
  fireEvent.change(email, { target: { value: ' ' + validEmail + ' ' } })
  fireEvent.click(confirm)
  expect(await screen.findByText('Бронь подтверждена. До встречи!')).toBeDefined()
  expect(submissions).toEqual([
    {
      meetingTypeId: type.id,
      startsAt: '2026-11-11T06:30:00Z',
      guestName: validName,
      guestEmail: validEmail,
    },
  ])
})

test('на границе года дни сгруппированы по месяцам и выровнены с понедельника', async () => {
  vi.stubGlobal('fetch', async (request: Request) =>
    Response.json(
      new URL(request.url).pathname === '/api/meeting-types'
        ? [type]
        : [
            { date: '2026-12-31', freeCount: 3 },
            { date: '2027-01-01', freeCount: 0 },
          ],
    ),
  )
  openBooking()
  fireEvent.click(await screen.findByRole('button', { name: type.name }))
  expect(await screen.findByRole('heading', { name: /декабрь 2026/i })).toBeDefined()
  expect(screen.getByRole('heading', { name: /январь 2027/i })).toBeDefined()
  const last = screen.getByRole<HTMLButtonElement>('button', { name: '31 декабря · Свободно 3' })
  const first = screen.getByRole<HTMLButtonElement>('button', { name: '1 января · Свободно 0' })
  expect(last.style.gridColumnStart).toBe('4')
  expect(first.style.gridColumnStart).toBe('5')
})
