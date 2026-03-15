# Product Requirements Document (PRD): Personal Todo & Reminder PWA

## 1. Informasi Proyek

| Item                | Detail                        |
| ------------------- | ----------------------------- |
| **Nama Proyek**     | Personal Todo & Reminder App  |
| **Status**          | Draft / Initial Phase         |
| **Target Platform** | Mobile (PWA), Tablet, Desktop |
| **Strategi Desain** | Mobile-First                  |

## 2. Ringkasan Eksekutif

Aplikasi ini adalah alat produktivitas pribadi yang menggabungkan manajemen tugas hierarkis (Section & Sub-tasks) dengan sistem pengingat (Reminders) dan visualisasi kalender. Fokus utama adalah kemudahan penggunaan di perangkat mobile melalui teknologi PWA, termasuk dukungan notifikasi push untuk pengingat tugas.

## 3. Fitur Utama (Functional Requirements)

### A. Manajemen Todo & Struktur Data

- **Sections**: Pengelompokan tugas berdasarkan kategori atau proyek (misal: "Kerja", "Pribadi").
- **Main Tasks**: Tugas utama dengan judul, deskripsi, tingkat prioritas, dan tanggal jatuh tempo.
- **Sub-tasks**: Pecahan tugas kecil di dalam Main Task untuk pelacakan yang lebih mendalam.
- **Checklist System**: Kemampuan untuk menandai selesai/belum selesai pada tiap level (Task & Sub-task).
- **Drag & Drop Reordering**: Pengurutan ulang tasks dan sub-tasks melalui drag-and-drop.

### B. Penjadwalan & Reminder

- **Set Due Date**: Penentuan tanggal dan waktu spesifik untuk tiap tugas.
- **Mobile Push Notifications**: Notifikasi yang muncul di ponsel untuk mengingatkan tugas yang akan datang (menggunakan Web Push API).
- **Reminder Logic**: Satu task bisa memiliki banyak reminder (misal: tepat waktu + 15 menit sebelum). Reminder disimpan terpisah dari task.
- **Recurring Tasks**: Dukungan task berulang (misal: "Olahraga setiap Senin") — dijadwalkan di fase berikutnya.

### C. Google Calendar-style View

- **Monthly Grid**: Tampilan kalender satu bulan penuh yang responsif.
- **Task Indicators**: Menampilkan titik (dots) atau ringkasan tugas yang belum selesai pada setiap kotak tanggal.
- **Daily Detail**: Klik pada tanggal akan menampilkan daftar tugas khusus untuk hari tersebut dalam bentuk overlay atau bottom sheet (di mobile).

### D. Autentikasi & Keamanan

- **OAuth Integration**: Login menggunakan Google OAuth 2.0 (Fase 1). Provider tambahan bisa ditambahkan di masa depan.

## 4. Spesifikasi Teknis (Tech Stack)

| Komponen         | Teknologi            | Catatan                                                              |
| ---------------- | -------------------- | -------------------------------------------------------------------- |
| Frontend         | Vite + React         | SPA dengan pendekatan Mobile-First.                                  |
| State Management | Zustand              | Ringan dan simple API untuk global state.                            |
| Data Fetching    | TanStack Query       | Caching, refetching, dan optimistic updates.                         |
| Styling          | Tailwind CSS         | Utility-first CSS framework.                                        |
| Backend          | Go (Golang)          | Menangani API, logika reminder, dan integrasi OAuth.                 |
| Database         | PostgreSQL           | Penyimpanan data relasional. Akses via raw SQL dengan pgx (no ORM). |
| PWA              | Service Workers      | Mendukung instalasi aplikasi dan push notification.                  |
| Push Service     | Web Push API         | Mengirim notifikasi dari Go backend ke browser.                      |
| Deployment       | VPS (DO/Linode)      | Self-hosted dengan full control.                                     |

## 5. Arsitektur Data (Entity Relationship)

### Tabel: `users`

| Kolom          | Tipe         | Keterangan              |
| -------------- | ------------ | ----------------------- |
| id             | UUID (PK)    |                         |
| email          | VARCHAR (UQ) |                         |
| name           | VARCHAR      |                         |
| avatar_url     | VARCHAR      |                         |
| oauth_provider | VARCHAR      | Misal: "google"         |
| oauth_id       | VARCHAR      | ID dari OAuth provider  |
| created_at     | TIMESTAMPTZ  |                         |
| updated_at     | TIMESTAMPTZ  |                         |

### Tabel: `sections`

