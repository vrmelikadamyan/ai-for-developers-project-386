import { Button, Text, Title } from '@mantine/core'
import { useState } from 'react'

import { type MeetingType, type Slot } from './api'
import { BookingCalendar } from './BookingCalendar'
import { formatDay, formatSlot } from './bookingTime'
import { MeetingTypeList } from './MeetingTypeList'

export function GuestBooking() {
  const [type, setType] = useState<MeetingType | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  if (!type) return <MeetingTypeList onSelect={setType} />

  if (slot && date)
    return (
      <>
        <Title order={2}>Подтверждение записи</Title>
        <Text>{type.name}</Text>
        <Text>
          {formatDay(date)}, {formatSlot(slot.startsAt, slot.endsAt)}
        </Text>
        <Button variant="light" onClick={() => setSlot(null)}>
          Выбрать другое время
        </Button>
      </>
    )

  return (
    <>
      <Title order={2}>{type.name}</Title>
      <Button
        variant="subtle"
        onClick={() => {
          setDate(null)
          setType(null)
        }}
      >
        Выбрать другой тип встречи
      </Button>
      <BookingCalendar typeId={type.id} date={date} onDate={setDate} onContinue={setSlot} />
    </>
  )
}
