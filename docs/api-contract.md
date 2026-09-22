# GATIMAAN API Contract

This document defines the HTTP REST and WebSocket API specifications for the GATIMAAN platform.

## Status

> [!NOTE]
> API endpoint contracts will be documented incrementally as endpoints are implemented in Phase 3 through Phase 10.
> Do not invent speculative endpoint specifications prior to their implementation phase.

---

## 1. System Health & Auth Endpoints

### `GET /health`
- **Auth**: Public
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-09-22T18:00:00.000Z",
  "uptime": 120.4,
  "version": "0.1.0"
}
```

### `GET /api/auth/me`
- **Auth**: `requireAuth` (Any authenticated role)
- **Response**: `200 OK`
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "clerkUserId": "user_xxx",
    "email": "user@example.com",
    "name": "User Name",
    "phone": null,
    "role": "CUSTOMER",
    "createdAt": "2026-09-22T18:00:00.000Z",
    "updatedAt": "2026-09-22T18:00:00.000Z"
  },
  "clerkUserId": "user_xxx"
}
```

---

## 2. Services Management Endpoints (Phase 4)

All service management endpoints require `ADMIN` role.

### `GET /api/services`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Query Params**: `includeInactive` (optional, boolean, default: `true`)
- **Response**: `200 OK` — Array of `ServiceDTO`

### `GET /api/services/:id`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Response**: `200 OK` — `ServiceDTO` | `404 Not Found`

### `POST /api/services`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Request Body**:
```json
{
  "code": "ADH",
  "name": "Aadhaar Card Services",
  "description": "Aadhaar enrollment and biometric updates",
  "prefix": "A",
  "avgDurationMinutes": 15,
  "priority": 1,
  "isActive": true
}
```
- **Response**: `201 Created` — `ServiceDTO` | `400 Bad Request` | `409 Conflict` (Duplicate code)

### `PATCH /api/services/:id`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Request Body**: Partial `UpdateServiceInput`
- **Response**: `200 OK` — `ServiceDTO` | `404 Not Found` | `409 Conflict`

### `PATCH /api/services/:id/status`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Request Body**: `{ "isActive": boolean }`
- **Response**: `200 OK` — `ServiceDTO` | `404 Not Found`

---

## 3. Counters & Desks Endpoints (Phase 4)

All counter management endpoints require `ADMIN` role.

### `GET /api/counters`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Response**: `200 OK` — Array of `CounterWithSessionDTO`

### `GET /api/counters/:id`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Response**: `200 OK` — `CounterWithSessionDTO` | `404 Not Found`

### `POST /api/counters`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Request Body**:
```json
{
  "counterNumber": 1,
  "name": "Counter 1 (General)",
  "isActive": true
}
```
- **Response**: `201 Created` — `CounterDTO` | `400 Bad Request` | `409 Conflict` (Duplicate number)

### `PATCH /api/counters/:id`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Request Body**: Partial `UpdateCounterInput`
- **Response**: `200 OK` — `CounterDTO` | `404 Not Found` | `409 Conflict`

### `PATCH /api/counters/:id/status`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Request Body**: `{ "isActive": boolean }`
- **Response**: `200 OK` — `CounterDTO` | `404 Not Found`

### `POST /api/counters/:id/open`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Description**: Opens a desk shift session for the counter tied to the authenticated user.
- **Response**: `200 OK`
```json
{
  "message": "Counter opened successfully",
  "session": {
    "id": "uuid",
    "counterId": "uuid",
    "userId": "uuid",
    "openedAt": "2026-09-22T18:00:00.000Z",
    "endedAt": null,
    "isActive": true,
    "createdAt": "2026-09-22T18:00:00.000Z",
    "updatedAt": "2026-09-22T18:00:00.000Z"
  }
}
```
- **Errors**: `400 Bad Request` (Inactive counter), `409 Conflict` (Already open), `404 Not Found`

### `POST /api/counters/:id/close`
- **Auth**: `requireAuth`, `requireRole(UserRole.ADMIN)`
- **Description**: Concludes the active desk shift session for the counter, setting `endedAt` and `isActive: false`.
- **Response**: `200 OK`
```json
{
  "message": "Counter closed successfully",
  "session": {
    "id": "uuid",
    "counterId": "uuid",
    "userId": "uuid",
    "openedAt": "2026-09-22T18:00:00.000Z",
    "endedAt": "2026-09-22T19:00:00.000Z",
    "isActive": false,
    "createdAt": "2026-09-22T18:00:00.000Z",
    "updatedAt": "2026-09-22T19:00:00.000Z"
  }
}
```
- **Errors**: `409 Conflict` (No active open session), `404 Not Found`

