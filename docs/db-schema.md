# GATIMAAN Database Schema

This document defines the complete canonical PostgreSQL database schema and Prisma 7 data models for GATIMAAN.

---

## 1. Database Architecture & Engine

- **RDBMS**: PostgreSQL 16+ (Hosted on Supabase)
- **ORM / Client**: Prisma 7.10.0 with `@prisma/adapter-pg` driver adapter
- **Configuration**: `prisma.config.ts` (ESM)
- **Generator**: `prisma-client` with explicit output to `apps/api/src/generated/client`

---

## 2. Enums

### `UserRole`

- `CUSTOMER`: Public citizen user.
- `ADMIN`: System administrator.

### `TicketStatus`

- `WAITING`: Ticket issued, waiting in queue.
- `CALLED`: Operator called ticket to counter.
- `SERVING`: Citizen actively being served at counter.
- `COMPLETED`: Service transaction completed.
- `CANCELLED`: Ticket cancelled by citizen or operator.
- `NO_SHOW`: Citizen did not appear after being called.
- `TRANSFERRED`: Ticket routed to another service/counter.

### `DeviceType`

- `GATE`: Entry/exit IoT gate controller (ESP32).
- `KIOSK`: Physical self-service ticket issuance kiosk.
- `DISPLAY`: Public counter calling / queue status display screen.

### `FootfallEventType`

- `IN`: Gate entry event.
- `OUT`: Gate exit event.
- `SCAN`: Gate validation / QR scan event.

### `DemandLevel`

- `LOW`: Below baseline capacity.
- `MEDIUM`: Normal operating load.
- `HIGH`: Queue load approaching counter capacity.
- `SURGE`: Queue load exceeds capacity; congestion mitigation active.

### `NotificationChannel`

- `SMS`: Short Message Service.
- `WHATSAPP`: WhatsApp Business API alert.
- `WEB_PUSH`: Browser push notification.

### `NotificationStatus`

- `PENDING`: Enqueued for dispatch.
- `SENT`: Dispatched to delivery provider.
- `FAILED`: Delivery attempt failed.

---

## 3. Canonical 10 Tables

### 1. `users`

Represents customer and admin identities.

| Column          | Type        | Constraints / Modifiers | Description                             |
| :-------------- | :---------- | :---------------------- | :-------------------------------------- |
| `id`            | `TEXT`      | PK, `@default(uuid())`  | Internal primary key.                   |
| `clerk_user_id` | `TEXT`      | `UNIQUE`, Nullable      | Canonical external Clerk user ID.       |
| `email`         | `TEXT`      | `UNIQUE`, Not Null      | User email address.                     |
| `name`          | `TEXT`      | Nullable                | User full name.                         |
| `phone`         | `TEXT`      | `UNIQUE`, Nullable      | User phone number for SMS alerts.       |
| `role`          | `UserRole`  | `@default(CUSTOMER)`    | User access role (`CUSTOMER`, `ADMIN`). |
| `created_at`    | `TIMESTAMP` | `@default(now())`       | Creation timestamp.                     |
| `updated_at`    | `TIMESTAMP` | `@updatedAt`            | Last modification timestamp.            |

_Indexes_: `email`, `phone`, `clerk_user_id`.

---

### 2. `services`

Catalog of public citizen services available at the center.

| Column                 | Type        | Constraints / Modifiers | Description                                       |
| :--------------------- | :---------- | :---------------------- | :------------------------------------------------ |
| `id`                   | `TEXT`      | PK, `@default(uuid())`  | Service unique identifier.                        |
| `code`                 | `TEXT`      | `UNIQUE`, Not Null      | Short service code (e.g. `ADH`, `DOM`, `REV`).    |
| `name`                 | `TEXT`      | Not Null                | Display name of the service.                      |
| `description`          | `TEXT`      | Nullable                | Detailed description of service prerequisites.    |
| `prefix`               | `TEXT`      | Not Null                | Single-letter ticket prefix (e.g. `A`, `D`, `R`). |
| `avg_duration_minutes` | `INTEGER`   | `@default(15)`          | Expected service processing duration.             |
| `priority`             | `INTEGER`   | `@default(1)`           | Service priority weighting.                       |
| `is_active`            | `BOOLEAN`   | `@default(true)`        | Availability toggle.                              |
| `created_at`           | `TIMESTAMP` | `@default(now())`       | Creation timestamp.                               |
| `updated_at`           | `TIMESTAMP` | `@updatedAt`            | Last modification timestamp.                      |

_Indexes_: `code`, `is_active`.

---

### 3. `counters`

Physical service desks within the center.

| Column           | Type        | Constraints / Modifiers | Description                        |
| :--------------- | :---------- | :---------------------- | :--------------------------------- |
| `id`             | `TEXT`      | PK, `@default(uuid())`  | Counter unique identifier.         |
| `counter_number` | `INTEGER`   | `UNIQUE`, Not Null      | Physical desk number (1, 2, 3...). |
| `name`           | `TEXT`      | Not Null                | Descriptive counter label.         |
| `is_active`      | `BOOLEAN`   | `@default(true)`        | Operational status.                |
| `created_at`     | `TIMESTAMP` | `@default(now())`       | Creation timestamp.                |
| `updated_at`     | `TIMESTAMP` | `@updatedAt`            | Last modification timestamp.       |

