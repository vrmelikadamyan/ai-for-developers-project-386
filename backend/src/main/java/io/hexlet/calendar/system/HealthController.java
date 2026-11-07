package io.hexlet.calendar.system;

import io.hexlet.calendar.api.SystemApi;
import io.hexlet.calendar.api.model.Health;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController implements SystemApi {

  @Override
  public ResponseEntity<Health> getHealth() {
    return ResponseEntity.ok(new Health(Health.StatusEnum.OK));
  }
}
