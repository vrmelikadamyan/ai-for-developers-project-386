import { CalendarDays, ChevronRight, Clock3 } from 'lucide-react'
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
          <div className="empty-state">
            <span className="tile-icon lilac">
              <CalendarDays />
            </span>
            <h3>Пока нет доступных типов встреч</h3>
            <p>
              {onSelect
                ? 'Загляните позже, когда владелец опубликует встречу.'
                : 'Создайте первый тип встречи, чтобы гости могли выбрать время.'}
            </p>
          </div>
        ) : (
          <ul className="type-list">
            {types.map((type) => (
              <li className="type-tile" key={type.id}>
                <span className="duration">
                  <Clock3 />
                  {type.durationMinutes} мин
                </span>
                <h3>
                  {onSelect ? (
                    <button className="tile-select" onClick={() => onSelect(type)}>
                      {type.name}
                    </button>
                  ) : (
                    type.name
                  )}
                </h3>
                {type.description && <p>{type.description}</p>}
                {onSelect && (
                  <span className="tile-go">
                    <ChevronRight size={18} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )
      }
    </RemoteList>
  )
}
