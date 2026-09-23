# GATIMAAN
> **IoT-Enabled Smart Queue Management System**

GATIMAAN is a modern, IoT-integrated queue management platform built for MP Online citizen service centers. It replaces physical waiting lines with instant digital tokens, live position tracking, realtime counter calling, and automated footfall monitoring.

---

## What GATIMAAN Provides

- **Citizen / Customer Portal**:
  - Browse active citizen services (Aadhaar, PAN, Samagra, Revenue, etc.).
  - Generate instant digital queue tokens without mandatory app installation.
  - Live ticket tracking pass displaying queue position, estimated wait times, and assigned counter callouts.
  - Ticket cancellation and automatic session recovery across browser reloads via local storage.
- **Admin & Counter Operations**:
  - Role-protected administrative shell and desk calling engine.
  - Counter session management (open/close operator sessions).
  - Desk ticket workflow: call next waiting citizen, start serving, mark completed, or record no-show/skip.
- **IoT Gate & Footfall Monitoring**:
  - Hardware integration with ESP32 microcontrollers and bidirectional IR sensors.
  - Automated entry/exit footfall event ingestion via secure HTTPS POST endpoints.
- **Rule-Based Prediction Engine**:
  - Deterministic, pure TypeScript queue wait-time calculations and footfall estimation.
  - **No external ML models, Python runtimes, or LLM training pipelines are used** — all prediction logic is pure statistical and rule-based computation (`predictNextHourFootfall()`, `estimateWaitSeconds()`, `demandLevel()`).

---

## High-Level Architecture

GATIMAAN is structured as a **modular monolith** with a single unified backend process handling both REST APIs and Socket.IO realtime broadcasts.

```
React 19 + Vite Web (@gatimaan/web)
        │
        ▼ (HTTP REST + Socket.IO)
Express 5 API Server (@gatimaan/api)
        │
        ▼ (Prisma 7 + @prisma/adapter-pg)
PostgreSQL Database (Supabase)
        ▲
        │ (HTTPS POST)
ESP32 Gate Controller (firmware/gatimaan-gate)
```

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS v4, React Router v7, Socket.IO Client |
| **Backend** | Node.js 22, Express 5, TypeScript, Prisma 7, `@prisma/adapter-pg`, `pg.Pool`, Socket.IO |
| **Database** | PostgreSQL (hosted on Supabase with Transaction Pooler) |
| **Authentication** | Clerk (`@clerk/clerk-react`, `@clerk/express`) with role claims (`CUSTOMER`, `ADMIN`) |
| **Realtime** | Socket.IO server with in-process Node.js `EventEmitter` event bus |
| **IoT / Firmware** | ESP32 microcontroller with dual IR beam sensors (`firmware/gatimaan-gate`) |
| **Testing & Quality** | Node.js Test Runner (`tsx --test`), Supertest, ESLint, TypeScript (`tsc -b`) |

---

## Repository Structure

```
GATIMAAN/
├── apps/
│   ├── api/                 # Express 5 API + Socket.IO server + Prisma 7 ORM
│   │   ├── prisma/          # Prisma schema and seed scripts
│   │   └── src/
│   │       ├── db/          # Database client & connection pool singleton
│   │       ├── middleware/  # Clerk auth, role guards, and error handlers
│   │       ├── realtime/    # Socket.IO handlers and event dispatchers
│   │       ├── routes/      # Express controllers (services, counters, tickets)
│   │       └── services/    # Core business logic & concurrency-safe queue engine
│   └── web/                 # React 19 + Vite citizen and admin web application
│       └── src/
│           ├── components/  # Customer UI components, layout, and loading states
│           ├── hooks/       # Realtime Socket.IO subscription hooks
│           ├── lib/         # Ticket storage helpers and socket singleton
│           └── pages/       # Citizen portal, live pass, and admin pages
├── packages/
│   └── shared/              # Shared TypeScript interfaces, DTOs, Zod schemas, enums
├── firmware/
│   └── gatimaan-gate/       # ESP32 Arduino C++ firmware for IR footfall gate
└── docs/                    # Architecture records, DB schema, and API contracts
```

---

## Environment Setup

The repository requires two separate `.env` files for local development. Copy the example templates to get started:

### 1. Backend Environment (`apps/api/.env`)
```bash
cp apps/api/.env.example apps/api/.env
```
Key variables:
- `PORT`: API server port (default: `8000`)
- `NODE_ENV`: `development` or `production`
- `CORS_ORIGIN`: Allowed frontend origin (`http://localhost:5173`)
- `DATABASE_URL`: PostgreSQL connection string (Supabase Transaction Pooler, port `6543`)
- `DIRECT_URL`: Direct PostgreSQL connection string for Prisma migrations
- `CLERK_SECRET_KEY`: Clerk backend secret key

### 2. Frontend Environment (`apps/web/.env`)
```bash
cp apps/web/.env.example apps/web/.env
```
Key variables:
- `VITE_API_BASE_URL`: Backend API URL (`http://localhost:8000`)
- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk frontend publishable key

> **Security Rule**: Never commit `.env` files, database connection strings, or API credentials to version control.

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Applications

To start both the API server and Web frontend concurrently:
```bash
npm run dev
```

