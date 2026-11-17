import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import App from './App.tsx'

function openPage(path: string) {
  window.history.replaceState(null, '', path)
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  )
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.unstubAllGlobals()
})

test('главная приглашает гостя записаться без регистрации и без обращения к API', () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  vi.stubGlobal('fetch', fetch)
  openPage('/')

  expect(screen.getByRole('heading', { level: 1, name: 'Календарь звонков' })).toBeDefined()
  expect(
    screen.getByText('Здесь можно записаться на звонок с владельцем календаря без регистрации'),
  ).toBeDefined()
  expect(screen.getByRole('link', { name: 'Записаться' }).getAttribute('href')).toBe('/book')
  expect(fetch).not.toHaveBeenCalled()
})

test('гость повторяет загрузку после ошибки и видит пустой список и путь на главную', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json([])),
  )
  openPage('/book')

  expect(screen.getByRole('heading', { level: 1, name: 'Запись на звонок' })).toBeDefined()
  expect(screen.getByRole('link', { name: 'На главную' }).getAttribute('href')).toBe('/')
  expect(await screen.findByText('Не удалось загрузить типы встреч')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
  expect(await screen.findByText('Пока нет доступных типов встреч')).toBeDefined()
})

test('владелец публикует тип, затем гость видит его на странице записи', async () => {
  let saved: { id: string; name: string; description: string; durationMinutes: number }[] = []
  vi.stubGlobal('fetch', async (request: Request) => {
    if (new URL(request.url).pathname !== '/api/meeting-types') throw new Error('Unknown path')
    if (request.method === 'POST') {
      const created = { id: 'ef43adba-262a-4f0b-a85d-52d3ee826104', ...(await request.json()) }
      saved = [created]
      return Response.json(created, { status: 201 })
    }
    return Response.json(saved)
  })
  const home = openPage('/')
  const path = screen.getByRole('link', { name: 'Типы встреч' }).getAttribute('href')!
  home.unmount()
  const owner = openPage(path)
  fireEvent.click(screen.getByRole('button', { name: 'Создать' }))
  fireEvent.change(screen.getByLabelText(/^Название/), { target: { value: ' Знакомство  ' } })
  fireEvent.change(screen.getByLabelText('Описание'), { target: { value: ' Короткий звонок   ' } })
  fireEvent.change(screen.getByLabelText(/^Длительность в минутах/), { target: { value: '30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
  expect(await screen.findByText('Знакомство')).toBeDefined()
  expect(saved[0]).toMatchObject({
    name: 'Знакомство',
    description: 'Короткий звонок',
    durationMinutes: 30,
  })
  owner.unmount()
  openPage('/book')
  expect(await screen.findByText('Знакомство')).toBeDefined()
  expect(screen.getByText('Короткий звонок')).toBeDefined()
  expect(screen.getByText('30 мин')).toBeDefined()
})

test('форма проверяет границы после удаления пробелов и позволяет исправить поля', async () => {
  vi.stubGlobal('fetch', async (request: Request) =>
    request.method === 'POST'
      ? Response.json(
          { ...(await request.json()), id: 'f3e75579-53e4-4ec4-a9c4-b6e1a62be22a' },
          { status: 201 },
        )
      : Response.json([]),
  )
  openPage('/owner/meeting-types')
  fireEvent.click(screen.getByRole('button', { name: 'Создать' }))
  const name = screen.getByLabelText(/^Название/)
  const description = screen.getByLabelText('Описание')
  const duration = screen.getByLabelText(/^Длительность в минутах/)
  const submit = screen.getByRole('button', { name: 'Сохранить' })
  const enter = (field: HTMLElement, value: string) =>
    fireEvent.change(field, { target: { value } })
  enter(name, '   ')
  enter(description, 'я'.repeat(1001))
  enter(duration, '1.5')
  fireEvent.click(submit)
  expect(await screen.findByText('Введите название длиной от 1 до 100 символов')).toBeDefined()
  expect(screen.getByText('Описание должно содержать до 1000 символов')).toBeDefined()
  expect(screen.getByText('Введите целое число минут от 1 до 540')).toBeDefined()
  enter(name, 'я'.repeat(101))
  enter(duration, '541')
  fireEvent.click(submit)
  expect(screen.getByText('Введите название длиной от 1 до 100 символов')).toBeDefined()
  expect(screen.getByText('Введите целое число минут от 1 до 540')).toBeDefined()
  enter(name, ' ' + '😀'.repeat(100) + ' ')
  enter(description, ' ' + 'я'.repeat(1000) + ' ')
  enter(duration, '540')
  fireEvent.click(submit)
  expect(await screen.findByRole('button', { name: 'Создать' })).toBeDefined()
})
