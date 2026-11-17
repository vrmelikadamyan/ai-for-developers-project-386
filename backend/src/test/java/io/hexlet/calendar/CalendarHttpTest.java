package io.hexlet.calendar;

import io.hexlet.calendar.api.model.MeetingType;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

abstract class CalendarHttpTest {
  @TempDir Path directory;

  ConfigurableApplicationContext start(String... properties) {
    var args =
        new ArrayList<>(
            List.of(
                "--server.port=0",
                "--spring.datasource.url=jdbc:h2:file:" + directory.resolve("calendar")));
    args.addAll(List.of(properties));
    return new SpringApplicationBuilder(CalendarApplication.class, FixedClockConfiguration.class)
        .run(args.toArray(String[]::new));
  }

  RestTestClient http(ConfigurableApplicationContext app) {
    return RestTestClient.bindToServer()
        .baseUrl(
            "http://localhost:" + app.getEnvironment().getRequiredProperty("local.server.port"))
        .build();
  }

  UUID publish(RestTestClient http, int minutes) {
    return publish(http, minutes, "Знакомство", "Короткий звонок");
  }

  UUID publish(RestTestClient http, int minutes, String name, String description) {
    return Objects.requireNonNull(
            http.post()
                .uri("/api/meeting-types")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", name, "description", description, "durationMinutes", minutes))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody(MeetingType.class)
                .returnResult()
                .getResponseBody())
        .getId();
  }
}
