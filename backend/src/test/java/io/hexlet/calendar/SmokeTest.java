package io.hexlet.calendar;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.test.web.servlet.client.RestTestClient;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class SmokeTest {

  @Autowired private RestTestClient client;

  @Test
  void applicationStartsAndAnswersHealthCheck() {
    client
        .get()
        .uri("/api/health")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.status")
        .isEqualTo("ok");
  }
}
