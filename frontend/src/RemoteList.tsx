import { Button, Stack, Text } from '@mantine/core'
import { type ReactNode, useEffect, useState } from 'react'

type State<T> = { status: 'loading' | 'failed' } | { status: 'loaded'; data: T[] }

interface Props<T> {
  request: (signal: AbortSignal) => Promise<{ data: T[] }>
  loading: string
  error: string
  children: (data: T[]) => ReactNode
}

export function RemoteList<T>({ request, loading, error, children }: Props<T>) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<State<T>>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    request(controller.signal)
      .then(({ data }) => {
        if (!controller.signal.aborted) setState({ status: 'loaded', data })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' })
      })
    return () => controller.abort()
  }, [attempt, request])

  if (state.status === 'failed') {
    return (
      <Stack className="remote-state" align="flex-start" gap="xs">
        <Text role="alert">{error}</Text>
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
  if (state.status === 'loaded') return children(state.data)
  return (
    <Text className="remote-state" role="status">
      {loading}
    </Text>
  )
}
