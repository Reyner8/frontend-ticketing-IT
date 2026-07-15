# Integration Guide

Mirror of root `INTEGRATION.md` — **Terintegrasi penuh** (per 2026-07-12).

See `/INTEGRATION.md` for full mapping.

## Wave 5 (2026-07-12)

- List resource BE diperkaya (`reporter`, `assigned_user`, `assigned_team`, `tags`, `sla_breached`)
- List mapper FE selaras; filter role akurat
- Reporter scoping di Error Reports & Feature Requests (BE)
- Feature index: `per_page` + query filters
- Fix `apiPut` import; hapus `mock-data.ts` & template `SystemConfiguration` state
- `TicketStatus` termasuk `converted`

## Wave 3–4 (selesai)

- Tickets page, assignment, feature comments, TagManager, ConversionActions
- System Config admin tab, public form attachments, server export, activity feed
- Public intake + convert-only flow, carry-over lampiran, claim + status guard

## Remaining backlog

- CAPTCHA public submit (production)
- Server-side pagination/filter pass-through di UI (opsional)
- Endpoint belum di-wire: delete comment, notification bulk-delete, calendar edit, milestone progress
- Manual verification ⏳ — `notes/CATATAN-VERIFIKASI.md`
