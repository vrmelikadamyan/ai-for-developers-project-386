import { Anchor, Text, Title } from '@mantine/core'

import { RemoteList } from './RemoteList'
import { listUpcomingBookings } from './api'
import { formatDay, formatSlot } from './bookingTime'

function loadBookings(signal: AbortSignal) {
  return listUpcomingBookings({ signal, throwOnError: true })
}

export function OwnerBookings() {
  return (
    <>
      <Title order={1}>Предстоящие события</Title>
      <RemoteList
        request={loadBookings}
        loading="Загрузка записей…"
        error="Не удалось загрузить записи"
      >
        {(bookings) =>
          bookings.length ? (
            <ol>
              {bookings.map((booking) => (
                <li key={booking.id}>
                  <Text fw={600}>{booking.meetingTypeName}</Text>
                  <Text>
                    {formatDay(booking.startsAt)}, {formatSlot(booking.startsAt, booking.endsAt)}
                  </Text>
                  <Text>{booking.guestName}</Text>
                  <Text>{booking.guestEmail}</Text>
                  <Text>Дата создания: {formatDay(booking.createdAt)}</Text>
                </li>
              ))}
            </ol>
          ) : (
            <Text>Предстоящих событий нет</Text>
          )
        }
      </RemoteList>
      <Anchor href="/">На главную</Anchor>
    </>
  )
}
