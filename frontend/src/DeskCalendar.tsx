import { useEffect, useState } from 'react'
import { formatDay, timeZone } from './bookingTime'

const calendarFace = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  weekday: 'long',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone,
})
const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone })

export function DeskCalendar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(tick)
  }, [])
  const parts = calendarFace.formatToParts(now)
  const part = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find(({ type }) => type === name)?.value ?? ''
  const minute = Number(part('minute'))
  const hourAngle = Number(part('hour')) * 30 + minute / 2
  return (
    <div
      className="calendar-art"
      role="img"
      aria-label={`Сегодня по Москве ${formatDay(now.toISOString())}, ${part('weekday')}, ${part('hour')}:${part('minute')}`}
    >
      <div className="desk-scene" aria-hidden="true">
        <div className="desk-base" />
        <div className="tearoff">
          <span className="tearoff-rings" />
          <div className="tearoff-month">
            <span>{monthName.format(now)}</span>
            <span>{part('year')}</span>
          </div>
          <div className="tearoff-body">
            <strong>{part('day')}</strong>
            <span>{part('weekday')}</span>
          </div>
        </div>
        <div className="dial">
          <div className="dial-marks" />
          <i className="hand hour" style={{ transform: `rotate(${hourAngle}deg)` }} />
          <i className="hand minute" style={{ transform: `rotate(${minute * 6}deg)` }} />
        </div>
      </div>
    </div>
  )
}
