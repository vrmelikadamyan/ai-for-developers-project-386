package io.hexlet.calendar;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration(proxyBeanMethods = false)
public class FixedClockConfiguration {
  @Bean
  @Primary
  Clock fixedClock(@Value("${calendar.test-now:2026-11-10T07:00:00Z}") Instant now) {
    return Clock.fixed(now, ZoneOffset.UTC);
  }
}
