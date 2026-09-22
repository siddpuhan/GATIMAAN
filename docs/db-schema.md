# GATIMAAN Database Schema

This document details the PostgreSQL relational schema and Prisma 7 data models.

## Status

> [!NOTE]
> The database schema and entity relationship models will be fully defined and documented during **Phase 2 (Database Schema & Migrations)**.
> Do not invent speculative tables or models prior to Phase 2.

---

## Planned Data Domains

- **Users & Roles**: Admin, Counter Operator, Citizen identities.
- **Queues & Services**: Service types, queue configuration, operating hours, capacity.
- **Tokens & State History**: Token identifiers, lifecycle timestamps, status transitions.
- **Counters**: Counter definitions, active operator assignments, assigned services.
- **Hardware Gate Logs**: Gate scan records, validation events, actuator triggers.
- **Analytics & Snapshots**: Daily aggregated metrics, wait time logs for statistical prediction.
