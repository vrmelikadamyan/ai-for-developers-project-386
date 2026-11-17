export const timeZone = 'Europe/Moscow'

const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone })
const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone })
const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone,
})

export function formatDay(date: string) {
  return dayFormat.format(new Date(date))
}

export function formatMonth(date: string) {
  return monthFormat.format(new Date(date))
}

export function formatInterval(startsAt: string, endsAt: string) {
  return `${timeFormat.format(new Date(startsAt))}–${timeFormat.format(new Date(endsAt))}`
}

export function formatSlot(startsAt: string, endsAt: string) {
  return `${formatInterval(startsAt, endsAt)} МСК`
}
