package io.hexlet.calendar.system;

import io.hexlet.calendar.api.model.ApiError;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import tools.jackson.core.JacksonException;

@RestControllerAdvice
public class ApiErrorHandler {
  @ExceptionHandler
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  ApiError invalidInput(InvalidInput error) {
    return new ApiError("INVALID_INPUT", error.getMessage()).field(error.field());
  }

  @ExceptionHandler
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  ApiError invalidJson(HttpMessageNotReadableException error) {
    @Nullable String field = null;
    if (error.getCause() instanceof JacksonException json && !json.getPath().isEmpty()) {
      field = json.getPath().getFirst().getPropertyName();
    }
    return new ApiError("INVALID_INPUT", "Проверьте формат запроса").field(field);
  }
}
