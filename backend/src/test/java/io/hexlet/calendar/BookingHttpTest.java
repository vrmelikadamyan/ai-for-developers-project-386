package io.hexlet.calendar;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class BookingHttpTest extends CalendarHttpTest {
  private static final String UPCOMING = "/api/owner/bookings/upcoming";
  private static final JsonMapper JSON = JsonMapper.builder().build();

  private RestTestClient.ResponseSpec book(
      RestTestClient http, UUID type, String at, String name, String email) {
    return post(
        http,
        Map.of("meetingTypeId", type, "startsAt", at, "guestName", name, "guestEmail", email));
  }

  private RestTestClient.ResponseSpec post(RestTestClient http, Object body) {
    return http.post()
        .uri("/api/bookings")
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .exchange();
  }

  @Test
  void confirmedBookingAndBothMeetingCalendarsSurviveServerRestart() {
    UUID halfHour;
    UUID longer;
    List<JsonNode> types;
    JsonNode booking;
    try (var app = start()) {
      var http = http(app);
      halfHour = publish(http, 30);
      longer = publish(http, 45, "Консультация", "Обсуждение проекта");
      types = getList(http, "/api/meeting-types");
      assertThat(types)
          .extracting(type -> type.get("id").asString())
          .containsExactlyInAnyOrder(halfHour.toString(), longer.toString());
      var bytes =
          book(
                  http,
                  halfHour,
                  "2026-11-11T09:30:00.000+03:00",
                  "  Анна-Мария Ли ",
                  " anna+work@example.org  ")
              .expectStatus()
              .isCreated()
              .expectBody()
              .jsonPath("$.meetingTypeId")
              .isEqualTo(halfHour.toString())
              .jsonPath("$.meetingTypeName")
              .isEqualTo("Знакомство")
              .jsonPath("$.startsAt")
              .isEqualTo("2026-11-11T06:30:00Z")
              .jsonPath("$.endsAt")
              .isEqualTo("2026-11-11T07:00:00Z")
              .jsonPath("$.createdAt")
              .isEqualTo("2026-11-10T07:00:00Z")
              .jsonPath("$.guestName")
              .isEqualTo("Анна-Мария Ли")
              .jsonPath("$.guestEmail")
              .isEqualTo("anna+work@example.org")
              .returnResult()
              .getResponseBody();
      booking = JSON.readTree(bytes);
      UUID.fromString(booking.get("id").asString());
      assertThat(getList(http, UPCOMING)).containsExactly(booking);
      assertOccupiedCalendars(http, halfHour, longer);
    }
    try (var restarted = start()) {
      var http = http(restarted);
      assertThat(getList(http, "/api/meeting-types")).isEqualTo(types);
      assertThat(getList(http, UPCOMING)).containsExactly(booking);
      assertOccupiedCalendars(http, halfHour, longer);
    }
  }

  @Test
  void confirmsOnlyFutureStartsOnTheGridInsideTheCurrentBookingWindow() {
    try (var app = start()) {
      var http = http(app);
      var type = publish(http, 30);
      for (var at :
          List.of(
              "2026-11-09T06:00:00Z",
              "2026-11-24T06:00:00Z",
              "2026-11-10T06:30:00Z",
              "2026-11-10T07:00:00Z",
              "2026-11-11T05:30:00Z",
              "2026-11-11T06:10:00Z",
              "2026-11-11T06:30:00.000000001Z",
              "2026-11-11T15:00:00Z")) {
        book(http, type, at, "Анна", "guest@example.org")
            .expectStatus()
            .isBadRequest()
            .expectBody()
            .jsonPath("$.code")
            .isEqualTo("INVALID_START")
            .jsonPath("$.field")
            .isEqualTo("startsAt")
            .jsonPath("$.message")
            .isNotEmpty();
      }
      for (var at :
          List.of(
              "2026-11-23T06:00:00Z",
              "2026-11-10T07:30:00Z",
              "2026-11-11T06:00:00Z",
              "2026-11-11T14:30:00Z")) {
        book(http, type, at, "Анна", "guest@example.org").expectStatus().isCreated();
      }
    }
  }

  @Test
  void invalidBookingInputIdentifiesTheFieldAndUnknownTypesAreNotFound() {
    try (var app = start()) {
      var http = http(app);
      var type = publish(http, 30);
      var start = "2026-11-11T06:30:00Z";
      var valid =
          Map.of(
              "meetingTypeId",
              type.toString(),
              "startsAt",
              start,
              "guestName",
              "Анна",
              "guestEmail",
              "anna+work@example.org");
      for (var field : valid.keySet()) {
        var missing = new HashMap<>(valid);
        missing.remove(field);
        assertInvalidField(post(http, missing), field);
      }
      for (String[] invalid :
          new String[][] {
            {"meetingTypeId", "AAAAAAAAAAAAAAAAAAAAAA=="},
            {"meetingTypeId", "not-a-uuid"},
            {"meetingTypeId", "1-1-1-1-1"},
            {"meetingTypeId", " " + type + " "},
            {"startsAt", "2026-02-30"},
            {"startsAt", "2026-11-10T24:00:00-06:00"},
            {"startsAt", "2026-11-11T06:30Z"},
            {"startsAt", "+02026-11-11T06:30:00Z"},
            {"startsAt", "2026-11-11T06:30:00+00:00:00"},
            {"startsAt", "2026-11-11T06:30:00.Z"},
            {"startsAt", " " + start + " "},
            {"guestName", "  "},
            {"guestName", "😀".repeat(101)},
            {"guestEmail", "  "},
            {"guestEmail", "a b@example.org"},
            {"guestEmail", "missing-at"},
            {"guestEmail", "guest@"},
            {"guestEmail", "anna@."},
            {"guestEmail", "anna@example..org"},
            {"guestEmail", "anna@-example.org"},
            {"guestEmail", "two@@example.org"},
            {"guestEmail", "a".repeat(243) + "@example.org"}
          }) {
        var body = new HashMap<>(valid);
        body.put(invalid[0], invalid[1]);
        assertInvalidField(post(http, body), invalid[0]);
      }
      var numericStart = new HashMap<String, Object>(valid);
      numericStart.put("startsAt", 1794378600);
      assertInvalidField(post(http, numericStart), "startsAt");
      post(http, "{")
          .expectStatus()
          .isBadRequest()
          .expectBody()
          .jsonPath("$.code")
          .isEqualTo("INVALID_INPUT")
          .jsonPath("$.message")
          .isNotEmpty();
      book(http, UUID.randomUUID(), start, "Анна", "anna@example.org")
          .expectStatus()
          .isNotFound()
          .expectBody()
          .jsonPath("$.code")
          .isEqualTo("MEETING_TYPE_NOT_FOUND")
          .jsonPath("$.message")
          .isNotEmpty();
      assertThat(getList(http, UPCOMING)).isEmpty();
      var name = "😀".repeat(100);
      var email = "a".repeat(242) + "@example.org";
      book(http, type, start, " " + name + " ", " " + email + " ")
          .expectStatus()
          .isCreated()
          .expectBody()
          .jsonPath("$.guestName")
          .isEqualTo(name)
          .jsonPath("$.guestEmail")
          .isEqualTo(email);
    }
  }

  private void assertInvalidField(RestTestClient.ResponseSpec response, String field) {
    response
        .expectStatus()
        .isBadRequest()
        .expectBody()
        .jsonPath("$.code")
        .isEqualTo("INVALID_INPUT")
        .jsonPath("$.field")
        .isEqualTo(field)
        .jsonPath("$.message")
        .isNotEmpty();
  }

  @Test
  void conflictingIntervalsAreRejectedAcrossMeetingTypesButTouchingIsAllowed() {
    try (var app = start()) {
      var http = http(app);
      var halfHour = publish(http, 30);
      var anotherHalfHour = publish(http, 30);
      var longer = publish(http, 45);
      book(http, halfHour, "2026-11-11T06:30:00Z", "Анна", "anna@example.org")
          .expectStatus()
          .isCreated();
      assertSlotTaken(
          book(http, anotherHalfHour, "2026-11-11T06:30:00Z", "Лев", "lev@example.org"));
      assertSlotTaken(book(http, longer, "2026-11-11T06:45:00Z", "Лев", "lev@example.org"));
      book(http, anotherHalfHour, "2026-11-11T07:00:00Z", "Лев", "lev@example.org")
          .expectStatus()
          .isCreated();
      book(http, anotherHalfHour, "2026-11-11T06:00:00Z", "Ия", "iya@example.org")
          .expectStatus()
          .isCreated();
    }
  }

  private void assertSlotTaken(RestTestClient.ResponseSpec response) {
    response
        .expectStatus()
        .isEqualTo(409)
        .expectBody()
        .jsonPath("$.code")
        .isEqualTo("SLOT_TAKEN")
        .jsonPath("$.message")
        .isEqualTo("Слот занят");
  }

  private record Attempt(String name, String email, int status, JsonNode body) {}

  private Attempt compete(
      CyclicBarrier ready, RestTestClient client, UUID type, String name, String email)
      throws Exception {
    ready.await(10, TimeUnit.SECONDS);
    var result =
        book(client, type, "2026-11-11T06:30:00Z", name, email).expectBody().returnResult();
    return new Attempt(
        name, email, result.getStatus().value(), JSON.readTree(result.getResponseBody()));
  }

  @Test
  void concurrentGuestsReceiveOneConfirmationAndBothMeetingCalendarsReflectTheWinner()
      throws Exception {
    try (var app = start();
        var pool = Executors.newFixedThreadPool(2)) {
      var http = http(app);
      var halfHour = publish(http, 30);
      var longer = publish(http, 45);
      var firstClient = http(app);
      var secondClient = http(app);
      var ready = new CyclicBarrier(2);
      var anna =
          pool.submit(() -> compete(ready, firstClient, halfHour, "Анна", "anna@example.org"));
      var lev = pool.submit(() -> compete(ready, secondClient, halfHour, "Лев", "lev@example.org"));
      var attempts = List.of(anna.get(15, TimeUnit.SECONDS), lev.get(15, TimeUnit.SECONDS));
      assertThat(attempts).extracting(Attempt::status).containsExactlyInAnyOrder(201, 409);
      var winner = attempts.stream().filter(a -> a.status() == 201).findFirst().orElseThrow();
      var conflict = attempts.stream().filter(a -> a.status() == 409).findFirst().orElseThrow();
      UUID.fromString(winner.body().get("id").asString());
      assertThat(winner.body().get("guestName").asString()).isEqualTo(winner.name());
      assertThat(winner.body().get("guestEmail").asString()).isEqualTo(winner.email());
      assertThat(conflict.body().get("code").asString()).isEqualTo("SLOT_TAKEN");
      assertThat(conflict.body().get("message").asString()).isEqualTo("Слот занят");
      assertThat(getList(http, UPCOMING)).containsExactly(winner.body());
      assertOccupiedCalendars(http, halfHour, longer);
    }
  }

  private List<JsonNode> getList(RestTestClient http, String path) {
    return List.of(
        Objects.requireNonNull(
            http.get()
                .uri(path)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(JsonNode[].class)
                .returnResult()
                .getResponseBody()));
  }

  @Test
  void ownerSeesAllTypesInStartOrderUntilTheMomentEachCallStarts() {
    JsonNode early;
    JsonNode later;
    try (var app = start("--calendar.test-now=2026-11-11T05:59:00Z")) {
      var http = http(app);
      var longer = publish(http, 45, "Консультация", "Обсуждение проекта");
      var halfHour = publish(http, 30);
      later =
          book(http, longer, "2026-11-11T06:45:00Z", "Лев", "lev@example.org")
              .expectStatus()
              .isCreated()
              .expectBody(JsonNode.class)
              .returnResult()
              .getResponseBody();
      early =
          book(http, halfHour, "2026-11-11T06:00:00Z", "Анна", "anna@example.org")
              .expectStatus()
              .isCreated()
              .expectBody(JsonNode.class)
              .returnResult()
              .getResponseBody();
      assertThat(getList(http, UPCOMING)).containsExactly(early, later);
    }
    // 09:00, 09:15 and 09:31 in Moscow. The 09:45 call remains upcoming.
    for (var now : List.of("06:00", "06:15", "06:31")) {
      try (var app = start("--calendar.test-now=2026-11-11T" + now + ":00Z")) {
        assertThat(getList(http(app), UPCOMING)).containsExactly(later);
      }
    }
  }

  private void assertOccupiedCalendars(RestTestClient http, UUID halfHour, UUID longer) {
    assertDay(http, halfHour, 18, 17, List.of("2026-11-11T06:30:00Z"));
    assertDay(http, longer, 12, 10, List.of("2026-11-11T06:00:00Z", "2026-11-11T06:45:00Z"));
  }

  private void assertDay(
      RestTestClient client, UUID type, int slots, int count, List<String> busy) {
    client
        .get()
        .uri("/api/meeting-types/{id}/availability", type)
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$[1].date")
        .isEqualTo("2026-11-11")
        .jsonPath("$[1].freeCount")
        .isEqualTo(count);
    client
        .get()
        .uri("/api/meeting-types/{id}/slots?date=2026-11-11", type)
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.length()")
        .isEqualTo(slots)
        .jsonPath("$[?(@.status == 'busy')].startsAt")
        .isEqualTo(busy)
        .jsonPath("$[*].guestName")
        .isEmpty()
        .jsonPath("$[*].guestEmail")
        .isEmpty();
  }
}
