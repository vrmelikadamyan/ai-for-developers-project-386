import "@typespec/http";
import "@typespec/openapi";

using Http;
using OpenAPI;

@service(#{ title: "Calendar API" })
@info(#{ version: "0.1.0" })
@route("/api")
namespace CalendarApi;

model Health {
  status: "ok";
}

@route("/health")
@tag("system")
interface System {
  @get
  @operationId("getHealth")
  getHealth(): Health;
}

@format("uuid")
scalar Id extends string;

model MeetingTypeInput {
  /** Trim surrounding whitespace, then require 1–100 Unicode code points. */
  name: string;

  /** Trim surrounding whitespace, then allow up to 1000 Unicode code points. */
  description?: string;

  @minValue(1)
  @maxValue(540)
  durationMinutes: int32;
}

model MeetingType {
  @minLength(1)
  @maxLength(100)
  name: string;

  @maxLength(1000)
  description?: string;

  durationMinutes: MeetingTypeInput.durationMinutes;
  id: Id;
}

enum ErrorCode {
  INVALID_INPUT,
  INVALID_START,
  MEETING_TYPE_NOT_FOUND,
  SLOT_TAKEN,
}

model ApiError {
  code: ErrorCode;
  message: string;
  field?: string;
}

@route("/meeting-types")
@tag("meeting-types")
interface MeetingTypes {
  @get
  @operationId("listMeetingTypes")
  list(): MeetingType[];

  @post
  @operationId("createMeetingType")
  create(@body input: MeetingTypeInput):
    | {
        @statusCode statusCode: 201;
        @body body: MeetingType;
      }
    | InvalidInputResponse;
}

enum SlotStatus {
  available,
  busy,
}

model Slot {
  startsAt: utcDateTime;
  endsAt: utcDateTime;
  status: SlotStatus;
}

model CalendarDay {
  date: plainDate;
  freeCount: int32;
}

model ErrorResponse<Status extends int32, Code extends ErrorCode> {
  @statusCode statusCode: Status;
  @body body: {
    code: Code;
    ...OmitProperties<ApiError, "code">;
  };
}

alias NotFoundResponse = ErrorResponse<404, ErrorCode.MEETING_TYPE_NOT_FOUND>;
alias InvalidInputResponse = ErrorResponse<400, ErrorCode.INVALID_INPUT>;

@route("/meeting-types/{id}")
@tag("availability")
interface Availability {
  @get
  @route("/availability")
  @operationId("getAvailability")
  dates(@path id: Id): CalendarDay[] | NotFoundResponse | InvalidInputResponse;

  @get
  @route("/slots")
  @operationId("getSlots")
  slots(@path id: Id, @query date: plainDate):
    | Slot[]
    | NotFoundResponse
    | InvalidInputResponse;
}

model BookingInput {
  meetingTypeId: Id;

  /** A timestamp with seconds and an explicit UTC offset. Fractional seconds have up to nine digits. */
  startsAt: utcDateTime;

  /** Trim surrounding whitespace, then require 1–100 Unicode code points. */
  guestName: string;

  /** Trim surrounding whitespace, then require an email of at most 254 Unicode code points. */
  guestEmail: string;
}

model Booking {
  meetingTypeId: Id;
  startsAt: utcDateTime;

  @minLength(1)
  @maxLength(100)
  guestName: string;

  @format("email")
  @maxLength(254)
  guestEmail: string;

  id: Id;
  meetingTypeName: MeetingType.name;
  endsAt: utcDateTime;
  createdAt: utcDateTime;
}

@route("/bookings")
@tag("bookings")
interface Bookings {
  @post
  @operationId("createBooking")
  create(@body input: BookingInput):
    | {
        @statusCode statusCode: 201;
        @body body: Booking;
      }
    | InvalidInputResponse
    | {
        @statusCode statusCode: 400;
        @body body: {
          code: ErrorCode.INVALID_START;
          message: string;
          field: "startsAt";
        };
      }
    | NotFoundResponse
    | ErrorResponse<409, ErrorCode.SLOT_TAKEN>;
}

@route("/owner/bookings")
@tag("owner-bookings")
interface OwnerBookings {
  @get
  @route("/upcoming")
  @operationId("listUpcomingBookings")
  upcoming(): Booking[];
}
