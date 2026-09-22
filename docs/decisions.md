# Architecture Decision Records (ADR)

This log records all significant architectural, technological, and design decisions for GATIMAAN.

---

## ADR Index

- [ADR-0001: Monorepo Foundation with npm Workspaces & TypeScript](#adr-0001-monorepo-foundation-with-npm-workspaces--typescript)
- [ADR-0002: Modular Monolith vs Microservices](#adr-0002-modular-monolith-vs-microservices)
- [ADR-0003: Pure TypeScript Statistical & Rule-Based Prediction Engine](#adr-0003-pure-typescript-statistical--rule-based-prediction-engine)

---

### ADR-0001: Monorepo Foundation with npm Workspaces & TypeScript

- **Status**: Accepted
- **Date**: 2026-09-22 (Phase 0)
- **Context**: The project requires code sharing between backend services, frontend web apps, and data schemas while maintaining minimal operational overhead for hackathon delivery.
- **Decision**: Use native npm workspaces without external orchestrators (such as Nx or Turborepo). Monorepo structure contains `apps/api`, `apps/web`, and `packages/shared`, with TypeScript as the standard language.
- **Consequences**:
  - Positive: Zero configuration overhead, fast local installs, simple CI pipeline.
  - Negative: Workspace package references require project references / build ordering.

---

### ADR-0002: Modular Monolith vs Microservices

- **Status**: Accepted
- **Date**: 2026-09-22 (Phase 0)
- **Context**: Evaluating system topology between microservices and monolith architecture.
- **Decision**: Implement a Modular Monolith with Express API and Socket.IO running in a single Node process, using an in-process event bus for decoupled domain interactions.
- **Consequences**:
  - Positive: High velocity, single deployment target, atomic database transactions, no network serialization overhead between modules.
  - Negative: Modules share memory space in the single Node process.

---

### ADR-0003: Pure TypeScript Statistical & Rule-Based Prediction Engine

- **Status**: Accepted
- **Date**: 2026-09-22 (Phase 0)
- **Context**: Queue wait time and footfall estimations must be calculated efficiently without introducing external ML infrastructure, Python runtimes, or cloud LLM latency/costs.
- **Decision**: Implement all prediction and estimation logic (`predictNextHourFootfall()`, `estimateWaitSeconds()`, `demandLevel()`, `recommendation()`) in pure TypeScript statistical and rule-based calculations.
- **Consequences**:
  - Positive: Fast in-process calculation time, deterministic behavior, zero external API costs or external service failure modes.
  - Negative: Relies on structured statistical historical records and active counter state rather than complex non-deterministic black-box models.
