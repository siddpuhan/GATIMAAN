# GATIMAAN Citizen UI Design System (Phase U1)

Established in **Phase U1 — Citizen Design System + Information Architecture**.
Phases U2 (Home), U3 (Services), U4 (Live Ticket), and U5 (Dashboard + polish)
must build on these tokens, components, and rules instead of introducing
page-specific one-off styling.

---

## 1. Citizen Information Architecture

Primary citizen navigation (in `CitizenHeader`):

```
/            Home
/services    Service discovery
/ticket/:id  Live active ticket experience (single source of truth for a token)
/dashboard   Citizen dashboard
```

Conditional entries:

- **My Active Token** → `/ticket/:id` — shown only while an active ticket
  (`WAITING` / `CALLED` / `SERVING`) is persisted via `lib/ticketStorage.ts`.
- **Admin Portal** → `/admin` — rendered only for authenticated users with
  `publicMetadata.role === 'ADMIN'` (Clerk). Enforcement remains in
  `ProtectedRoute` (frontend) and backend `requireRole` middleware.

Navigation rules:

- There is **no "Track Token" destination**. Citizens never search for a token
  manually; issuing a token navigates directly to `/ticket/:id`.
- Legacy deep links to `/track` redirect to `/dashboard` (`<Navigate replace>`)
  for backwards compatibility. The backend lookup APIs are untouched.
- `/tickets/:id` remains as an alias of `/ticket/:id`.

## 2. Design Tokens

Defined in `apps/web/src/index.css` via Tailwind CSS v4 `@theme`
(CSS-based configuration only — no `tailwind.config.js`).

### Color system

| Role | Token | Value | Usage |
|---|---|---|---|
| Primary ink | `--color-gov-navy` | `#0f172a` | Header brand, focal surfaces, primary buttons |
| Primary hover | `--color-gov-navy-hover` | `#1e293b` | Hover for navy surfaces |
| Accent | `--color-gov-blue` | `#1e40af` | Reserved for links/focus rings only |
| Success / active | `--color-gov-green` | `#047857` | Available, serving, completed |
| Warning / attention | `--color-gov-amber` | `#b45309` | Called to counter, approaching |
| Error / cancelled | `--color-gov-red` | `#be123c` | Errors, no-show |
| Neutral / inactive | `--color-gov-neutral` | `#64748b` | Unavailable, closed queues |
| Surface | `--color-gov-surface` | `#f8fafc` | Page background |
| Surface raised | `--color-gov-surface-raised` | `#ffffff` | Cards, header, footer |
| Border | `--color-gov-border` | `#e2e8f0` | Default hairlines |
| Border strong | `--color-gov-border-strong` | `#cbd5e1` | Inputs, emphasized borders |

Rules:

- The interface stays predominantly light; navy is used intentionally, not as a
  page-wide theme.
- Semantic Tailwind classes (`slate-*`, `emerald-*`, `amber-*`, `rose-*`)
  remain valid for existing components; the tokens are the canonical reference.
- Color is never the only status signal (see §5).

### Typography scale

One page title per page. System sans-serif stack (incl. `Noto Sans Devanagari`
fallback) — no webfont dependency.

| Token | Size | Usage |
|---|---|---|
| `text-page-title` | 24px | Page title (one per page) |
| `text-section-heading` | 18px | Section headings (`SectionHeader`) |
| `text-card-heading` | 16px | Card headings (`CardTitle`) |
| `text-body` | 14px | Body copy |
| `text-secondary` | 12px | Supporting text |
| `text-label` | 11px | Uppercase metadata labels |
| `text-caption` | 10px | Sparse captions only |

### Spacing

- Vertical page rhythm: `space-y-6` inside `PageContainer`.
- Card padding: `p-5` (mobile) / `sm:p-6` (desktop).
- Section separation: `pb-3 border-b border-slate-200` headers, no arbitrary
  margins; use the Tailwind scale (multiples of 4px).

### Radius system

| Token | Value | Usage |
|---|---|---|
| `--radius-card` | 12px | Cards |
| `--radius-control` | 10px | Buttons, inputs, chips |
| `--radius-focal` | 16px | Hero/focal surfaces only |
| `--radius-pill` | 999px | Badges, live indicators |