_Indexes_: `counter_number`, `is_active`.

---

### 4. `counter_sessions`

Active operator shifts logged into a counter desk.

| Column       | Type        | Constraints / Modifiers      | Description                     |
| :----------- | :---------- | :--------------------------- | :------------------------------ |
| `id`         | `TEXT`      | PK, `@default(uuid())`       | Session identifier.             |
| `counter_id` | `TEXT`      | FK -> `counters.id`, Cascade | Associated counter desk.        |
| `user_id`    | `TEXT`      | FK -> `users.id`, Cascade    | Operator user logged into desk. |
| `opened_at`  | `TIMESTAMP` | `@default(now())`            | Shift start timestamp.          |
| `ended_at`   | `TIMESTAMP` | Nullable                     | Shift conclusion timestamp.     |
| `is_active`  | `BOOLEAN`   | `@default(true)`             | Session active status.          |
| `created_at` | `TIMESTAMP` | `@default(now())`            | Creation timestamp.             |
| `updated_at` | `TIMESTAMP` | `@updatedAt`                 | Last modification timestamp.    |

_Indexes_: `(counter_id, opened_at)`, `user_id`, `is_active`.

---

### 5. `tickets`

Central queue entry and token lifecycle tracking entity.

| Column                   | Type           | Constraints / Modifiers       | Description                           |
| :----------------------- | :------------- | :---------------------------- | :------------------------------------ |
| `id`                     | `TEXT`         | PK, `@default(uuid())`        | Ticket unique identifier.             |
| `ticket_number`          | `TEXT`         | Not Null                      | Formatted token string (e.g. `A001`). |
| `service_id`             | `TEXT`         | FK -> `services.id`, Restrict | Requested service.                    |
| `counter_id`             | `TEXT`         | FK -> `counters.id`, Set Null | Assigned service desk.                |
| `user_id`                | `TEXT`         | FK -> `users.id`, Set Null    | Customer who requested ticket.        |
| `status`                 | `TicketStatus` | `@default(WAITING)`           | Current lifecycle state.              |
| `priority`               | `INTEGER`      | `@default(1)`                 | Queue priority rank.                  |
| `qr_code`                | `TEXT`         | Nullable                      | Encoded QR verification payload.      |
| `issued_at`              | `TIMESTAMP`    | `@default(now())`             | Issuance timestamp.                   |
| `called_at`              | `TIMESTAMP`    | Nullable                      | Time operator called token.           |
| `served_at`              | `TIMESTAMP`    | Nullable                      | Time service commenced.               |
| `completed_at`           | `TIMESTAMP`    | Nullable                      | Time service finished.                |
| `cancelled_at`           | `TIMESTAMP`    | Nullable                      | Time ticket was cancelled.            |
| `estimated_wait_seconds` | `INTEGER`      | Nullable                      | Estimated wait at issuance.           |
| `created_at`             | `TIMESTAMP`    | `@default(now())`             | Creation timestamp.                   |
| `updated_at`             | `TIMESTAMP`    | `@updatedAt`                  | Last modification timestamp.          |

_Indexes & Constraints_:

- `(service_id, status, created_at)`: Canonical §7.3 queue position and active waiting tokens query index.
- `UNIQUE INDEX ("counter_id") WHERE status = 'SERVING'`: PostgreSQL partial unique index ensuring at most one active serving ticket per counter desk.
- `ticket_number`, `counter_id`, `user_id`, `status`.

---

### 6. `devices`

Authorized IoT hardware endpoints (ESP32 gates, kiosks, displays).

| Column         | Type         | Constraints / Modifiers | Description                            |
| :------------- | :----------- | :---------------------- | :------------------------------------- |
| `id`           | `TEXT`       | PK, `@default(uuid())`  | Device unique identifier.              |
| `device_id`    | `TEXT`       | `UNIQUE`, Not Null      | Hardware label (e.g. `GATE-01`).       |
| `device_type`  | `DeviceType` | Not Null                | Device hardware class.                 |
| `name`         | `TEXT`       | Not Null                | Descriptive hardware name.             |
| `location`     | `TEXT`       | Nullable                | Physical installation location.        |
| `key_hash`     | `TEXT`       | `UNIQUE`, Not Null      | SHA-256 hash of device secret key.     |
| `is_active`    | `BOOLEAN`    | `@default(true)`        | Enable/disable toggle.                 |
| `last_seen_at` | `TIMESTAMP`  | Nullable                | Last heartbeat / scan event timestamp. |
| `created_at`   | `TIMESTAMP`  | `@default(now())`       | Creation timestamp.                    |
| `updated_at`   | `TIMESTAMP`  | `@updatedAt`            | Last modification timestamp.           |

_Indexes_: `device_id`, `device_type`, `key_hash`, `is_active`.

