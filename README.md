# GATIMAAN (गतिमान) — Smart Queue Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-slate.svg)](LICENSE)

**GATIMAAN** is an enterprise-grade digital queue management and citizen facilitation platform designed for government citizen-service centers (e.g., MP Online, Tehsil, Sub-Divisional Magistrate, and Municipal utility facilitation offices). It eliminates chaotic physical queues through real-time virtual token tracking, dynamic desk routing, smart SLA analytics, and IoT hardware integration.

---

## 🏛️ System Overview

The platform is structured into two core user workflows:

1. **Citizen Portal (Mobile-First):**
   - **Service Directory:** Browse active government facilitation departments (Revenue & Tehsil, Municipal, Utilities, Identity & Certificates) with real-time status and estimated turnaround times.
   - **Token Generation:** One-click digital token issuance with instant token ID and QR pass generation.
   - **Live Queue Tracking:** Real-time token tracking (`/track` and `/dashboard`), live queue timeline, estimated wait durations, and counter callout banners.
   - **Ticket Management:** Access ticket details (`/ticket/:id`) and cancel tickets when needed.

2. **Admin & Operator Cockpit (Desktop-First):**
   - **Overview Dashboard:** Live citizen footfall metrics, active counters, service SLA health, and operational snapshot strip.
   - **Queue Desk Cockpit:** 65/35 dual-pane operational console with `CALL NEXT CITIZEN`, serving duration timer, citizen handover, and separated `NO-SHOW` / `SKIP` controls.
   - **Services Management:** Dynamic catalog configuration (service codes, SLA duration, priority ranks, active toggle).
   - **Counters Management:** Desk registration, operator shift assignments, and live counter status monitoring.
   - **Protected Access:** Role-aware authentication and route protection powered by Clerk.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend (`@gatimaan/web`)** | React 19, TypeScript, Vite, TailwindCSS v4, Lucide Icons, Clerk React |
| **Backend (`@gatimaan/api`)** | Node.js, Express, Socket.IO, Prisma ORM, PostgreSQL (Supabase), Clerk SDK |
| **Shared (`@gatimaan/shared`)** | TypeScript DTOs, Enums, State Transition Validators |
| **Tooling & Quality** | npm Workspaces, ESLint 9, Prettier, Node Test Runner / TSX |

---

## 📁 Repository Structure

```text
GATIMAAN/
├── apps/
│   ├── web/                     # Frontend SPA (React + Vite + TailwindCSS)
│   │   ├── src/
│   │   │   ├── components/      # UI tokens (Button, Badge, Card, Modals), admin & customer components
│   │   │   ├── pages/           # Landing, Citizen Services, Dashboard, Admin Cockpit, etc.
│   │   │   ├── hooks/           # Realtime Socket.IO listeners
│   │   │   └── lib/             # Shared helpers, ticket storage, design tokens
│   │   └── package.json
│   └── api/                     # Backend REST API + Socket.IO server
│       ├── prisma/              # Database schema & migrations
│       ├── src/
│       │   ├── routes/          # Express API endpoints
│       │   ├── services/        # Queue engine, counters, services business logic
│       │   ├── realtime/        # Socket.IO event broadcaster
│       │   └── middleware/      # Auth & error handling
│       └── package.json
├── packages/
│   └── shared/                  # Shared TypeScript types, DTOs, and constants
│       ├── src/
│       └── package.json
├── docs/                        # Architecture, DB schema, and API contracts
├── tools/                       # Queue simulator & load testing utilities
├── firmware/                    # IoT gate hardware integration firmware
├── package.json                 # Monorepo root scripts & workspace config
└── tsconfig.base.json           # Unified TypeScript configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js:** `>= 20.0.0`
- **npm:** `>= 10.0.0`
- **PostgreSQL:** Local instance or cloud database (e.g. Supabase)

### 2. Installation
Clone the repository and install dependencies across all workspaces:

```bash
git clone <repository-url>
cd GATIMAAN
npm install
```

### 3. Environment Configuration

Create `.env` files for both frontend and backend using the provided templates.

#### Backend (`apps/api/.env`):
```env
PORT=8000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# PostgreSQL Connection
DATABASE_URL=postgresql://user:password@localhost:5432/gatimaan
DIRECT_URL=postgresql://user:password@localhost:5432/gatimaan

# Clerk Backend Authentication
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
```

#### Frontend (`apps/web/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000

# Clerk Frontend Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
```

### 4. Database Setup
Generate Prisma client artifacts and run migrations:

```bash
# Generate Prisma Client
npm run prisma:generate

# Run DB Migrations (from apps/api directory)
cd apps/api && npx prisma migrate dev && cd ../..
```

### 5. Running the Application

To start both the Backend API server and Frontend Vite development server concurrently:

```bash
npm run dev
```

Or run services individually:
- **API Server only:** `npm run dev:api` (Runs on `http://localhost:8000`)
- **Web App only:** `npm run dev:web` (Runs on `http://localhost:5173`)

---

## 🧪 Testing & Verification

Run the project quality verification commands:

| Command | Action |
| :--- | :--- |
| `npm run typecheck` | Validates TypeScript types across all workspaces with `tsc -b` |
| `npm run lint` | Lints entire repository using ESLint |
| `npm test` | Executes unit tests across workspaces |
| `npm run build` | Compiles production bundles for all packages |

---

## 🚢 Production Deployment & Environment Setup

