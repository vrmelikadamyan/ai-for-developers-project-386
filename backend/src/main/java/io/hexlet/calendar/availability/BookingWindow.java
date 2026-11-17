package io.hexlet.calendar.availability;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

public record BookingWindow(Instant now) {
  public static final ZoneId MOSCOW = ZoneId.of("Europe/Moscow");
  static final int DAYS = 14;

  LocalDate today() {
    return LocalDate.ofInstant(now, MOSCOW);
  }

  public boolean contains(LocalDate date) {
    return !date.isBefore(today()) && date.isBefore(today().plusDays(DAYS));
  }

  public List<Instant> starts(LocalDate date, int minutes) {
    if (!contains(date)) return List.of();
    Instant opens = date.atTime(9, 0).atZone(MOSCOW).toInstant();
    Instant closes = date.atTime(18, 0).atZone(MOSCOW).toInstant();
    var starts = new ArrayList<Instant>();
    for (Instant start = opens;
        !start.plus(minutes, ChronoUnit.MINUTES).isAfter(closes);
        start = start.plus(minutes, ChronoUnit.MINUTES)) {
      if (start.isAfter(now)) starts.add(start);
    }
    return starts;
  }
}
