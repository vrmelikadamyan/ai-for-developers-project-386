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
  @minLength(1)
  @maxLength(100)
  name: string;

  @maxLength(1000)
  description?: string;

  @minValue(1)
  @maxValue(540)
  durationMinutes: int32;
}

model MeetingType extends MeetingTypeInput {
  id: Id;
}

model ApiError {
  code: string;
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
    | {
        @statusCode statusCode: 400;
        @body body: ApiError;
      };
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

model NotFoundResponse {
  @statusCode statusCode: 404;
  @body body: ApiError;
}

model BadRequestResponse {
  @statusCode statusCode: 400;
  @body body: ApiError;
}

@route("/meeting-types/{id}")
@tag("availability")
interface Availability {
  @get
  @route("/availability")
  @operationId("getAvailability")
  dates(@path id: Id): CalendarDay[] | NotFoundResponse | BadRequestResponse;

  @get
  @route("/slots")
  @operationId("getSlots")
  slots(@path id: Id, @query date: plainDate):
    | Slot[]
    | NotFoundResponse
    | BadRequestResponse;
}

model BookingInput {
  meetingTypeId: Id;
  startsAt: utcDateTime;

  @minLength(1)
  @maxLength(100)
  guestName: string;

  @format("email")
  @maxLength(254)
  guestEmail: string;
}

model Booking extends BookingInput {
  id: Id;
  meetingTypeName: string;
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
    | BadRequestResponse
    | NotFoundResponse
    | {
        @statusCode statusCode: 409;
        @body body: ApiError;
      };
}