---

### 7. `footfall_events`

Raw IoT gate passage and barcode/QR validation log.

| Column            | Type                | Constraints / Modifiers     | Description                              |
| :---------------- | :------------------ | :-------------------------- | :--------------------------------------- |
| `id`              | `TEXT`              | PK, `@default(uuid())`      | Event identifier.                        |
| `device_id`       | `TEXT`              | FK -> `devices.id`, Cascade | Originating IoT hardware unit.           |
| `client_event_id` | `TEXT`              | Not Null                    | Hardware-generated UUID for idempotency. |
| `event_type`      | `FootfallEventType` | Not Null                    | Event type (`IN`, `OUT`, `SCAN`).        |
| `occurred_at`     | `TIMESTAMP`         | `@default(now())`           | Hardware event timestamp.                |
| `metadata`        | `JSONB`             | Nullable                    | Optional telemetry / scan payload.       |
| `created_at`      | `TIMESTAMP`         | `@default(now())`           | Ingestion timestamp.                     |

_Indexes & Constraints_:

- `UNIQUE (device_id, client_event_id)`: Canonical idempotency constraint preventing duplicate telemetry upon network retry.
- `occurred_at`: Time-series aggregation index.
- `device_id`.

---

### 8. `footfall_snapshots`

Periodic aggregated footfall intervals for prediction model training and occupancy dashboards.

| Column          | Type        | Constraints / Modifiers | Description                            |
| :-------------- | :---------- | :---------------------- | :------------------------------------- |
| `id`            | `TEXT`      | PK, `@default(uuid())`  | Snapshot identifier.                   |
| `timestamp`     | `TIMESTAMP` | `@default(now())`       | Snapshot interval boundary.            |
| `hour_of_day`   | `INTEGER`   | Not Null                | Hour of day (0–23).                    |
| `day_of_week`   | `INTEGER`   | Not Null                | Day of week (0=Sunday ... 6=Saturday). |
| `count_in`      | `INTEGER`   | `@default(0)`           | Total entries during interval.         |
| `count_out`     | `INTEGER`   | `@default(0)`           | Total exits during interval.           |
| `net_occupancy` | `INTEGER`   | `@default(0)`           | Current estimated occupant headcount.  |
| `created_at`    | `TIMESTAMP` | `@default(now())`       | Creation timestamp.                    |

_Indexes_: `timestamp`, `(hour_of_day, day_of_week)`.

---

### 9. `prediction_snapshots`

Historical wait-time and footfall forecast records generated by the pure TypeScript prediction engine.

| Column                   | Type          | Constraints / Modifiers      | Description                             |
| :----------------------- | :------------ | :--------------------------- | :-------------------------------------- |
| `id`                     | `TEXT`        | PK, `@default(uuid())`       | Snapshot identifier.                    |
| `service_id`             | `TEXT`        | FK -> `services.id`, Cascade | Service assessed (nullable for global). |
| `timestamp`              | `TIMESTAMP`   | `@default(now())`            | Calculation timestamp.                  |
| `predicted_wait_seconds` | `INTEGER`     | Not Null                     | Estimated wait duration.                |
| `predicted_footfall`     | `INTEGER`     | Not Null                     | Estimated hourly arrival volume.        |
| `demand_level`           | `DemandLevel` | Not Null                     | Demand categorization.                  |
| `recommendation`         | `TEXT`        | Nullable                     | Operational guidance message.           |
| `created_at`             | `TIMESTAMP`   | `@default(now())`            | Creation timestamp.                     |

_Indexes_: `service_id`, `timestamp`.

---

### 10. `notifications`

Multi-channel notification dispatch records and in-app message feed.

| Column       | Type                  | Constraints / Modifiers      | Description                                      |
| :----------- | :-------------------- | :--------------------------- | :----------------------------------------------- |
| `id`         | `TEXT`                | PK, `@default(uuid())`       | Notification identifier.                         |
| `ticket_id`  | `TEXT`                | FK -> `tickets.id`, Set Null | Related ticket.                                  |
| `user_id`    | `TEXT`                | FK -> `users.id`, Set Null   | Target recipient user.                           |
| `channel`    | `NotificationChannel` | Not Null                     | Dispatch medium (`SMS`, `WHATSAPP`, `WEB_PUSH`). |
| `recipient`  | `TEXT`                | Not Null                     | Target phone or push token.                      |
| `message`    | `TEXT`                | Not Null                     | Notification text content.                       |
| `status`     | `NotificationStatus`  | `@default(PENDING)`          | Delivery status.                                 |
| `read`       | `BOOLEAN`             | `@default(false)`            | In-app read/unread status.                       |
| `sent_at`    | `TIMESTAMP`           | Nullable                     | Dispatch timestamp.                              |
| `created_at` | `TIMESTAMP`           | `@default(now())`            | Creation timestamp.                              |
| `updated_at` | `TIMESTAMP`           | `@updatedAt`                 | Last modification timestamp.                     |

_Indexes_: `ticket_id`, `user_id`, `status`, `read`.
