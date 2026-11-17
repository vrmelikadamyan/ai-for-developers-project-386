package io.hexlet.calendar.availability;

import io.hexlet.calendar.api.AvailabilityApi;
import io.hexlet.calendar.api.model.CalendarDay;
import io.hexlet.calendar.api.model.Slot;
import io.hexlet.calendar.api.model.SlotStatus;
import io.hexlet.calendar.system.InvalidInput;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AvailabilityController implements AvailabilityApi {
  private final Clock clock;
  private final JdbcClient db;

  public AvailabilityController(Clock clock, JdbcClient db) {
    this.clock = clock;
    this.db = db;
  }

  @Override
  public ResponseEntity<List<CalendarDay>> getAvailability(UUID id) {
    var window = new BookingWindow(clock.instant());
    var first = window.today();
    var end = first.plusDays(BookingWindow.DAYS);
    int minutes = duration(id);
    var bookings = occupied(first, end);
    var days =
        first
            .datesUntil(end)
            .map(date -> {
              var slots = slots(window, date, minutes, bookings);
              int free =
                  (int)
                      slots.stream()
                          .filter(slot -> slot.getStatus() == SlotStatus.AVAILABLE)
                          .count();
              return new CalendarDay(date, free);
            })
            .toList();
    return ResponseEntity.ok(days);
  }

  @Override
  public ResponseEntity<List<Slot>> getSlots(UUID id, LocalDate date) {
    var window = new BookingWindow(clock.instant());
    int minutes = duration(id);
    if (!window.contains(date)) throw new InvalidInput("date", "Дата вне окна записи");
    return ResponseEntity.ok(slots(window, date, minutes, occupied(date, date.plusDays(1))));
  }

  private int duration(UUID id) {
    return db.sql("SELECT duration_minutes FROM meeting_types WHERE id = ?")
        .param(id)
        .query(Integer.class)
        .optional()
        .orElseThrow(MeetingTypeNotFound::new);
  }

  private record Interval(Instant start, Instant end) {}

  private List<Interval> occupied(LocalDate from, LocalDate until) {
    return db.sql(
            """
            SELECT starts_at, ends_at FROM bookings
            WHERE starts_at < ? AND ends_at > ? ORDER BY starts_at
            """)
        .param(until.atStartOfDay(BookingWindow.MOSCOW).toOffsetDateTime())
        .param(from.atStartOfDay(BookingWindow.MOSCOW).toOffsetDateTime())
        .query((rs, row) ->
            new Interval(
                rs.getObject(1, OffsetDateTime.class).toInstant(),
                rs.getObject(2, OffsetDateTime.class).toInstant()))
        .list();
  }

  private static List<Slot> slots(
      BookingWindow window, LocalDate date, int minutes, List<Interval> bookings) {
    var result = new ArrayList<Slot>();
    int next = 0;
    for (var start : window.starts(date, minutes)) {
      Instant end = start.plus(minutes, ChronoUnit.MINUTES);
      while (next < bookings.size() && !bookings.get(next).end().isAfter(start)) next++;
      boolean busy = next < bookings.size() && bookings.get(next).start().isBefore(end);
      result.add(
          new Slot(
              start.atOffset(ZoneOffset.UTC),
              end.atOffset(ZoneOffset.UTC),
              busy ? SlotStatus.BUSY : SlotStatus.AVAILABLE));
    }
    return result;
  }
}