| Kolom       | Tipe         | Keterangan              |
| ----------- | ------------ | ----------------------- |
| id          | UUID (PK)    |                         |
| user_id     | UUID (FK)    | Referensi ke `users`    |
| title       | VARCHAR      |                         |
| order_index | INTEGER      | Untuk pengurutan manual  |
| created_at  | TIMESTAMPTZ  |                         |
| updated_at  | TIMESTAMPTZ  |                         |

### Tabel: `tasks`

| Kolom        | Tipe                      | Keterangan               |
| ------------ | ------------------------- | ------------------------ |
| id           | UUID (PK)                 |                          |
| section_id   | UUID (FK)                 | Referensi ke `sections`  |
| title        | VARCHAR                   |                          |
| description  | TEXT                      |                          |
| due_date     | TIMESTAMPTZ               | Tanggal & waktu deadline |
| priority     | ENUM (low, medium, high)  |                          |
| is_completed | BOOLEAN                   | Default: false           |
| completed_at | TIMESTAMPTZ               | Null jika belum selesai  |
| order_index  | INTEGER                   | Untuk pengurutan manual  |
| created_at   | TIMESTAMPTZ               |                          |
| updated_at   | TIMESTAMPTZ               |                          |

### Tabel: `sub_tasks`

| Kolom        | Tipe        | Keterangan             |
| ------------ | ----------- | ---------------------- |
| id           | UUID (PK)   |                        |
| task_id      | UUID (FK)   | Referensi ke `tasks`   |
| title        | VARCHAR     |                        |
| is_completed | BOOLEAN     | Default: false         |
| completed_at | TIMESTAMPTZ | Null jika belum selesai|
| order_index  | INTEGER     | Untuk pengurutan manual |
| created_at   | TIMESTAMPTZ |                        |
| updated_at   | TIMESTAMPTZ |                        |

### Tabel: `reminders`

| Kolom      | Tipe        | Keterangan                     |
| ---------- | ----------- | ------------------------------ |
| id         | UUID (PK)   |                                |
| task_id    | UUID (FK)   | Referensi ke `tasks`           |
| remind_at  | TIMESTAMPTZ | Waktu reminder akan dikirim    |
| is_sent    | BOOLEAN     | Apakah sudah terkirim          |
| created_at | TIMESTAMPTZ |                                |

### Tabel: `push_subscriptions`

| Kolom       | Tipe        | Keterangan                        |
| ----------- | ----------- | --------------------------------- |
| id          | UUID (PK)   |                                   |
| user_id     | UUID (FK)   | Referensi ke `users`              |
| endpoint    | TEXT        | Push service endpoint URL         |
| p256dh_key  | VARCHAR     | Public key untuk enkripsi payload |
| auth_key    | VARCHAR     | Auth secret                       |
| device_name | VARCHAR     | Identifier perangkat (opsional)   |
| created_at  | TIMESTAMPTZ |                                   |

## 6. Rencana Pengembangan (Roadmap)

### Fase 1: Core Backend & Mobile UI

- Setup Go server dengan Google OAuth 2.0.
- Setup database PostgreSQL dengan skema awal (raw SQL + pgx).
- Setup Vite + React + Tailwind CSS + Zustand + TanStack Query.
- CRUD untuk Sections, Tasks, dan Sub-tasks.
- UI mobile-first: bottom nav, FAB, task list, swipe actions.

### Fase 2: PWA & Notification Engine

- Implementasi Service Worker untuk instalasi PWA.
- Integrasi Web Push API di Go backend untuk mengirim pengingat.
- Manajemen push subscriptions per device.
- UI untuk mengelola reminder per task.

### Fase 3: Calendar View & Responsive Layout

- Pembangunan komponen kalender interaktif (monthly grid).
- Task indicators dan daily detail view.
- Penyesuaian layout untuk Tablet & Desktop menggunakan responsive design.

### Fase 4: Recurring Tasks & Enhancements

- Sistem recurring tasks (daily, weekly, monthly, custom).
- Optimasi performa dan UX improvements.

## 7. Referensi Desain UI (Mobile-First)

- **Navigation**: Bottom navigation bar (Icons: Tasks, Calendar, Settings).
- **Action Button**: Floating Action Button (FAB) di kanan bawah untuk tambah todo instan.
- **Interactions**: Swipe left/right untuk menghapus atau menandai tugas selesai.
- **Typography**: Bersih dan terbaca jelas (Inter atau System Sans-serif).
- **Color Scheme**: Belum ditentukan — akan didesain saat implementasi UI.
