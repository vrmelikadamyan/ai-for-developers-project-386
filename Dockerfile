FROM node:24.22.2-bookworm-slim AS frontend
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json
RUN npm install --global pnpm@12.18.0 && pnpm --filter frontend install --frozen-lockfile
COPY frontend/ frontend/
RUN pnpm --filter frontend run build

FROM maven:3.10.0-eclipse-temurin-25 AS backend
WORKDIR /src/backend
COPY backend/.mvn/ .mvn/
COPY backend/pom.xml ./
COPY openapi/openapi.yaml ../openapi/openapi.yaml
COPY backend/src/main/ src/main/
COPY --from=frontend /src/frontend/dist/ src/main/resources/static/
RUN --mount=type=cache,target=/root/.m2/repository mvn -B -ntp -Dmaven.test.skip=true package

FROM eclipse-temurin:25-jre-noble
WORKDIR /app
RUN mkdir data && chown 10001:10001 data
COPY --from=backend /src/backend/target/calendar-*.jar /app/calendar.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/calendar.jar"]
