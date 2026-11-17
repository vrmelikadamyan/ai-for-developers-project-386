import { Anchor, Container, Stack, Text, Title } from '@mantine/core'

import { OwnerBookings } from './OwnerBookings'
import { OwnerMeetingTypes } from './OwnerMeetingTypes'
import { GuestBooking } from './GuestBooking'

export default function App() {
  const path = window.location.pathname
  return (
    <Container component="main" size="sm" py="xl">
      <Stack align="flex-start">
        {path === '/owner/meeting-types' ? (
          <OwnerMeetingTypes />
        ) : path === '/owner/bookings/upcoming' ? (
          <OwnerBookings />
        ) : path === '/book' ? (
          <>
            <Title order={1}>Запись на звонок</Title>
            <GuestBooking />
            <Anchor href="/">На главную</Anchor>
          </>
        ) : (
          <>
            <Title order={1}>Календарь звонков</Title>
            <Text>Здесь можно записаться на звонок с владельцем календаря без регистрации</Text>
            <Anchor href="/book">Записаться</Anchor>
            <Anchor href="/owner/meeting-types">Типы встреч</Anchor>
            <Anchor href="/owner/bookings/upcoming">Предстоящие события</Anchor>
          </>
        )}
      </Stack>
    </Container>
  )
}
