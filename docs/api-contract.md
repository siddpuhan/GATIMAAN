# GATIMAAN API Contract

This document defines the HTTP REST and WebSocket API specifications for the GATIMAAN platform.

## Status

> [!NOTE]
> API endpoint contracts will be documented incrementally as endpoints are implemented in Phase 3 through Phase 10.
> Do not invent speculative endpoint specifications prior to their implementation phase.

---

## Planned API Domains

1. **Auth & Identity**: User profile, session verification, and role assignments.
2. **Queue Management**: Queue creation, status querying, token issuance, and state transitions.
3. **Counter Operations**: Counter login, calling next token, mark serving, transfer, and complete.
4. **Prediction & Analytics**: Wait-time estimations and throughput metrics.
5. **Hardware Gate Integration**: ESP32 authentication, QR scan validation, and gate pulse trigger.
6. **Notifications**: Alert preference management and dispatch webhooks.
7. **Real-time WebSockets**: Socket.IO event channels for queue updates and counter announcements.
