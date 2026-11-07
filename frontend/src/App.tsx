import { Badge, Container, Group, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'

import { getHealth } from './api/generated'

type ApiStatus = 'loading' | 'ok' | 'error'

const statusLabel: Record<ApiStatus, string> = {
  loading: 'проверяем…',
  ok: 'доступен',
  error: 'недоступен',
}

const statusColor: Record<ApiStatus, string> = {
  loading: 'gray',
  ok: 'green',
  error: 'red',
}

export default function App() {
  const [status, setStatus] = useState<ApiStatus>('loading')

  useEffect(() => {
    getHealth()
      .then(({ data }) => setStatus(data?.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Календарь звонков</Title>
      <Group mt="md" gap="xs">
        <Text>API:</Text>
        <Badge color={statusColor[status]}>{statusLabel[status]}</Badge>
      </Group>
    </Container>
  )
}
