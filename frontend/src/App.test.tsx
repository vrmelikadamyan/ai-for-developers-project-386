import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import App from './App.tsx'

function openPage(path: string) {
  window.history.replaceState(null, '', path)
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

test('гость открывает страницу записи напрямую даже при недоступном API', () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  openPage('/book')

  expect(screen.getByRole('heading', { level: 1, name: 'Запись на звонок' })).toBeDefined()
  expect(screen.getByText('Онлайн-запись пока недоступна')).toBeDefined()
  expect(screen.getByRole('link', { name: 'На главную' }).getAttribute('href')).toBe('/')
})
