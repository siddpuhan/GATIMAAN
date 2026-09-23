# AGENTS.md - AI Coding Agent Contract for GATIMAAN

This document is the **standing contract and mandatory guardrail set** for every AI coding agent working on the GATIMAAN codebase. Every agent must read, understand, and strictly follow these rules before executing any task.

---

## 1. System Architecture: Modular Monolith

GATIMAAN is built strictly as a **modular monolith**. Do not turn this project into microservices, distributed services, or complex service meshes.

```
React / Vite Web (@gatimaan/web)
        │
        ▼ (HTTP REST + Socket.IO)
Express API + Socket.IO (@gatimaan/api)
        │
        ▼ (SQL / Prisma Driver Adapter)
   PostgreSQL
        ▲
        │ (HTTPS POST)
ESP32 Gate Controller (firmware/gatimaan-gate)
```

- **Web Frontend**: React + Vite (SPA) with Tailwind CSS v4.
- **Backend**: Express API + Socket.IO server running as a single unified process.
- **Database**: PostgreSQL accessed via Prisma 7.
- **Hardware Integration**: ESP32 microcontroller communicating via standard HTTPS POST requests.
- **Shared Code**: `@gatimaan/shared` package for types, enums, interfaces, and schemas.

---

## 2. Core Architectural & Code Rules

1. **Routes never call Prisma directly**: Route handlers (controllers) validate request inputs and delegate to service layer methods.
2. **Services never access `req`/`res`**: Service layer methods accept pure TypeScript parameters and return data or throw typed application errors. They must be completely decoupled from HTTP transport.
3. **Business logic belongs in `service.ts`**: Never put business rules, queue state mutations, or calculations inside route handlers, middleware, or database scripts.
4. **Scope boundary discipline**: Do not edit files outside the paths explicitly specified in the assigned task.
5. **No unrelated refactoring**: Do not reformat, rename, restructure, or refactor existing code outside the direct scope of the task.
6. **Single source of truth for types**: Shared enums, types, interfaces, and validation schemas belong strictly in `packages/shared`.
7. **Never duplicate shared enums or types locally**: Always import them from `@gatimaan/shared`.
8. **In-process Event Bus for cross-module side effects**: When one domain needs to trigger an action in another domain (e.g., queue advancement notifying counter display or SMS service), publish an event over the in-process event bus rather than creating tightly coupled direct service-to-service imports.
9. **Tailwind CSS v4 CSS-based configuration**: Use the modern `@import "tailwindcss";` CSS-based theme configuration. Do not generate a Tailwind v3 `tailwind.config.js` file.
10. **Pure TypeScript prediction engine**: Queue wait-time and footfall prediction logic must be pure TypeScript statistical and rule-based calculations (`predictNextHourFootfall()`, `estimateWaitSeconds()`, `demandLevel()`, `recommendation()`).
11. **No ML/LLM dependencies in prediction**: Do not invoke external ML services, Python runtimes, or LLM APIs inside the prediction module.
12. **Prisma 7 rules (for database phase & beyond)**:
    - Driver adapter is required (`@prisma/adapter-pg` with `pg` pool).
    - Use modern `prisma-client` generator configuration.
    - Configuration resides in `prisma.config.ts`.
    - Run `prisma generate` after every migration.
    - Do NOT use legacy `$use` middleware; use Prisma Client extensions (`$extends`) if extensions are needed.
13. **Task Completion Verification**: Every completed task must run and pass:
    - `npm run lint`
    - `npm run typecheck`
    - `npm test`
      in all affected package(s) where those scripts exist.
14. **Documentation Synchronization**: Keep [docs/api-contract.md](file:///d:/GATIMAAN/docs/api-contract.md) and [docs/db-schema.md](file:///d:/GATIMAAN/docs/db-schema.md) up-to-date whenever an implemented phase introduces or alters API endpoints or database models.
15. **Git Discipline**: One focused, cleanly scoped Git commit per completed task is preferred.
16. **AI Agent modification boundaries**: AI agents must never modify unrelated files, configuration files, or other packages unless explicitly part of the assigned task.

---

## 3. Disallowed Architectural Patterns & Dependencies

Do NOT introduce any of the following:

- Next.js / NestJS / Fastify
- Supabase Auth / Supabase Realtime
- Custom hand-rolled JWT authentication (use Clerk as planned in Phase 4)
- Microservices, gRPC, or separate backend services
- Redis or MQTT (unless explicitly required in a future architectural revision)
- GraphQL or tRPC
- Kubernetes or complex orchestration
- External ML/LLM services for core queue prediction
- Native mobile applications (the citizen portal is a mobile-first responsive web app)

## Git Branching & Commit Rules

- `main` is the stable integration branch.
- Never implement a new phase directly on `main`.
- Before starting a phase, create and work exclusively on a dedicated branch:
  `phase-<number>-<short-name>`.
- All commits for that phase must remain on the phase branch.
- Never merge a phase branch into `main` automatically.
- Never force-push or rewrite shared branch history.
- At phase completion, run lint, typecheck, tests, build, and required manual verification.
- Push the phase branch only after verification.
- The human/project lead decides when the phase branch is merged into `main`.

## Command Execution & Development Workflow

### Safe command execution
- Prefer existing package scripts from package.json.
- Prefer:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - npm run dev
- Batch related read-only verification commands when practical.
- Avoid repeated ad-hoc `npx tsx --eval` commands when an existing script can perform the same check.
- Do not repeatedly rerun the same diagnostic after the result is already known unless the underlying state has changed.

### Secrets & Credentials
- NEVER place DATABASE_URL, database passwords, Clerk secrets, API keys, tokens, or other credentials directly inside shell commands.
- NEVER print secrets to terminal output.
- NEVER include credentials in generated code, logs, screenshots, commits, or documentation.
- Use existing environment variables from `.env` / `.env.local`.
- If a diagnostic requires a connection string, load it from the environment rather than constructing it inline.

### Destructive / Sensitive Operations
Always require explicit human approval before:
- database migrations
- destructive database operations
- deleting files
- changing production configuration
- changing authentication/security configuration
- git push
- creating/merging pull requests
- deployment

### Non-destructive development
For normal project inspection and verification, use existing project tooling and avoid unnecessary command prompts.