### 1. Environment Separation
| Environment Variable | Target | Purpose | Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Backend (`@gatimaan/api`) | Primary PostgreSQL connection string with connection pooling | `postgresql://...` |
| `DIRECT_URL` | Backend (`@gatimaan/api`) | Direct database URL for Prisma schema migrations | `postgresql://...` |
| `CLERK_SECRET_KEY` | Backend (`@gatimaan/api`) | Server-side Clerk secret for JWT verification & RBAC | `sk_live_...` |
| `CORS_ORIGIN` | Backend (`@gatimaan/api`) | Production domain allowed to communicate with the API | `https://gatimaan.gov.in` |
| `PORT` | Backend (`@gatimaan/api`) | Server listening port | `8000` |
| `VITE_API_BASE_URL` | Frontend (`@gatimaan/web`) | Base URL for REST endpoints and Socket.IO connection | `https://api.gatimaan.gov.in` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend (`@gatimaan/web`) | Client-side Clerk publishable key | `pk_live_...` |

### 2. Frontend Hosting (Vercel, Netlify, Render Static)
- **Root Directory:** `apps/web` (or workspace root with `-w @gatimaan/web`)
- **Build Command:** `npm run build`
- **Output Directory:** `apps/web/dist`
- **SPA Rewrites:** Pre-configured with `apps/web/public/_redirects` and `apps/web/vercel.json` to handle direct URL deep linking (`/services`, `/dashboard`, `/track`, `/admin/*`).

### 3. Backend Hosting (Railway, Render, AWS ECS)
- **Root Directory:** `apps/api`
- **Build Command:** `npm run build` (runs `prisma generate && tsc -b`)
- **Start Command:** `node dist/server.js`
- **Health Check Endpoint:** `GET /health` (returns `{ status: "ok", version: "0.1.0" }`)

---

## ✅ Deployment Checklist

- [ ] Production PostgreSQL database created and connection URLs set (`DATABASE_URL`, `DIRECT_URL`).
- [ ] Database migrations applied using `npx prisma migrate deploy`.
- [ ] Clerk production instance configured with User Roles (`ADMIN`, `OPERATOR`, `CUSTOMER`).
- [ ] Backend environment variables configured (`CLERK_SECRET_KEY`, `CORS_ORIGIN`, `PORT`).
- [ ] Backend deployed and verified healthy via `GET /health`.
- [ ] Frontend environment variables configured (`VITE_API_BASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`).
- [ ] Frontend production build compiled and deployed with SPA redirect rules.
- [ ] End-to-end smoke test executed: Token creation $\rightarrow$ Live tracking $\rightarrow$ Admin Call Next $\rightarrow$ Service completion.
- [ ] SSL/TLS certificates active on both frontend and API domains.

---

## 📊 Monitoring & Troubleshooting

### 1. Health Check Endpoint
- **URL:** `GET /health`
- **Expected Status:** `200 OK`
- **Response Format:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-25T15:02:38.176Z",
    "uptime": 777.3,
    "version": "0.1.0"
  }
  ```

### 2. Operational Troubleshooting Matrix
| Symptom | Probable Cause | Action / Verification |
| :--- | :--- | :--- |
| **API returning 500 error** | Database connection failure or missing `DATABASE_URL` | Inspect server logs for `[API Error]`; verify database status on cloud provider. |
| **Admin pages redirect to /sign-in** | Expired or invalid Clerk session token | Sign in with an authorized user containing `ADMIN` role in `publicMetadata`. |
| **Real-time queue not updating** | Socket.IO connection failed or CORS mismatch | Verify `VITE_API_BASE_URL` on web and `CORS_ORIGIN` on API match deployed hostnames. |
| **404 on page refresh in production** | Static host missing SPA rewrite rule | Ensure `_redirects` or `vercel.json` is deployed in public build assets. |

---

## 💾 Backup & Recovery Strategy

- **Database Provider Backups:** Ensure daily automated backups and Point-In-Time Recovery (PITR) are enabled on the PostgreSQL instance (Supabase / AWS RDS).
- **Prisma Schema Migrations:** All schema changes are tracked in `apps/api/prisma/migrations`. In production, apply migrations strictly via:
  ```bash
  npx prisma migrate deploy
  ```
- **Disaster Recovery:** To restore the database from a backup, restore the latest snapshot via the database dashboard and re-run Prisma migration status check (`npx prisma migrate status`).

---

## 🔄 Rollback & Failure Recovery Guide

1. **Frontend Failure:**
   - Revert to previous successful commit on Git and trigger hosting redeployment (Vercel / Netlify / Render).
   - In Vercel / Netlify UI, use the *Instant Rollback* button to switch production traffic to the previous known-good deployment artifact.
2. **Backend Failure:**
   - Inspect server logs for uncaught exceptions.
   - If a newly deployed backend version fails startup, roll back the container or container image tag to the preceding stable build.
3. **Database Schema Rollback:**
   - If a migration fails, inspect the active schema state with `npx prisma migrate status`.
   - Apply a safe forward migration to correct or revert the conflicting table state.

---

## 🔒 Security & Quality Standards

- **Zero Secret Commits:** `.gitignore` strictly ignores local `.env` and runtime build artifacts.
- **Role-Based Routing:** Sensitive admin endpoints and UI routes are protected via verified Clerk JWT tokens.
- **Safe Fallbacks:** Frontend components gracefully handle offline states, network latency, and empty queues without layout jumping.
- **Accessibility:** Meets WCAG guidelines with keyboard `Escape` dismissals, high-contrast text tags, and ARIA live regions for realtime queue updates.


