const dayFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Moscow',
})

const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
})

export function formatDay(date: string) {
  return dayFormat.format(new Date(date))
}

export function formatSlot(startsAt: string, endsAt: string) {
  return `${timeFormat.format(new Date(startsAt))}–${timeFormat.format(new Date(endsAt))} МСК`
}
