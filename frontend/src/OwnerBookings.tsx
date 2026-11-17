import { CalendarDays, Clock3 } from 'lucide-react'

import { RemoteList } from './RemoteList'
import { listUpcomingBookings } from './api'
import { formatDay, formatSlot, timeZone } from './bookingTime'

function loadBookings(signal: AbortSignal) {
  return listUpcomingBookings({ signal, throwOnError: true })
}

const stamp = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone })

export function OwnerBookings() {
  return (
    <>
      <div className="page-title">
        <h1>Предстоящие события</h1>
        <p>Ближайшие звонки и контакты записавшихся гостей.</p>
      </div>
      <RemoteList
        request={loadBookings}
        loading="Загрузка записей…"
        error="Не удалось загрузить записи"
      >
        {(bookings) =>
          bookings.length ? (
            <ol className="agenda">
              {bookings.map((booking) => {
                const date = stamp.formatToParts(new Date(booking.startsAt))
                return (
                  <li key={booking.id}>
                    <div className="date-stamp" aria-hidden="true">
                      <span>{date.find((p) => p.type === 'month')?.value}</span>
                      <strong>{date.find((p) => p.type === 'day')?.value}</strong>
                    </div>
                    <div className="agenda-event">
                      <h2>{booking.meetingTypeName}</h2>
                      <p className="event-time">
                        <Clock3 />
                        {formatDay(booking.startsAt)},{' '}
                        {formatSlot(booking.startsAt, booking.endsAt)}
                      </p>
                    </div>
                    <div className="agenda-guest">
                      <strong>{booking.guestName}</strong>
                      <span>{booking.guestEmail}</span>
                      <small>Дата создания: {formatDay(booking.createdAt)}</small>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="empty-state">
              <span className="tile-icon peach">
                <CalendarDays />
              </span>
              <h3>Предстоящих событий нет</h3>
              <p>Здесь появится первая подтверждённая запись гостя.</p>
            </div>
          )
        }
      </RemoteList>
    </>
  )
}
