import { Button, Text } from '@mantine/core'

import { listMeetingTypes, type MeetingType } from './api'
import { RemoteList } from './RemoteList'

function loadTypes(signal: AbortSignal) {
  return listMeetingTypes({ signal, throwOnError: true })
}

export function MeetingTypeList({ onSelect }: { onSelect?: (type: MeetingType) => void }) {
  return (
    <RemoteList
      request={loadTypes}
      loading="Загрузка типов встреч…"
      error="Не удалось загрузить типы встреч"
    >
      {(types) =>
        !types.length ? (
          <Text>Пока нет доступных типов встреч</Text>
        ) : (
          <ul>
            {types.map((type) => (
              <li key={type.id}>
                {onSelect ? (
                  <Button variant="light" onClick={() => onSelect(type)}>
                    {type.name}
                  </Button>
                ) : (
                  <Text fw={600}>{type.name}</Text>
                )}
                <Text>{type.durationMinutes} мин</Text>
                {type.description && <Text>{type.description}</Text>}
              </li>
            ))}
          </ul>
        )
      }
    </RemoteList>
  )
}
