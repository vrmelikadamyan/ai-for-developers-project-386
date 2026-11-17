import { Button, Stack, Text } from '@mantine/core'
import { useEffect, useState } from 'react'

import { listMeetingTypes, type MeetingType } from './api'

type ListState = { status: 'loading' | 'failed' } | { status: 'loaded'; types: MeetingType[] }

export function MeetingTypeList() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ListState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    listMeetingTypes({ signal: controller.signal, throwOnError: true })
      .then(({ data }) => {
        if (!controller.signal.aborted) setState({ status: 'loaded', types: data })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' })
      })
    return () => controller.abort()
  }, [attempt])

  if (state.status === 'failed') {
    return (
      <Stack align="flex-start" gap="xs">
        <Text role="alert">Не удалось загрузить типы встреч</Text>
        <Button
          variant="light"
          onClick={() => {
            setState({ status: 'loading' })
            setAttempt(attempt + 1)
          }}
        >
          Повторить
        </Button>
      </Stack>
    )
  }
  if (state.status === 'loaded') {
    if (!state.types.length) return <Text>Пока нет доступных типов встреч</Text>
    return (
      <ul>
        {state.types.map((type) => (
          <li key={type.id}>
            <Text fw={600}>{type.name}</Text>
            <Text>{type.durationMinutes} мин</Text>
            {type.description && <Text>{type.description}</Text>}
          </li>
        ))}
      </ul>
    )
  }
  return <Text role="status">Загрузка типов встреч…</Text>
}
