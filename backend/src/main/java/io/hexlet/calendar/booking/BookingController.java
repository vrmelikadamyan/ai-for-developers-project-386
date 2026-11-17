package io.hexlet.calendar.booking;

import io.hexlet.calendar.api.BookingsApi;
import io.hexlet.calendar.api.model.Booking;
import io.hexlet.calendar.api.model.BookingInput;
import io.hexlet.calendar.availability.BookingWindow;
import io.hexlet.calendar.availability.MeetingTypeNotFound;
import io.hexlet.calendar.system.InvalidInput;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BookingController implements BookingsApi {
  private static final Pattern EMAIL =
      Pattern.compile("[^@\\s\\p{Z}\\uFEFF]+@[^@\\s\\p{Z}\\uFEFF]+");

  private final JdbcClient db;
  private final Clock clock;

  public BookingController(JdbcClient db, Clock clock) {
    this.db = db;
    this.clock = clock;
  }

  private record Type(String name, int minutes) {}

  @Override
  @Transactional
  public ResponseEntity<Booking> createBooking(BookingInput input) {
    var name = InvalidInput.text(input.getGuestName(), "guestName", 1, 100);
    var email = InvalidInput.text(input.getGuestEmail(), "guestEmail", 1, 254);
    if (!EMAIL.matcher(email).matches())
      throw new InvalidInput("guestEmail", "Введите корректный email");
    var id = input.getMeetingTypeId();
    if (id == null) throw new InvalidInput("meetingTypeId", "Выберите тип встречи");
    if (input.getStartsAt() == null) throw new InvalidInput("startsAt", "Выберите время");
    var type =
        db.sql("SELECT name, duration_minutes FROM meeting_types WHERE id = ?")
            .param(id)
            .query((rs, row) -> new Type(rs.getString("name"), rs.getInt("duration_minutes")))
            .optional()
            .orElseThrow(MeetingTypeNotFound::new);
    var start = input.getStartsAt().withOffsetSameInstant(ZoneOffset.UTC);
    db.sql("SELECT id FROM owner_calendar WHERE id = 1 FOR UPDATE").query(Integer.class).single();
    var now = clock.instant();
    var window = new BookingWindow(now);
    var date = start.atZoneSameInstant(BookingWindow.MOSCOW).toLocalDate();
    if (!window.starts(date, type.minutes()).contains(start.toInstant())) throw new InvalidStart();
    var end = start.plusMinutes(type.minutes());
    boolean overlaps =
        db.sql("SELECT EXISTS (SELECT 1 FROM bookings WHERE starts_at < ? AND ends_at > ?)")
            .params(end, start)
            .query(Boolean.class)
            .single();
    if (overlaps) throw new SlotTaken();
    var created = now.atOffset(ZoneOffset.UTC);
    var booking = new Booking(id, start, name, email, UUID.randomUUID(), type.name(), end, created);
    db.sql(
            """
            INSERT INTO bookings (id, meeting_type_id, starts_at, ends_at, guest_name, guest_email, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """)
        .params(booking.getId(), id, start, end, name, email, created)
        .update();
    return ResponseEntity.status(HttpStatus.CREATED).body(booking);
  }
}
