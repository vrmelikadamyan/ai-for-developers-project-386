package io.hexlet.calendar.system;

import java.beans.PropertyEditorSupport;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.time.temporal.ChronoField;
import java.util.Locale;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.InitBinder;

@ControllerAdvice
class ApiParameters {
  static final DateTimeFormatter DATE =
      new DateTimeFormatterBuilder()
          .appendValue(ChronoField.YEAR, 4)
          .appendPattern("-MM-dd")
          .toFormatter(Locale.ROOT)
          .withResolverStyle(ResolverStyle.STRICT);

  @InitBinder
  void bind(WebDataBinder binder) {
    binder.registerCustomEditor(UUID.class, editor(ApiParameters::uuid));
    binder.registerCustomEditor(LocalDate.class, editor(text -> LocalDate.parse(text, DATE)));
  }

  private static PropertyEditorSupport editor(Function<String, ?> parse) {
    return new PropertyEditorSupport() {
      @Override
      public void setAsText(String text) {
        try {
          setValue(parse.apply(text));
        } catch (DateTimeParseException invalid) {
          throw new IllegalArgumentException(invalid);
        }
      }
    };
  }

  static UUID uuid(String text) {
    var id = UUID.fromString(text);
    if (!id.toString().equalsIgnoreCase(text)) throw new IllegalArgumentException();
    return id;
  }
}
