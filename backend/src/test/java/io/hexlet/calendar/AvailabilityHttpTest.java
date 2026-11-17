package io.hexlet.calendar;

import java.util.List;
import org.junit.jupiter.api.Test;

class AvailabilityHttpTest extends CalendarHttpTest {
  @Test
  void availabilityIncludesExactlyFourteenMoscowDatesAndCountsFutureStarts() {
    try (var app = start()) {
      var http = http(app);
      var id = publish(http, 30);
      http.get()
          .uri("/api/meeting-types/{id}/availability", id)
          .exchange()
          .expectStatus()
          .isOk()
          .expectBody()
          .jsonPath("$.length()")
          .isEqualTo(14)
          .jsonPath("$[*].date")
          .isEqualTo(
              List.of(
                  "2026-11-10",
                  "2026-11-11",
                  "2026-11-12",
                  "2026-11-13",
                  "2026-11-14",
                  "2026-11-15",
                  "2026-11-16",
                  "2026-11-17",
                  "2026-11-18",
                  "2026-11-19",
                  "2026-11-20",
                  "2026-11-21",
                  "2026-11-22",
                  "2026-11-23"))
          .jsonPath("$[0].freeCount")
          .isEqualTo(15)
          .jsonPath("$[13].date")
          .isEqualTo("2026-11-23")
          .jsonPath("$[13].freeCount")
          .isEqualTo(18);
      var fullDay = publish(http, 540);
      http.get()
          .uri("/api/meeting-types/{id}/availability", fullDay)
          .exchange()
          .expectStatus()
          .isOk()
          .expectBody()
          .jsonPath("$[0].freeCount")
          .isEqualTo(0)
          .jsonPath("$[1].freeCount")
          .isEqualTo(1);
      http.get()
          .uri("/api/meeting-types/{id}/slots?date=2026-11-10", fullDay)
          .exchange()
          .expectStatus()
          .isOk()
          .expectBody()
          .json("[]");
    }
  }

  @Test
  void slotsShowOnlyFutureStartsOnTheDurationGridWithUtcTimes() {
    try (var app = start()) {
      var http = http(app);
      var id = publish(http, 45);
      String path = "/api/meeting-types/{id}/slots?date={date}";
      http.get()
          .uri(path, id, "2026-11-10")
          .exchange()
          .expectStatus()
          .isOk()
          .expectBody()
          .jsonPath("$.length()")
          .isEqualTo(10)
          .jsonPath("$[0].startsAt")
          .isEqualTo("2026-11-10T07:30:00Z");
      http.get()
          .uri(path, id, "2026-11-23")
          .exchange()
          .expectStatus()
          .isOk()
          .expectBody()
          .jsonPath("$.length()")
          .isEqualTo(12)
          .jsonPath("$[0].length()")
          .isEqualTo(3)
          .jsonPath("$[0].startsAt")
          .isEqualTo("2026-11-23T06:00:00Z")
          .jsonPath("$[0].endsAt")
          .isEqualTo("2026-11-23T06:45:00Z")
          .jsonPath("$[0].status")
          .isEqualTo("available")
          .jsonPath("$[1].startsAt")
          .isEqualTo("2026-11-23T06:45:00Z")
          .jsonPath("$[11].startsAt")
          .isEqualTo("2026-11-23T14:15:00Z")
          .jsonPath("$[11].endsAt")
          .isEqualTo("2026-11-23T15:00:00Z");
      for (var date : List.of("2026-11-09", "2026-11-24")) {
        http.get()
            .uri(path, id, date)
            .exchange()
            .expectStatus()
            .isBadRequest()
            .expectBody()
            .jsonPath("$.field")
            .isEqualTo("date");
      }
    }
  }

  @Test
  void invalidCalendarRequestsExposeTheErrorAndField() {
    try (var app = start()) {
      var http = http(app);
      var id = publish(http, 30);
      for (var invalidDate : List.of("2026-02-30", "2026-11-18Z", "2026-11-18+03:00")) {
        http.get()
            .uri("/api/meeting-types/{id}/slots?date={date}", id, invalidDate)
            .exchange()
            .expectStatus()
            .isBadRequest()
            .expectBody()
            .jsonPath("$.code")
            .isEqualTo("INVALID_INPUT")
            .jsonPath("$.field")
            .isEqualTo("date");
      }
      http.get()
          .uri("/api/meeting-types/{id}/slots", id)
          .exchange()
          .expectStatus()
          .isBadRequest()
          .expectBody()
          .jsonPath("$.field")
          .isEqualTo("date");
      for (var invalidId : List.of("oops", "1-1-1-1-1")) {
        http.get()
            .uri("/api/meeting-types/{id}/availability", invalidId)
            .exchange()
            .expectStatus()
            .isBadRequest()
            .expectBody()
            .jsonPath("$.code")
            .isEqualTo("INVALID_INPUT")
            .jsonPath("$.field")
            .isEqualTo("id");
      }
      http.get()
          .uri("/api/meeting-types/{id}/availability", java.util.UUID.randomUUID())
          .exchange()
          .expectStatus()
          .isNotFound()
          .expectBody()
          .jsonPath("$.code")
          .isEqualTo("MEETING_TYPE_NOT_FOUND");
    }
  }

  @Test
  void windowRollsOverAtMoscowMidnight() {
    try (var app = start("--calendar.test-now=2026-11-10T21:00:00Z")) {
      var http = http(app);
      var id = publish(http, 540);
      http.get()
          .uri("/api/meeting-types/{id}/availability", id)
          .exchange()
          .expectStatus()
          .isOk()
          .expectBody()
          .jsonPath("$[0].date")
          .isEqualTo("2026-11-11")
          .jsonPath("$[0].freeCount")
          .isEqualTo(1)
          .jsonPath("$[13].date")
          .isEqualTo("2026-11-24");
    }
  }
}
