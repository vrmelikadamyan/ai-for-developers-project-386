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
