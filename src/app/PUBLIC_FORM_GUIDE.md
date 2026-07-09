# Public Submission Form - User Guide

## Overview
Form laporan IT untuk **pengguna tanpa akun**. Pengguna cukup melaporkan masalah; tim IT yang menentukan klasifikasi (network/hardware/software) dan mengarahkan ke Error Report atau Feature Request.

## Accessing the Public Form

```
https://your-domain.com/public/submit
```

## What Users Fill In

### Required
- Nama lengkap
- Unit / departemen
- Judul laporan
- Keterangan detail

### Optional
- Bukti gambar (screenshot/foto, maks. 5 file, total 10MB; JPG/PNG/GIF/WEBP)

### Handled by IT (not on public form)
- Jenis masalah (error vs feature)
- Kategori hardware / network / software
- Prioritas

## After Submission

1. Pengguna menerima nomor referensi `PUB-YYYY-####`
2. Laporan masuk ke menu **Tickets** (internal IT)
3. Tim IT meninjau, mengatur kategori/prioritas, lalu **Convert** ke Error Report atau Feature Request / Bug Fix

## IT Workflow (internal)

1. **Tickets** → filter **Laporan Publik**
2. Buka detail `PUB-*` → data pelapor & lampiran
3. **Triage IT** — kategori & prioritas
4. **Convert** — Error Report (hardware/network/software) atau Feature Request / Bug Fix
5. Assign tim dan lacak hingga selesai

## API

```
POST /api/v1/public/submit
Header: X-API-Key: <PUBLIC_SUBMISSION_API_KEY>
Body (multipart): title, description, submitter_name, submitter_unit, files[]
Response: { reference_number, status, submitted_at }
```

---

**Last Updated**: 09 Juli 2026
