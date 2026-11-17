package io.hexlet.calendar.system;

import org.jspecify.annotations.Nullable;

public class InvalidInput extends RuntimeException {
  private final String field;

  public InvalidInput(String field, String message) {
    super(message);
    this.field = field;
  }

  public String field() {
    return field;
  }

  public static String text(@Nullable String value, String field, int minimum, int maximum) {
    String input = value == null ? "" : value;
    int start = 0;
    int end = input.length();
    while (start < end && isTrimSpace(input.charAt(start))) start++;
    while (end > start && isTrimSpace(input.charAt(end - 1))) end--;
    String normalized = input.substring(start, end);
    int length = normalized.codePointCount(0, normalized.length());
    if (length < minimum || length > maximum) {
      throw new InvalidInput(
          field, "Длина поля должна быть от " + minimum + " до " + maximum + " символов");
    }
    return normalized;
  }

  // Match the whitespace removed by String.trim() in the browser.
  private static boolean isTrimSpace(char c) {
    return Character.isSpaceChar(c) || (c >= '\t' && c <= '\r') || c == '\uFEFF';
  }
}
