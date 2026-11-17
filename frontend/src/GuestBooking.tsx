import { ArrowLeft, CalendarCheck2, Check, Clock3 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { type MeetingType, type Slot } from './api'
import { BookingCalendar } from './BookingCalendar'
import { BookingForm } from './BookingForm'
import { formatDay, formatSlot } from './bookingTime'
import { MeetingTypeList } from './MeetingTypeList'

const steps = ['Тип встречи', 'Дата и время', 'Контакты']

export function GuestBooking() {
  const [type, setType] = useState<MeetingType | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [contact, setContact] = useState({ guestName: '', guestEmail: '' })
  const [notice, setNotice] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const step = confirmed ? 3 : slot ? 2 : type ? 1 : 0
  const stageTitle = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(step)
  useEffect(() => {
    if (previousStep.current !== step) stageTitle.current?.focus()
    previousStep.current = step
  }, [step])

  const when = date && slot ? `${formatDay(date)}, ${formatSlot(slot.startsAt, slot.endsAt)}` : ''
  return (
    <>
      <div className="page-title">
        <h1>Запись на звонок</h1>
      </div>
      <div className="steps" aria-label="Этапы записи" role="group">
        {steps.map((label, index) => (
          <span
            key={label}
            data-done={index < step}
            aria-current={index === step ? 'step' : undefined}
          >
            <i>{index < step ? <Check size={13} /> : index + 1}</i>
            {label}
          </span>
        ))}
      </div>
      {confirmed && type ? (
        <section className="panel success-panel">
          <span className="success-icon">
            <CalendarCheck2 size={33} />
          </span>
          <h2 tabIndex={-1} ref={stageTitle}>
            Бронь подтверждена. До встречи!
          </h2>
          <div className="receipt">
            <strong>{type.name}</strong>
            <p>{when}</p>
          </div>
          <button
            className="action primary"
            onClick={() => {
              setConfirmed(false)
              setType(null)
              setDate(null)
              setSlot(null)
              setNotice('')
              setContact({ guestName: '', guestEmail: '' })
            }}
          >
            Забронировать ещё
          </button>
        </section>
      ) : !type ? (
        <section>
          <div className="section-intro">
            <h2 tabIndex={-1} ref={stageTitle}>
              Выберите тип встречи
            </h2>
            <p>
              У каждого формата своя длительность. Выберите подходящий, чтобы посмотреть свободное
              время.
            </p>
          </div>
          <MeetingTypeList onSelect={setType} />
        </section>
      ) : slot && date ? (
        <section className="panel contact-panel">
          <aside className="summary">
            <span className="tile-icon lilac">
              <CalendarCheck2 />
            </span>
            <h3>{type.name}</h3>
            <span className="duration">
              <Clock3 />
              {type.durationMinutes} мин
            </span>
            <p>{when}</p>
          </aside>
          <div className="contact-fields">
            <h2 tabIndex={-1} ref={stageTitle}>
              Подтверждение записи
            </h2>
            <p className="muted">Укажите, как к вам обращаться и куда написать.</p>
            <BookingForm
              typeId={type.id}
              startsAt={slot.startsAt}
              onConfirmed={() => setConfirmed(true)}
              contact={contact}
              onContactChange={setContact}
              onBack={(message = '') => {
                setNotice(message)
                setSlot(null)
              }}
            />
          </div>
        </section>
      ) : (
        <section className="panel booking-sheet">
          <header className="sheet-header">
            <div>
              <span className="duration">
                <Clock3 />
                {type.durationMinutes} мин
              </span>
              <h2 tabIndex={-1} ref={stageTitle}>
                {type.name}
              </h2>
              {type.description && <p>{type.description}</p>}
            </div>
            <button
              className="text-action"
              onClick={() => {
                setNotice('')
                setDate(null)
                setType(null)
              }}
            >
              <ArrowLeft size={16} />
              Выбрать другой тип встречи
            </button>
          </header>
          {notice && (
            <p className="notice" role="alert">
              {notice}
            </p>
          )}
          <BookingCalendar typeId={type.id} date={date} onDate={setDate} onContinue={setSlot} />
        </section>
      )}
    </>
  )
}
