package io.hexlet.calendar.booking;

import io.hexlet.calendar.api.OwnerBookingsApi;
import io.hexlet.calendar.api.model.Booking;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OwnerBookingsController implements OwnerBookingsApi {
  private final JdbcClient db;
  private final Clock clock;

  public OwnerBookingsController(JdbcClient db, Clock clock) {
    this.db = db;
    this.clock = clock;
  }

  @Override
  public ResponseEntity<List<Booking>> listUpcomingBookings() {
    return ResponseEntity.ok(
        db.sql(
                """
                SELECT b.id, b.meeting_type_id, t.name AS meeting_type_name,
                       b.guest_name, b.guest_email, b.starts_at, b.ends_at, b.created_at
                FROM bookings b JOIN meeting_types t ON t.id = b.meeting_type_id
                WHERE b.starts_at > ?
                ORDER BY b.starts_at
                """)
            .param(clock.instant().atOffset(ZoneOffset.UTC))
            .query(Booking.class)
            .list());
  }
}
