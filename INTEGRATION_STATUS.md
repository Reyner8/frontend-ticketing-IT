# Integration Guide

## Status: **Terintegrasi** (per 2026-07-07)

| Area | Status | Catatan |
|------|--------|---------|
| Auth (login/logout/token) | done | Login page, Sanctum Bearer + AuthGuard di semua route |
| Dashboard data | done | `fetchDashboardData()` agregasi tickets + downtime + team workload |
| Error Reports | done | `fetchErrorReports`/`Detail`, create form, comments, attachments, approve/reject, assign, status change |
| Feature Requests | done | `fetchFeatureRequests`/`Detail` + milestones + timeline sub-endpoints, semua actions wired |
| Downtime Monev | done | List + create form via API |
| Team Performance | done | `fetchTeamWorkloadLatest` + tickets |
| Notifications | done | Fetch, unread count, mark read/read-all wired |
| Settings / Preferences | done | `PATCH /me/preferences` |
| Public Form (`/public/submit`) | partial | Fallback: butuh login, POST via authenticated endpoints (belum ada anonymous endpoint di backend) |
| Calendar view | done | `CalendarView` page + `GET /calendar-events` (month range) + upcoming |
| User Management (`/users`) | done | Admin-only CRUD + toggle active |
| Attachments | done | `AttachmentPanel` reusable, upload/list/delete errors + features |
| Approvals (team_lead) | done | `ApprovalActions` di detail dialog error/feature |
| Assignment (admin/team_lead) | done | `AssignmentActions` user & team |
| Status change (it_staff) | done | `StatusChangeActions` PATCH `/{resource}/{id}/status` + reason/notes |
| Export Reports | done (fallback) | Client-side CSV; backend export endpoint belum tersedia |
| Quick actions | done | New Ticket, Log Downtime, Export CSV, dan navigasi Assign |
| Search (AppHeader) | done | `searchTickets`, `searchDowntimes`, `searchUsers` |

---

## Fitur Baru (2026-07-07)

Wave 2 integrasi menambahkan seluruh action layer yang sebelumnya masih placeholder:

- **User Management** — halaman `/users` khusus admin, tabel + filter + toggle active + dialog create/edit + confirm delete.
- **Attachment Panel** — komponen reusable untuk parent `tickets`, `errors`, `features`, `comments`. Enforces batas 10 MB (sesuai `StoreAttachmentRequest`).
- **Approval Actions** — team_lead dapat Approve/Reject error/feature/ticket dengan `rejection_reason` yang wajib.
- **Assignment Actions** — team_lead & admin assign/unassign user (aktif `it_staff` saja) atau team.
- **Milestones & Timeline** — feature detail memuat data dari `/feature-requests/{id}/milestones` dan `.../timelines` dan menampilkannya di tab Progress.
- **Calendar View** — `GET /calendar-events` (with `from`/`to`) + `/upcoming?days=14`.
- **Status Change** — it_staff dapat PATCH status dengan optional `reason` + `notes` (audit trail).
- **Client-side CSV Export** — Quick Action “Export Reports” menghasilkan CSV per dataset (tickets/errors/features/downtimes/users). Menandai bahwa endpoint backend untuk export belum tersedia.

---

## Frontend → Backend Mapping

### Dashboard (`/`)

| UI Data | Sumber | Endpoint |
|---------|--------|----------|
| Stats cards | `computeDashboardStats()` frontend | Agregasi `/tickets`, `/downtime-records`, `/team-workload/latest` |
| Recent tickets | `Ticket[]` | `GET /tickets?per_page=50` |
| Downtime summary | `DowntimeRecord[]` | `GET /downtime-records` |
| Team workload | `TeamWorkload[]` | `GET /team-workload/latest` (restricted `it_staff`) |
| Current user | Global state | `GET /me` |

### Error Reports (`/error-reports`)

| Fitur | Endpoint |
|-------|----------|
| List | `GET /error-reports` |
| Detail | `GET /error-reports/{id}` |
| Create | `POST /error-reports` (`it_staff`) |
| Status history | `GET /errors/{id}/status` |
| Activity logs | `GET /errors/{id}/activity-logs` |
| Comments | `GET`/`POST /errors/{id}/comments` |
| Attachments | `GET`/`POST`/`DELETE /errors/{id}/attachments` |
| Approve/Reject | `POST /errors/{id}/approve` \| `.../reject` (`team_lead`) |
| Assign user/team | `POST /errors/{id}/assign/user\|team` |
| Status change | `PATCH /errors/{id}/status` (`it_staff`) |

### Feature Requests (`/feature-requests`)

| Fitur | Endpoint |
|-------|----------|
| List/Detail | `GET /feature-requests[/{id}]` |
| Create | `POST /feature-requests` (`it_staff`) |
| Milestones | `GET /feature-requests/{id}/milestones` |
| Timeline | `GET /feature-requests/{id}/timelines` |
| Attachments | `.../attachments` (via `parent="features"`) |
| Approval/Assign/Status | Sama pola dengan error reports |

### Downtime (`/downtime`)

| Fitur | Endpoint |
|-------|----------|
| List | `GET /downtime-records` |
| Create | `POST /downtime-records` (`it_staff`) |

### Users (`/users`)

| Fitur | Endpoint |
|-------|----------|
| List | `GET /users` (admin) |
| Create/Update/Delete | `POST`/`PUT`/`DELETE /users[/{id}]` |
| Toggle active | `PATCH /users/{id}/toggle-active` |

### Calendar (`/calendar`)

| Fitur | Endpoint |
|-------|----------|
| Month range | `GET /calendar-events?from=&to=` |
| Upcoming | `GET /calendar-events/upcoming?days=14` |

### Settings

Preference key mapping (camelCase → snake_case) tetap sama dengan sebelumnya. Endpoint: `PATCH /me/preferences`.

### Public Submission Form (`/public/submit`)

Backend belum menyediakan endpoint anonim. Frontend jatuh kembali ke endpoint terautentikasi (`POST /tickets` / `error-reports` / `feature-requests`) sehingga pengguna harus login dulu. Field-field khusus form publik (nama, email, unit) tidak dikirim ke API.

---

## Gap yang Masih Terbuka

- **Public/anonymous submission** — backend belum menyediakan endpoint tanpa auth.
- **Ticket assignment endpoints** — hanya errors & features yang punya route `/assign/*`. Tickets belum.
- **Dashboard aggregate stats endpoint** — masih dihitung di client.
- **Global activity feed** — tidak ada endpoint global; recent activity direkonstruksi dari list ticket.
- **Server-side export (PDF/Excel/CSV)** — belum ada; sekarang dihandle client-side.
- **Watchers / Tag CRUD dari UI** — endpoint tersedia (`/tickets/{id}/watch`, `/tags`), namun UI belum menampilkan.
- **Conversion history & merged tickets** — endpoint ada, UI belum di-wire.

## Backend Notes

- URL sub-resource: pakai `/errors/…` & `/features/…` (bukan `error-reports` / `feature-requests`).
- Login response `{ user, token }` — di luar wrapper `ApiResponse`.
- Comment endpoint kadang unwrapped (tanpa `data`) — mapper sudah handle keduanya.

Lihat `API_SPEC.md` untuk detail per endpoint.
