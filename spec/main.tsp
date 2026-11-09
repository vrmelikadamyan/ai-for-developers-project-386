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
