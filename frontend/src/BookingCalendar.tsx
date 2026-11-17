import { Button, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { useCallback, useState } from 'react'

import { getAvailability, getSlots, type Slot } from './api'
import { formatDay, formatSlot } from './bookingTime'
import { RemoteList } from './RemoteList'

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
        <Stack align="flex-start" gap="xs">
          <Title order={3}>{formatDay(date)}</Title>
          {!slots.some((slot) => slot.status === 'available') && (
            <Text>На этот день свободного времени нет</Text>
          )}
          {slots.map((slot) => (
            <Button
              key={slot.startsAt}
              disabled={slot.status === 'busy'}
              aria-pressed={selected?.startsAt === slot.startsAt}
              variant={selected?.startsAt === slot.startsAt ? 'filled' : 'light'}
              onClick={() => setSelected(slot)}
            >
              {formatSlot(slot.startsAt, slot.endsAt)} ·{' '}
              {slot.status === 'busy' ? 'Занято' : 'Свободно'}
            </Button>
          ))}
          <Button disabled={!selected} onClick={() => selected && onContinue(selected)}>
            Продолжить
          </Button>
        </Stack>
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
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Stack align="flex-start" gap="xs">
            <Title order={3}>Выберите день</Title>
            {days.every((day) => (slotCounts[day.date] ?? day.freeCount) === 0) && (
              <Text>За ближайшие 14 дней свободного времени нет</Text>
            )}
            {days.map((day) => (
              <Button
                key={day.date}
                aria-pressed={date === day.date}
                variant={date === day.date ? 'filled' : 'light'}
                onClick={() => onDate(day.date)}
              >
                {formatDay(day.date)} · Свободно {slotCounts[day.date] ?? day.freeCount}
              </Button>
            ))}
          </Stack>
          {date && days.some((day) => day.date === date) && (
            <DaySlots
              key={date}
              typeId={typeId}
              date={date}
              onFreeCount={updateFreeCount}
              onContinue={onContinue}
            />
          )}
        </SimpleGrid>
      )}
    </RemoteList>
  )
}
