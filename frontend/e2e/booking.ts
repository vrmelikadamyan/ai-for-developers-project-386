import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import test from 'node:test'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'

test(
  'a guest books a free slot and the owner sees their upcoming booking',
  { timeout: 60_000 },
  async (t) => {
    const apiOrigin = process.env.CALENDAR_API_ORIGIN
    assert.ok(apiOrigin, 'Run BookingBrowserTest to start the test backend')
    const vite = await createServer({
      server: { host: '127.0.0.1', port: 0, strictPort: true, proxy: { '/api': apiOrigin } },
    })
    t.after(() => vite.close())
    await vite.listen()
    const address = vite.httpServer?.address()
    assert.ok(address && typeof address !== 'string')
    const baseURL = `http://127.0.0.1:${address.port}`

    const browser = await chromium.launch()
    t.after(() => browser.close())
    const ownerSession = await browser.newContext({ baseURL, timezoneId: 'Pacific/Honolulu' })
    const guestSession = await browser.newContext({ baseURL, timezoneId: 'America/Los_Angeles' })
    const owner = await ownerSession.newPage()
    const guest = await guestSession.newPage()
    owner.setDefaultTimeout(10_000)
    guest.setDefaultTimeout(10_000)

    const marker = randomUUID()
    const meetingType = `Знакомство ${marker}`
    const description = 'Короткий созвон, чтобы познакомиться'
    const guestName = 'Анна Ли'
    const guestEmail = `anna+${marker}@example.org`

    await owner.goto('/')
    await owner.getByRole('link', { name: 'Типы встреч' }).click()
    await owner.getByRole('button', { name: 'Создать' }).click()
    await owner.getByLabel('Название').fill(meetingType)
    await owner.getByLabel('Описание').fill(description)
    await owner.getByLabel('Длительность в минутах').fill('30')
    await owner.getByRole('button', { name: 'Сохранить' }).click()
    const published = owner.getByRole('listitem').filter({ hasText: meetingType })
    await expect(published.getByText(meetingType, { exact: true })).toBeVisible()
    await expect(published.getByText(description, { exact: true })).toBeVisible()
    await expect(published.getByText('30 мин', { exact: true })).toBeVisible()

    await guest.goto('/')
    await guest.getByRole('link', { name: 'Записаться' }).click()
    await expect(guest).toHaveURL(`${baseURL}/book`)
    const chooseType = guest.getByRole('button', { name: meetingType, exact: true })
    await guest.reload()
    await expect(chooseType).toBeVisible()
    await guest.goBack()
    await expect(guest).toHaveURL(`${baseURL}/`)
    await guest.getByRole('link', { name: 'Записаться' }).click()
    await chooseType.click()
    const day = guest.getByRole('button', { name: /11 ноября/ })
    await expect(day).toHaveAccessibleName('11 ноября · Свободно 18')
    await day.click()
    const freeSlots = guest.getByRole('button', { name: /МСК · Свободно$/, disabled: false })
    await expect(freeSlots).toHaveCount(18)
    await guest.getByRole('button', { name: '09:30–10:00 МСК · Свободно' }).click()
    await guest.getByRole('button', { name: 'Продолжить' }).click()
    await guest.getByLabel('Имя').fill(guestName)
    await guest.getByLabel('Email').fill(guestEmail)
    await guest.getByRole('button', { name: 'Подтвердить запись' }).click()
    await expect(
      guest.getByRole('heading', { name: 'Бронь подтверждена. До встречи!' }),
    ).toBeVisible()

    await guest.getByRole('button', { name: 'Забронировать ещё' }).click()
    await chooseType.click()
    await expect(day).toHaveAccessibleName('11 ноября · Свободно 17')
    await day.click()
    await expect(freeSlots).toHaveCount(17)
    await expect(guest.getByRole('button', { name: '09:30–10:00 МСК · Занято' })).toBeDisabled()
    await expect(guest.getByRole('button', { name: '10:00–10:30 МСК · Свободно' })).toBeEnabled()

    await owner.getByRole('link', { name: 'Предстоящие события' }).click()
    const booking = owner.getByRole('listitem')
    await expect(booking).toHaveCount(1)
    for (const field of [
      meetingType,
      guestName,
      guestEmail,
      '11 ноября, 09:30–10:00 МСК',
      'Дата создания: 10 ноября',
    ]) {
      await expect(booking.getByText(field, { exact: true })).toBeVisible()
    }
  },
)
