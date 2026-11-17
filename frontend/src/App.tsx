import { ArrowRight, CalendarDays, CalendarRange, Globe2, LayoutGrid } from 'lucide-react'

import { OwnerBookings } from './OwnerBookings'
import { OwnerMeetingTypes } from './OwnerMeetingTypes'
import { GuestBooking } from './GuestBooking'
import { DeskCalendar } from './DeskCalendar'

function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <h1>Календарь звонков</h1>
          <p>Здесь можно записаться на звонок с владельцем календаря без регистрации</p>
          <a className="action primary" href="/book">
            Записаться <ArrowRight size={19} />
          </a>
          <div className="hero-meta">
            <span>
              <CalendarDays />
              Ближайшие 14 дней
            </span>
            <span>
              <Globe2 />
              Время по Москве
            </span>
          </div>
        </div>
        <DeskCalendar />
      </section>
      <section className="home-owner" aria-labelledby="owner-title">
        <h2 id="owner-title">Для владельца</h2>
        <div className="owner-links">
          <a href="/owner/meeting-types" aria-labelledby="types-link">
            <span className="tile-icon lilac">
              <LayoutGrid />
            </span>
            <span>
              <strong id="types-link">Типы встреч</strong>
              <small>Создавайте форматы звонков для записи</small>
            </span>
            <ArrowRight className="link-arrow" />
          </a>
          <a href="/owner/bookings/upcoming" aria-labelledby="events-link">
            <span className="tile-icon peach">
              <CalendarRange />
            </span>
            <span>
              <strong id="events-link">Предстоящие события</strong>
              <small>Смотрите расписание и контакты гостей</small>
            </span>
            <ArrowRight className="link-arrow" />
          </a>
        </div>
      </section>
    </>
  )
}

export default function App() {
  const path = window.location.pathname
  const isTypes = path === '/owner/meeting-types'
  const isEvents = path === '/owner/bookings/upcoming'
  const isBooking = path === '/book'
  const isHome = !isBooking && !isTypes && !isEvents
  return (
    <>
      <a className="skip-link" href="#content">
        К содержимому
      </a>
      <header className="app-header">
        <div className="frame header-inner">
          <a className="brand" href="/" aria-label="На главную">
            <span className="brand-mark">
              <CalendarDays size={23} />
            </span>
            Созвон
          </a>
          <nav className="main-nav" aria-label="Основная навигация">
            <a href="/" aria-current={isHome ? 'page' : undefined}>
              Главная
            </a>
            <a href="/book" aria-current={isBooking ? 'page' : undefined}>
              Запись
            </a>
            <a
              href="/owner/meeting-types"
              aria-current={isTypes ? 'page' : isEvents ? 'location' : undefined}
            >
              Владельцу
            </a>
          </nav>
        </div>
      </header>
      <main id="content" className="frame main-frame">
        {(isTypes || isEvents) && (
          <nav className="owner-nav" aria-label="Раздел владельца">
            <a href="/owner/meeting-types" aria-current={isTypes ? 'page' : undefined}>
              <LayoutGrid />
              Типы встреч
            </a>
            <a href="/owner/bookings/upcoming" aria-current={isEvents ? 'page' : undefined}>
              <CalendarRange />
              Предстоящие события
            </a>
          </nav>
        )}
        {isTypes ? (
          <OwnerMeetingTypes />
        ) : isEvents ? (
          <OwnerBookings />
        ) : isBooking ? (
          <GuestBooking />
        ) : (
          <Home />
        )}
      </main>
    </>
  )
}
