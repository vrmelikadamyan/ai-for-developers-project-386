package io.hexlet.calendar.system;

import com.fasterxml.jackson.annotation.Nulls;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.deser.std.FromStringDeserializer;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.type.LogicalType;

@Configuration
class JsonConfiguration {
  // The JSON contract uses UUID text and RFC 3339 timestamps. Jackson also accepts
  // binary UUIDs and numeric timestamps by default.
  @Bean
  SimpleModule apiScalars() {
    return new SimpleModule()
        .addDeserializer(
            UUID.class,
            fromString(
                UUID.class,
                text -> {
                  var id = UUID.fromString(text);
                  if (!id.toString().equalsIgnoreCase(text)) throw new IllegalArgumentException();
                  return id;
                }))
        .addDeserializer(
            OffsetDateTime.class,
            fromString(OffsetDateTime.class, text -> Instant.parse(text).atOffset(ZoneOffset.UTC)));
  }

  private static <T> FromStringDeserializer<T> fromString(
      Class<T> type, Function<String, T> parse) {
    return new FromStringDeserializer<>(type) {
      @Override
      protected T _deserialize(String value, DeserializationContext context) {
        try {
          return parse.apply(value);
        } catch (IllegalArgumentException | DateTimeException invalid) {
          throw context.weirdStringException(value, type, "Некорректный формат");
        }
      }
    };
  }

  @Bean
  JsonMapperBuilderCustomizer strictJsonTypes() {
    return builder ->
        builder
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .changeDefaultNullHandling(previous -> previous.withValueNulls(Nulls.FAIL))
            .withCoercionConfig(
                LogicalType.Textual,
                config ->
                    config
                        .setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
                        .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
                        .setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail));
  }
}
