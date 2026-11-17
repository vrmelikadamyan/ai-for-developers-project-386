import { ArrowRight, Clock3, MousePointer2 } from 'lucide-react'
import { useCallback, useState } from 'react'

import { getAvailability, getSlots, type CalendarDay, type Slot } from './api'
import { formatDay, formatInterval, formatMonth, formatSlot } from './bookingTime'
import { RemoteList } from './RemoteList'

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function monthsInWindow(days: CalendarDay[]) {
  const months = new Map<string, CalendarDay[]>()
  for (const day of days) {
    const month = day.date.slice(0, 7)
    const entries = months.get(month)
    if (entries) entries.push(day)
    else months.set(month, [day])
  }
  return Array.from(months)
}

interface SlotProps {
  typeId: string
  date: string
  onFreeCount: (date: string, count: number) => void
  onContinue: (slot: Slot) => void
}

function DaySlots({ typeId, date, onFreeCount, onContinue }: SlotProps) {
  const [selected, setSelected] = useState<Slot | null>(null)
  const load = useCallback(
    async (signal: AbortSignal) => {
      const result = await getSlots({
        path: { id: typeId },
        query: { date },
        signal,
        throwOnError: true,
      })
      if (!signal.aborted)
        onFreeCount(date, result.data.filter((slot) => slot.status === 'available').length)
      return result
    },
    [date, typeId, onFreeCount],
  )
  return (
    <RemoteList request={load} loading="Загрузка слотов…" error="Не удалось загрузить слоты">
      {(slots) => (
        <>
          <h3>{formatDay(date)}</h3>
          <p className="zone">
            <Clock3 size={15} />
            Московское время (МСК)
          </p>
          {!slots.some((slot) => slot.status === 'available') && (
            <p>На этот день свободного времени нет</p>
          )}
          <div className="slot-grid">
            {slots.map((slot) => {
              const busy = slot.status === 'busy'
              const status = busy ? 'Занято' : 'Свободно'
              return (
                <button
                  className="slot"
                  key={slot.startsAt}
                  disabled={busy}
                  aria-pressed={selected?.startsAt === slot.startsAt}
                  aria-label={`${formatSlot(slot.startsAt, slot.endsAt)} · ${status}`}
                  onClick={() => setSelected(slot)}
                >
                  <strong>{formatInterval(slot.startsAt, slot.endsAt)}</strong>
                  <small>{status}</small>
                </button>
              )
            })}
          </div>
          <button
            className="action primary"
            disabled={!selected}
            onClick={() => selected && onContinue(selected)}
          >
            Продолжить <ArrowRight size={17} />
          </button>
        </>
      )}
    </RemoteList>
  )
}

interface CalendarProps {
  typeId: string
  date: string | null
  onDate: (date: string) => void
  onContinue: (slot: Slot) => void
}

export function BookingCalendar({ typeId, date, onDate, onContinue }: CalendarProps) {
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({})
  const updateFreeCount = useCallback((day: string, count: number) => {
    setSlotCounts((previous) => ({ ...previous, [day]: count }))
  }, [])
  const load = useCallback(
    (signal: AbortSignal) => getAvailability({ path: { id: typeId }, signal, throwOnError: true }),
    [typeId],
  )
  return (
    <RemoteList request={load} loading="Загрузка календаря…" error="Не удалось загрузить календарь">
      {(days) => (
        <div className="calendar-layout">
          <div className="dates-pane">
            <h3>Выберите день</h3>
            {days.every((day) => (slotCounts[day.date] ?? day.freeCount) === 0) && (
              <p>За ближайшие 14 дней свободного времени нет</p>
            )}
            {monthsInWindow(days).map(([month, entries]) => (
              <div className="month" key={month}>
                <h4>{formatMonth(entries[0].date)}</h4>
                <div className="month-grid">
                  {weekdays.map((label) => (
                    <span className="weekday" key={label} aria-hidden="true">
                      {label}
                    </span>
                  ))}
                  {entries.map((day, index) => {
                    const count = slotCounts[day.date] ?? day.freeCount
                    const column = ((new Date(day.date).getUTCDay() + 6) % 7) + 1
                    return (
                      <button
                        className="day"
                        key={day.date}
                        data-full={count === 0}
                        style={index === 0 ? { gridColumnStart: column } : undefined}
                        aria-label={`${formatDay(day.date)} · Свободно ${count}`}
                        aria-pressed={date === day.date}
                        onClick={() => onDate(day.date)}
                      >
                        <strong>{Number(day.date.slice(-2))}</strong>
                        <small>{count}</small>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <p className="legend">
              <i />
              Число под датой — свободные интервалы
            </p>
          </div>
          <div className="times-pane">
            {date && days.some((day) => day.date === date) ? (
              <DaySlots
                key={date}
                typeId={typeId}
                date={date}
                onFreeCount={updateFreeCount}
                onContinue={onContinue}
              />
            ) : (
              <div className="slot-hint">
                <span className="tile-icon lilac">
                  <MousePointer2 />
                </span>
                <h3>Время звонка</h3>
                <p>Выберите дату в календаре, чтобы увидеть свободные интервалы.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </RemoteList>
  )
}
