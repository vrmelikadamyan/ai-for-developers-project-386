import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import App from './App'
import { type BookingInput, type CalendarDay, type Slot } from './api'

const meetingType = {
  id: '3be6d035-b7bd-4ab7-964d-004ffea00e07',
  name: 'Знакомство',
  durationMinutes: 30,
}
const slot: Slot = {
  startsAt: '2026-11-11T06:30:00Z',
  endsAt: '2026-11-11T07:00:00Z',
  status: 'available',
}
const laterSlot: Slot = {
  startsAt: '2026-11-11T07:00:00Z',
  endsAt: '2026-11-11T07:30:00Z',
  status: 'available',
}
const name = () => screen.getByRole<HTMLInputElement>('textbox', { name: /Имя/ })
const email = () => screen.getByRole<HTMLInputElement>('textbox', { name: /Email/ })
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Подтвердить запись' }))

interface Scenario {
  book: (input: BookingInput) => Response
  days?: () => CalendarDay[]
  slots?: (date: string | null) => Slot[]
}

async function openConfirmation({
  book,
  days = () => [{ date: '2026-11-11', freeCount: 1 }],
  slots = () => [slot],
}: Scenario) {
  vi.stubGlobal('fetch', async (request: Request) => {
    const { pathname, searchParams } = new URL(request.url)
    if (pathname === '/api/meeting-types') return Response.json([meetingType])
    if (pathname === `/api/meeting-types/${meetingType.id}/availability`)
      return Response.json(days())
    if (pathname === `/api/meeting-types/${meetingType.id}/slots`)
      return Response.json(slots(searchParams.get('date')))
    if (request.method === 'POST' && pathname === '/api/bookings') return book(await request.json())
    throw new Error('Неизвестный запрос')
  })
  window.history.replaceState(null, '', '/book')
  render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: meetingType.name }))
  fireEvent.click(await screen.findByRole('button', { name: /11 ноября/ }))
  fireEvent.click(await screen.findByRole('button', { name: /09:30–10:00 МСК.*Свободно/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
  fireEvent.change(name(), { target: { value: 'Анна' } })
  fireEvent.change(email(), { target: { value: 'anna@example.org' } })
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.unstubAllGlobals()
})

test.each([
  ['guestName', 'Уточните имя', 'Анна Ли'],
  ['guestEmail', 'Уточните email', 'anna+work@example.org'],
] as const)(
  'гость исправляет указанное сервером поле %s и подтверждает тот же слот',
  async (field, message, corrected) => {
    await openConfirmation({
      book(input) {
        if (input[field] !== corrected)
          return Response.json({ code: 'INVALID_INPUT', field, message }, { status: 400 })
        if (input.startsAt !== slot.startsAt || input.meetingTypeId !== meetingType.id)
          throw new Error('Изменилась выбранная встреча')
        return Response.json({}, { status: 201 })
      },
    })
    confirm()
    const invalidField = await screen.findByRole('textbox', { description: message })
    expect(invalidField).toBe(field === 'guestName' ? name() : email())
    expect(invalidField.getAttribute('aria-invalid')).toBe('true')
    expect(name().value).toBe('Анна')
    expect(email().value).toBe('anna@example.org')
    expect(screen.getByText(/11 ноября.*09:30–10:00 МСК/)).toBeDefined()
    fireEvent.change(invalidField, { target: { value: corrected } })
    confirm()
    expect(
      await screen.findByRole('heading', { name: 'Бронь подтверждена. До встречи!' }),
    ).toBeDefined()
  },
)

test('при конфликте гость видит обновлённые счётчик и слоты того же дня и подтверждает другое время с прежними контактами', async () => {
  let taken = false
  await openConfirmation({
    days: () => [{ date: '2026-11-11', freeCount: taken ? 1 : 2 }],
    slots: () => [{ ...slot, status: taken ? 'busy' : 'available' }, laterSlot],
    book(input) {
      if (input.startsAt === slot.startsAt) {
        taken = true
        return Response.json({ code: 'SLOT_TAKEN', message: 'Слот занят' }, { status: 409 })
      }
      if (
        input.startsAt === laterSlot.startsAt &&
        input.guestName === 'Анна' &&
        input.guestEmail === 'anna@example.org'
      )
        return Response.json({}, { status: 201 })
      throw new Error('Некорректная повторная запись')
    },
  })
  confirm()
  expect(await screen.findByText('Это время уже занято. Выберите другой слот')).toBeDefined()
  expect(screen.getByRole('heading', { name: meetingType.name })).toBeDefined()
  const date = await screen.findByRole('button', { name: /11 ноября.*Свободно 1/ })
  expect(date.getAttribute('aria-pressed')).toBe('true')
  const busy = await screen.findByRole<HTMLButtonElement>('button', {
    name: /09:30–10:00 МСК.*Занято/,
  })
  expect(busy.disabled).toBe(true)
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Продолжить' }).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: /10:00–10:30 МСК.*Свободно/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
  expect(name().value).toBe('Анна')
  expect(email().value).toBe('anna@example.org')
  confirm()
  expect(await screen.findByText('Бронь подтверждена. До встречи!')).toBeDefined()
})

test.each([
  ['в выбранный день', '2026-11-11'],
  ['после смены даты', '2026-11-12'],
])(
  'после устаревания старта гость выбирает новый слот %s и сохраняет контакты',
  async (_, freshDate) => {
    let expired = false
    const freshSlot = {
      startsAt: freshDate + 'T07:00:00Z',
      endsAt: freshDate + 'T07:30:00Z',
      status: 'available' as const,
    }
    await openConfirmation({
      days: () => [{ date: expired ? freshDate : '2026-11-11', freeCount: expired ? 1 : 2 }],
      slots(date) {
        if (!expired) return [slot, laterSlot]
        if (date === freshDate) return [freshSlot]
        throw new Error('День выпал из окна записи')
      },
      book(input) {
        if (input.startsAt === slot.startsAt) {
          expired = true
          return Response.json(
            { code: 'INVALID_START', message: 'Неверное время', field: 'startsAt' },
            { status: 400 },
          )
        }
        if (
          input.startsAt === freshSlot.startsAt &&
          input.guestName === 'Анна' &&
          input.guestEmail === 'anna@example.org'
        )
          return Response.json({}, { status: 201 })
        throw new Error('Некорректная повторная запись')
      },
    })
    confirm()
    expect(await screen.findByText('Это время уже недоступно')).toBeDefined()
    expect(screen.getByRole('heading', { name: meetingType.name })).toBeDefined()
    if (freshDate === '2026-11-12') {
      const newDay = await screen.findByRole('button', { name: /12 ноября.*Свободно 1/ })
      expect(newDay.getAttribute('aria-pressed')).toBe('false')
      expect(screen.queryByRole('button', { name: /11 ноября/ })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Продолжить' })).toBeNull()
      fireEvent.click(newDay)
    } else {
      const sameDay = await screen.findByRole('button', { name: /11 ноября.*Свободно 1/ })
      expect(sameDay.getAttribute('aria-pressed')).toBe('true')
    }
    const next = await screen.findByRole('button', { name: /10:00–10:30 МСК.*Свободно/ })
    expect(screen.queryByRole('button', { name: /09:30–10:00 МСК/ })).toBeNull()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Продолжить' }).disabled).toBe(
      true,
    )
    fireEvent.click(next)
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect(name().value).toBe('Анна')
    expect(email().value).toBe('anna@example.org')
    confirm()
    expect(await screen.findByText('Бронь подтверждена. До встречи!')).toBeDefined()
  },
)

test.each([
  [
    '400 SLOT_TAKEN',
    () => Response.json({ code: 'SLOT_TAKEN', message: 'Слот занят' }, { status: 400 }),
  ],
  [
    '409 INVALID_START',
    () => Response.json({ code: 'INVALID_START', message: 'Неверное время' }, { status: 409 }),
  ],
  [
    'сбой сети',
    () => {
      throw new TypeError('Failed to fetch')
    },
  ],
] as const)(
  'после ошибки «%s» гость повторяет подтверждение в заполненной форме',
  async (_, failure) => {
    let retried = false
    await openConfirmation({
      book() {
        if (retried) return Response.json({}, { status: 201 })
        retried = true
        return failure()
      },
    })
    confirm()
    expect((await screen.findByRole('alert')).textContent).toBe('Не удалось подтвердить запись')
    expect(screen.getByText(/11 ноября.*09:30–10:00 МСК/)).toBeDefined()
    expect(name().value).toBe('Анна')
    expect(email().value).toBe('anna@example.org')
    confirm()
    expect(await screen.findByText('Бронь подтверждена. До встречи!')).toBeDefined()
  },
)