Cards feel subtle and functional; nothing is fully pill-shaped except badges.

## 3. Component Inventory

Shared UI primitives (pre-existing, refined standards):
`Button` (primary/secondary/outline/destructive/ghost + loading/disabled),
`Badge`, `Card` family, `LoadingState`, `EmptyState`, `ErrorState`,
`AlertBanner`.

Citizen-specific components (`apps/web/src/components/citizen/`):

| Component | Purpose | Used by |
|---|---|---|
| `CitizenHeader` | Brand, primary nav, Active Token entry, Admin Portal (ADMIN only), Clerk user control, mobile hamburger | `App.tsx` |
| `CitizenFooter` | Official service description, helpline, ownership, policy links (content preserved from prior phases) | `App.tsx` |
| `PageContainer` | Shared max-width + vertical rhythm for citizen pages | U2–U5 |
| `SectionHeader` | Consistent section heading + description + actions | U2–U5 |
| `StatusBadge` | Canonical `TicketStatus` → labeled status color mapping | U4/U5 |
| `ServiceAvailabilityBadge` | `AVAILABLE` / `UNAVAILABLE` (from `service.isActive`) | U3 |
| `LiveIndicator` | `live` / `updating` / `reconnecting` / `offline` realtime state | U2–U5 |
| `QueueMetric` | Numeric emphasis block (position, wait, desk) | U4/U5 |
| `InfoRow` | Label/value metadata rows | U4/U5 |

Component rules:

- Reuse before creating; do not duplicate an existing primitive.
- No page-specific one-off styling for cross-page patterns.
- No fake data or fake functionality inside primitives.

## 4. Realtime State Strategy

- Realtime architecture (Socket.IO singleton `lib/socket.ts`, subscription
  hooks in `hooks/useRealtime.ts`, event contracts in `@gatimaan/shared`) is
  **unchanged** in U1.
- `hooks/useSocketConnection.ts` is a read-only listener on the existing
  singleton's connection lifecycle (`connect`, `disconnect`,
  `reconnect_attempt`) — it never creates, reconfigures, or disconnects the
  socket and changes no event/room contracts.
- `LiveIndicator` renders plain-language states: **Live**, **Updating…**,
  **Reconnecting…**, **Connection unavailable** — with dot + label, never
  color-only. No simulated realtime behavior is implemented.

## 5. Accessibility Foundation

- Semantic landmarks preserved: skip link, `<header>`, `<main id="main-content">`,
  `<footer>`, `<nav aria-label>`.
- Visible keyboard focus via `focus-visible:ring-*`; touch targets ≥44px on
  interactive controls.
- Status colors always paired with text labels and/or dots + text
  (`StatusBadge`, `LiveIndicator`).
- Meaningful heading hierarchy: one page title, section headings via
  `SectionHeader` (h2/h3).
- `prefers-reduced-motion: reduce` globally disables animations/transitions
  (index.css baseline).
- Existing font-scale (`A- A A+`) and high-contrast toggles retained.
- No unnecessary ARIA: `aria-live` only on genuinely dynamic regions
  (`LiveIndicator`, `PageContainer` status areas).

## 6. Responsive Strategy

Deliberate breakpoints (mobile-first):

| Range | Layout behavior |
|---|---|
| 320–480px | Single column; hamburger nav; metrics stack in compact 3-col grid; 44px touch targets |
| 768px (tablet) | Inline nav replaces hamburger; 2-col card grids |
| 1024–1440px | Standard citizen layout, `max-w-5xl/6xl` containers |
| >1440px | Centered containers; no full-bleed stretching |

Mobile is designed first (hamburger disclosure, stacked `QueueMetric` grid,
full-width buttons) rather than shrunken desktop UI.

## 7. What U1 Intentionally Did Not Change

- Home, Services, Dashboard, and Ticket page designs (U2–U5 scope).
- Socket.IO server, event names, topics, and payload contracts.
- All backend APIs, services, Prisma schema, queue/prediction engines.
- Clerk authentication architecture; Admin Portal UI and RBAC.
- Backend ticket lookup APIs (still used for active-ticket recovery).
