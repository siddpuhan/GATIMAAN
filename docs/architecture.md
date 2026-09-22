# GATIMAAN Architecture Documentation

## Canonical Architecture Document

This is the canonical architecture document for **GATIMAAN** (IoT-enabled Smart Queue Management System for MP Online).

---

## 1. System Topology: Modular Monolith

GATIMAAN follows a clean modular monolith architecture designed for simplicity, performance, and low operational complexity:

```
+-------------------------------------------------------------+
|                      Client Layer                           |
|  - Citizen Mobile Web App (React + Vite + Tailwind v4)      |
|  - Operator Counter Dashboard (React + Vite + Tailwind v4)  |
|  - Admin & Analytics Portal (React + Vite + Tailwind v4)    |
+------------------------------+------------------------------+
                               |
                               | HTTP REST / WebSockets (Socket.IO)
                               v
+-------------------------------------------------------------+
|               Express API & Socket.IO Monolith              |
|  - Auth Middleware (Clerk Integration)                      |
|  - Queue Domain (Engine, State Machine, Token Lifecycle)    |
|  - Counter Domain (Operator Desk, Calling, Transfer)        |
|  - Prediction Module (Pure TypeScript Statistical / Rule)   |
|  - Hardware Gate Ingestion (ESP32 HTTPS endpoints)          |
|  - Notification Module (SMS / WhatsApp / Push Alerts)       |
|  - In-Process Event Bus (Domain Event Decoupling)           |
+------------------------------+------------------------------+
                               |
                               | SQL (Prisma 7 + Driver Adapter)
                               v
+-------------------------------------------------------------+
|             PostgreSQL Database (Supabase)                  |
+-------------------------------------------------------------+
                               ^
                               | HTTPS POST
+------------------------------+------------------------------+
|             ESP32 Hardware Gate Controller                  |
|  - QR Code / Barcode Scanner                                |
|  - Relay Barrier & LED Indicator                            |
+-------------------------------------------------------------+
```

---

## 2. Technology Stack Decisions

| Tier / Component  | Technology                       | Rationale                                                                                                                                                 |
| :---------------- | :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo**      | npm workspaces                   | Native Node.js monorepo tooling without extra orchestrator overhead.                                                                                      |
| **Language**      | TypeScript (Strict)              | End-to-end type safety across shared schemas, API, and web frontend.                                                                                      |
| **Frontend Web**  | React 18+ / Vite                 | Fast build times, responsive client-side SPA.                                                                                                             |
| **Styling**       | Tailwind CSS v4                  | CSS-first configuration `@import "tailwindcss";`, modern design tokens.                                                                                   |
| **Backend API**   | Node.js / Express                | Robust, standard HTTP API server with modular route/service layers.                                                                                       |
| **Realtime**      | Socket.IO                        | Bi-directional low-latency queue status updates and counter calling broadcasts.                                                                           |
| **Database ORM**  | PostgreSQL (Supabase) + Prisma 7 | Single PostgreSQL architecture across dev and deployment via DATABASE_URL; accessed via Prisma 7 driver adapter (@prisma/adapter-pg).                     |
| **Hardware Gate** | ESP32 (C++/Arduino)              | Embedded Wi-Fi/HTTPS hardware controller for gate scanning & actuation.                                                                                   |
| **Prediction**    | Pure TypeScript                  | Statistical & rule-based calculations (`predictNextHourFootfall`, `estimateWaitSeconds`, `demandLevel`, `recommendation`), zero external ML dependencies. |
| **Auth**          | Clerk                            | Managed authentication & role management (Admin, Operator, Citizen).                                                                                      |

---

## 3. Core Architectural Principles

- **Modular Monolith**: All backend services reside in a single deployable process, modularized by domain.
- **Layer Separation**: Route handlers validate transport input; services execute business logic; Prisma handles persistence.
- **Event-Driven Decoupling**: In-process event bus enables decoupled asynchronous side-effects between modules.
- **Shared Code Single Source of Truth**: All shared types, DTOs, and schemas are defined in `packages/shared`.
