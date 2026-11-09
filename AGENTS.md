# AGENTS.md

Call booking service (Hexlet project): one predefined owner publishes meeting types, guests book free slots without signing up. The user scenario and booking rules are in `README.md`.

## Commands

All tools and versions come from `mise.toml`; run everything through mise from the repo root.

- `mise run install` installs npm deps and the git hooks
- `mise run dev` starts backend (:8080) and frontend (:5173, proxies `/api` to :8080) as daemons; `mise daemons stop backend frontend`
- `mise run check` runs everything CI runs (lint, typecheck, test). It must stay green
- `mise run fix` applies formatters and safe lint fixes
- `mise run api:generate` regenerates `openapi/openapi.yaml` and the frontend SDK after editing `spec/`
- Single backend test: `cd backend && ./mvnw -B -q test -Dtest=SmokeTest#applicationStartsAndAnswersHealthCheck`
- Single frontend test: `pnpm --filter frontend exec vitest run src/App.test.tsx`

## Layout and contract flow

`spec/*.tsp` (TypeSpec) is the single source of truth for the HTTP API:

1. `tsp compile` writes `openapi/openapi.yaml`. It is committed, and CI fails if it differs from the compiled spec.
2. `openapi-generator` (Maven `generate-sources`) builds the Spring interfaces (`io.hexlet.calendar.api.*Api`) and DTOs from it. Controllers in `backend/` implement these interfaces.
3. `@hey-api/openapi-ts` (root `openapi-ts.config.ts`) builds the typed fetch SDK in `frontend/src/api/generated/`.

Change the API in `spec/` first, never in generated code: `backend/target/` and `frontend/src/api/generated/` are gitignored.

## Rules

- Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `ci:`). The hk `commit-msg` hook enforces it.
- Do not edit or rename `.github/workflows/hexlet-check.yml`; it belongs to Hexlet. Our CI is `.github/workflows/ci.yml`.
- Backend packages are `@NullMarked` (`package-info.java`), and NullAway fails the build on null misuse. Mark nullable values with `org.jspecify.annotations.Nullable`.
- The root package pins TypeScript 6 only for the SDK generator, because it needs the TS JS API that TS 7 lacks. The frontend uses TypeScript 7.