To run individual workspaces:
```bash
# Start Express API server (runs on http://localhost:8000 with hot-reload)
npm run dev:api

# Start React Vite frontend (runs on http://localhost:5173)
npm run dev:web
```

### 3. Quality & Verification Commands
```bash
# Run linting across all packages
npm run lint

# Run TypeScript typechecks across all workspaces
npm run typecheck

# Run automated integration and unit test suites
npm test

# Build production bundles
npm run build
```

---

## Important Frontend Routes

| Route | Access | Description |
| :--- | :--- | :--- |
| `/` or `/services` | Public | **Citizen Portal**: Browse services, search catalog, and issue digital tokens |
| `/ticket/:id` | Public | **Live Ticket Tracking Pass**: Realtime queue position, status badge, wait time, and counter callout |
| `/admin` | Admin Only | **Admin Shell**: Management dashboard for services, counters, and desk operations |
| `/sign-in/*` | Public | Clerk authentication sign-in page |
| `/sign-up/*` | Public | Clerk authentication sign-up page |

---

## Important API Endpoints

### Services (`/api/services`)
- `GET /api/services`: List available services (public returns active services; admins see all).
- `GET /api/services/:id`: Get single service details.
- `POST /api/services`: Create a new service *(Admin required)*.
- `PATCH /api/services/:id`: Update service configuration *(Admin required)*.
- `PATCH /api/services/:id/status`: Toggle active status *(Admin required)*.

### Counters (`/api/counters`)
- `GET /api/counters`: List all counters with active session status *(Admin required)*.
- `POST /api/counters`: Register a new physical counter *(Admin required)*.
- `POST /api/counters/:id/open`: Open an operator session for a counter *(Admin required)*.
- `POST /api/counters/:id/close`: Close the active session on a counter *(Admin required)*.

### Tickets & Queue Operations (`/api/tickets`)
- `POST /api/tickets/issue`: Issue a new digital ticket with sequential daily numbering.
- `GET /api/tickets/:id`: Fetch ticket details, service info, and assigned counter.
- `GET /api/tickets/:id/position`: Calculate dynamic queue position and estimated wait time.
- `POST /api/tickets/:id/cancel`: Cancel an active waiting/called ticket.
- `POST /api/tickets/call-next`: Call the next waiting ticket to counter *(Admin required)*.
- `POST /api/tickets/:id/serve`: Transition called ticket to serving *(Admin required)*.
- `POST /api/tickets/:id/complete`: Complete ticket service *(Admin required)*.
- `POST /api/tickets/:id/skip`: Mark called ticket as no-show/skipped *(Admin required)*.

---

## Realtime Architecture (Socket.IO)

GATIMAAN uses Socket.IO rooms for targeted event broadcasting:

| Room / Topic | Description | Broadcast Events |
| :--- | :--- | :--- |
| `ticket:<ticketId>` | Subscribed by the citizen viewing their live pass | `ticket.updated` |
| `queue:<serviceId>` | Subscribed by citizen catalog and operator desks | `queue.updated` |
| `footfall` | Subscribed by admin overview and facility displays | `footfall.updated` |
| `prediction` | Subscribed by queue prediction displays | `prediction.updated` |

---

## Authentication & Roles

Authentication is powered by Clerk. User roles are managed via Clerk session metadata:
- **`CUSTOMER`** *(Default)*: Can browse public services, issue tickets, view their live digital pass, and cancel tickets.
- **`ADMIN`**: Authorized to create/edit services and counters, open/close counter desk sessions, and perform ticket calling actions.

---

## Queue State Machine

```
              ┌───────────────┐
              │    WAITING    │
              └───────┬───────┘
                      │ (call-next)
                      ▼
              ┌───────────────┐
   ┌──────────┤    CALLED     ├──────────┐
   │ (cancel) └───────┬───────┘ (no-show)│
   ▼                  │ (serve)          ▼
┌───────────┐         ▼            ┌───────────┐
│ CANCELLED │ ┌───────────────┐    │  NO_SHOW  │
└───────────┘ │    SERVING    │    └───────────┘
              └───────┬───────┘
                      │ (complete)
                      ▼
              ┌───────────────┐
              │   COMPLETED   │
              └───────────────┘
```

Supported States:
- **Active States**: `WAITING`, `CALLED`, `SERVING`
- **Terminal States**: `COMPLETED`, `CANCELLED`, `NO_SHOW`, `TRANSFERRED`

---

## Git & Development Workflow

To maintain stability, development follows strict branch isolation:

1. **Branch Isolation**: Never push directly to `main`. Create a dedicated feature/phase branch:
   ```bash
   git checkout -b phase-<number>-<feature-name>
   ```
2. **Quality Verification**: Before committing or pushing, verify all quality gates pass:
   ```bash
   npm run lint && npm run typecheck && npm test && npm run build
   ```
3. **Pull Request**: Push the branch and open a Pull Request targeting `main`.
4. **Merge**: Review and merge into `main` only after all CI checks pass.

---

## Current Development Status

The core architectural foundation, PostgreSQL database layer, concurrency-safe queue engine, Socket.IO realtime broadcasts, and **Phase 8 Customer Portal** (with live ticket pass and instant state transitions) are fully implemented and verified. 

Active development is currently focused on **Admin Queue Management** — implementing the operator desk calling station, active counter controls, and queue management controls within the existing `/admin` route.
