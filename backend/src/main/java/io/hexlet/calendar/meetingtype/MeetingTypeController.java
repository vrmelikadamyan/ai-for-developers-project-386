package io.hexlet.calendar.meetingtype;

import io.hexlet.calendar.api.MeetingTypesApi;
import io.hexlet.calendar.api.model.MeetingType;
import io.hexlet.calendar.api.model.MeetingTypeInput;
import io.hexlet.calendar.system.InvalidInput;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeetingTypeController implements MeetingTypesApi {
  private final JdbcClient db;

  public MeetingTypeController(JdbcClient db) {
    this.db = db;
  }

  @Override
  public ResponseEntity<MeetingType> createMeetingType(MeetingTypeInput input) {
    String name = InvalidInput.text(input.getName(), "name", 1, 100);
    Integer minutes = input.getDurationMinutes();
    if (minutes == null || minutes < 1 || minutes > 540) {
      throw new InvalidInput("durationMinutes", "Введите целое число минут от 1 до 540");
    }
    var type = new MeetingType(name, minutes, UUID.randomUUID());
    String description = input.getDescription();
    if (description != null) {
      type.setDescription(InvalidInput.text(description, "description", 0, 1000));
    }
    db.sql(
            "INSERT INTO meeting_types (id, name, description, duration_minutes) VALUES (?, ?, ?, ?)")
        .param(type.getId())
        .param(type.getName())
        .param(type.getDescription())
        .param(type.getDurationMinutes())
        .update();
    return ResponseEntity.status(HttpStatus.CREATED).body(type);
  }

  @Override
  public ResponseEntity<List<MeetingType>> listMeetingTypes() {
    return ResponseEntity.ok(
        db.sql(
                "SELECT id, name, description, duration_minutes FROM meeting_types ORDER BY name, id")
            .query((rs, row) ->
                new MeetingType(
                        rs.getString("name"),
                        rs.getInt("duration_minutes"),
                        rs.getObject("id", UUID.class))
                    .description(rs.getString("description")))
            .list());
  }
}
