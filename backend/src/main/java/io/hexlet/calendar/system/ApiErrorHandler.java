package io.hexlet.calendar.system;

import io.hexlet.calendar.api.model.ApiError;
import io.hexlet.calendar.api.model.ErrorCode;
import io.hexlet.calendar.availability.MeetingTypeNotFound;
import io.hexlet.calendar.booking.InvalidStart;
import io.hexlet.calendar.booking.SlotTaken;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import tools.jackson.core.JacksonException;

@RestControllerAdvice
public class ApiErrorHandler {
  @ExceptionHandler
  @ResponseStatus(HttpStatus.CONFLICT)
  ApiError slotTaken(SlotTaken error) {
    return new ApiError(ErrorCode.SLOT_TAKEN, "Слот занят");
  }

  @ExceptionHandler
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  ApiError invalidStart(InvalidStart error) {
    return new ApiError(ErrorCode.INVALID_START, "Это время уже недоступно").field("startsAt");
  }

  @ExceptionHandler
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  ApiError invalidParameter(MethodArgumentTypeMismatchException error) {
    return new ApiError(ErrorCode.INVALID_INPUT, "Проверьте формат параметра")
        .field(error.getName());
  }

  @ExceptionHandler
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  ApiError missingParameter(MissingServletRequestParameterException error) {
    return new ApiError(ErrorCode.INVALID_INPUT, "Обязательный параметр пропущен")
        .field(error.getParameterName());
  }

  @ExceptionHandler
  @ResponseStatus(HttpStatus.NOT_FOUND)
  ApiError meetingTypeNotFound(MeetingTypeNotFound error) {
    return new ApiError(ErrorCode.MEETING_TYPE_NOT_FOUND, "Тип встречи не найден");
  }

  @ExceptionHandler
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  ApiError invalidInput(InvalidInput error) {
    return new ApiError(ErrorCode.INVALID_INPUT, error.getMessage()).field(error.field());
  }

  @ExceptionHandler
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  ApiError invalidJson(HttpMessageNotReadableException error) {
    @Nullable String field = null;
    if (error.getCause() instanceof JacksonException json && !json.getPath().isEmpty()) {
      field = json.getPath().getFirst().getPropertyName();
    }
    return new ApiError(ErrorCode.INVALID_INPUT, "Проверьте формат запроса").field(field);
  }
}
