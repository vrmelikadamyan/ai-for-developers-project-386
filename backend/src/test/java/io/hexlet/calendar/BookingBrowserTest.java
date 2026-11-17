package io.hexlet.calendar;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class BookingBrowserTest extends CalendarHttpTest {
  @Test
  void ownerSeesBookingMadeInSeparateGuestSession() throws Exception {
    try (var app = start("--server.address=127.0.0.1")) {
      var runner = new ProcessBuilder("node", "--test", "e2e/booking.ts");
      var port = app.getEnvironment().getRequiredProperty("local.server.port");
      runner.environment().put("CALENDAR_API_ORIGIN", "http://127.0.0.1:" + port);
      var log = directory.resolve("browser.log");
      var process =
          runner
              .directory(Path.of("../frontend").toFile())
              .redirectErrorStream(true)
              .redirectOutput(log.toFile())
              .start();
      try {
        var finished = process.waitFor(90, TimeUnit.SECONDS);
        var output = Files.readString(log);
        assertThat(finished).as("Browser test timed out%n%s", output).isTrue();
        assertThat(process.exitValue()).as("Browser test output%n%s", output).isZero();
      } finally {
        if (process.isAlive()) {
          var descendants = process.descendants().toList();
          descendants.forEach(ProcessHandle::destroyForcibly);
          process.destroyForcibly().waitFor(5, TimeUnit.SECONDS);
        }
      }
    }
  }
}
