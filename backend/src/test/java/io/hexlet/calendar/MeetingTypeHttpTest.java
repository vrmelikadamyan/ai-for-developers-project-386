package io.hexlet.calendar;

import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

class MeetingTypeHttpTest {
  @TempDir Path directory;

  private ConfigurableApplicationContext start() {
    return new SpringApplicationBuilder(CalendarApplication.class)
        .run(
            "--server.port=0",
            "--spring.datasource.url=jdbc:h2:file:" + directory.resolve("calendar"));
  }

  private RestTestClient http(ConfigurableApplicationContext app) {
    return RestTestClient.bindToServer()
        .baseUrl(
            "http://localhost:" + app.getEnvironment().getRequiredProperty("local.server.port"))
        .build();
  }

  @Test
  void createdTypeRemainsAvailableToGuestsAfterRestart() {
    String id;
    try (var app = start()) {
      var published =
          http(app)
              .post()
              .uri("/api/meeting-types")
              .contentType(MediaType.APPLICATION_JSON)
              .body(
                  """
                  {"name":"  Знакомство  ","description":" Короткий звонок ","durationMinutes":30}
                  """)
              .exchange()
              .expectStatus()
              .isCreated()
              .expectBody()
              .jsonPath("$.name")
              .isEqualTo("Знакомство")
              .jsonPath("$.description")
              .isEqualTo("Короткий звонок")
              .jsonPath("$.durationMinutes")
              .isEqualTo(30)
              .returnResult()
              .getResponseBody();
      id =
          UUID.fromString(
                  tools.jackson.databind.json.JsonMapper.builder()
                      .build()
                      .readTree(published)
                      .get("id")
                      .asString())
              .toString();
    }
    try (var app = start()) {
      http(app)
          .get()
          .uri("/api/meeting-types")
          .exchange()
          .expectStatus()
          .isOk()
          .expectBody()
          .jsonPath("$.length()")
          .isEqualTo(1)
          .jsonPath("$[0].id")
          .isEqualTo(id)
          .jsonPath("$[0].name")
          .isEqualTo("Знакомство")
          .jsonPath("$[0].description")
          .isEqualTo("Короткий звонок")
          .jsonPath("$[0].durationMinutes")
          .isEqualTo(30);
    }
  }

  @Test
  void validatesTheNormalizedInputAndReportsTheOffendingField() {
    try (var app = start()) {
      var client = http(app);
      var path = "/api/meeting-types";
      var name = "😀".repeat(100);
      var desc = "а".repeat(1000);
      var atLimit =
          """
          {"name":"  %s  ","description":" %s ","durationMinutes":540}
          """
              .formatted(name, desc);
      client
          .post()
          .uri(path)
          .contentType(MediaType.APPLICATION_JSON)
          .body(atLimit)
          .exchange()
          .expectStatus()
          .isCreated()
          .expectBody()
          .jsonPath("$.name")
          .isEqualTo(name)
          .jsonPath("$.description")
          .isEqualTo(desc);
      client
          .post()
          .uri(path)
          .contentType(MediaType.APPLICATION_JSON)
          .body("{\"name\":\"A\",\"durationMinutes\":1}")
          .exchange()
          .expectStatus()
          .isCreated()
          .expectBody()
          .jsonPath("$.description")
          .doesNotHaveJsonPath();
      for (String[] example :
          new String[][] {
            {"name", "{\"durationMinutes\":1}"},
            {"name", "{\"name\":\"  \",\"durationMinutes\":1}"},
            {"name", "{\"name\":true,\"durationMinutes\":1}"},
            {"name", atLimit.replace(name, name + "а")},
            {"description", atLimit.replace(desc, desc + "а")},
            {"description", "{\"name\":\"A\",\"description\":null,\"durationMinutes\":1}"},
            {"durationMinutes", "{\"name\":\"A\"}"},
            {"durationMinutes", "{\"name\":\"A\",\"durationMinutes\":0}"},
            {"durationMinutes", "{\"name\":\"A\",\"durationMinutes\":541}"},
            {"durationMinutes", "{\"name\":\"A\",\"durationMinutes\":1.5}"},
            {"durationMinutes", "{\"name\":\"A\",\"durationMinutes\":\"30\"}"}
          }) {
        client
            .post()
            .uri(path)
            .contentType(MediaType.APPLICATION_JSON)
            .body(example[1])
            .exchange()
            .expectStatus()
            .isBadRequest()
            .expectBody()
            .jsonPath("$.code")
            .isEqualTo("INVALID_INPUT")
            .jsonPath("$.message")
            .isNotEmpty()
            .jsonPath("$.field")
            .isEqualTo(example[0]);
      }
      client
          .post()
          .uri(path)
          .contentType(MediaType.APPLICATION_JSON)
          .body("{")
          .exchange()
          .expectStatus()
          .isBadRequest()
          .expectBody()
          .jsonPath("$.code")
          .isEqualTo("INVALID_INPUT")
          .jsonPath("$.message")
          .isNotEmpty();
    }
  }
}
