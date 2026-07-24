<div align="center">
  <img src="public/favicon.svg" alt="Tokolink OSS Logo" width="120" height="120" />
  
  # Tokolink
  **Platform All-in-One Link-in-Bio & Katalog UMKM Indonesia**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF4154?style=flat)](https://tanstack.com/start)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)

</div>

<br />

**Tokolink** adalah platform Software-as-a-Service (SaaS) multi-tenant bersumber terbuka (Open Source) yang dirancang khusus untuk mempermudah digitalisasi Usaha Mikro, Kecil, dan Menengah (UMKM) di Indonesia. Platform ini menggabungkan kemudahan kartu nama digital (_link-in-bio_) dengan katalog produk interaktif, yang secara otomatis menerjemahkan keranjang pesanan pelanggan menjadi format pesan WhatsApp yang rapi dan terstruktur.

---

## Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Arsitektur & Teknologi](#-arsitektur--teknologi)
- [Prasyarat Sistem](#-prasyarat-sistem)
- [Instalasi & Konfigurasi Lokal](#-instalasi--konfigurasi-lokal)
- [Struktur Repositori](#-struktur-repositori)
- [Deployment Produksi](#-deployment-produksi)
- [Keamanan (Security Hardening)](#-keamanan-security-hardening)
- [Kontribusi](#-kontribusi)
- [Lisensi](#-lisensi)

---

## Fitur Utama

- **Instan Deploy & Onboarding:** Buat website toko fungsional (`tokolink-v2.vercel.app/slug-toko`) dalam waktu singkat dengan alur onboarding yang intuitif.
- **Hybrid Mobile-First Layout:** Tampilan storefront minimalis berbasis _continuous scroll_ yang menggabungkan link eksternal (sosial media) dan grid katalog produk dalam satu halaman.
- **WhatsApp Order Generator:** Keranjang belanja _client-side_ terintegrasi yang menghitung total harga beserta pilihan varian, lalu mengonversinya menjadi format pesan WhatsApp terstruktur untuk memproses pemesanan.
- **Dasbor & Manajemen Produk:** Kelola toko secara mandiri, atur data produk, harga dasar, deskripsi, foto produk, serta kelola varian dinamis (seperti pilihan ukuran atau warna) beserta selisih harga (_price delta_).

---

## Arsitektur & Teknologi

Tokolink dibangun menggunakan ekosistem modern berbasis JavaScript/TypeScript berkemampuan tinggi:

- **Frontend:** React 19, TanStack Start (Vite + Vinxi compiler), Zustand (state management), Framer Motion (micro-animations), Tailwind CSS V4.
- **Routing & SSR:** TanStack Router (file-based type-safe routing) dengan Server-Side Rendering (SSR).
- **Backend Logic:** TanStack Start Server Functions (RPC endpoints) diproteksi dengan Same-Origin CSRF middleware.
- **Database & ORM:** PostgreSQL dengan Prisma ORM untuk query relasional yang aman dan cepat.
- **Layanan Pihak Ketiga:**
  - **Supabase Auth**: Manajemen sesi login (Email OTP, Google OAuth).
  - **Vercel Blob**: Penyimpanan media/gambar produk dan avatar toko secara awan.
  - **Resend**: Layanan pengiriman email verifikasi OTP dan selamat datang.
  - **Google reCAPTCHA v3**: Proteksi formulir pendaftaran dan onboarding dari spam bot.

---

## Prerequisites

Sebelum memulai instalasi, pastikan sistem lokal Anda telah terpasang:

- [Bun Runtime](https://bun.sh/) (Sangat direkomendasikan untuk performa build cepat) atau Node.js v18+
- Akun database PostgreSQL (atau database Supabase)
- Kredensial API untuk Supabase, Resend, Vercel Blob, dan reCAPTCHA

---

## Instalasi & Konfigurasi Lokal

Ikuti langkah-langkah berikut untuk menjalankan proyek di komputer lokal Anda:

### 1. Kloning Repositori

```bash
git clone https://github.com/MastayY/tokolink-app
cd tokolink
```

### 2. Pasang Dependensi

```bash
bun install
# atau
npm install
```

### 3. Konfigurasi Environment Variables

Salin template konfigurasi dan isi nilai variabel sesuai dengan akun layanan Anda:

```bash
cp .env.example .env
```

Sesuaikan isi `.env` dengan kredensial PostgreSQL, Supabase, Vercel Blob, reCAPTCHA, dan Resend Anda.

### 4. Sinkronisasi Skema Database

Generate Prisma client dan jalankan migrasi database ke PostgreSQL:

```bash
bun run db:generate
bun run db:push
```

### 5. Jalankan Server Pengembangan

```bash
bun run dev
# atau
npm run dev
```

Buka peramban (browser) dan akses aplikasi di alamat `http://localhost:3000`.

### 6. Jalankan Quality Check Lokal

```bash
bun run typecheck
bun run lint
bun run test
bun run test:coverage
```

Test menggunakan Vitest, Testing Library, dan jsdom. Setup global berada di `src/test/setup.ts`, sedangkan factory data reusable berada di `src/test/factories.ts`.

---

## Struktur Repositori

```text
tokolink/
├── prisma/               # Skema database Prisma & file seeding
├── public/               # File statis (logo, favicon, font lokal, OG assets)
├── src/
│   ├── components/       # Komponen UI presentasional (UI primitives & layout)
│   ├── hooks/            # Custom React hooks (auth form, session sync)
│   ├── lib/              # Konfigurasi klien, data stores, skema Zod, & utilitas
│   ├── routes/           # Routing halaman & API endpoints (TanStack Router)
│   ├── server/           # TanStack Start Server Functions & middleware
│   ├── styles.css        # Entrypoint css global Tailwind CSS
│   ├── start.ts          # Konfigurasi middleware TanStack Start (CSRF & Error)
│   └── server.ts         # Entrypoint server runtime (Vinxi/Nitro)
├── .env.example          # Template konfigurasi environment variables
└── README.md             # Dokumentasi proyek
```

---

## Keamanan (Security Hardening)

Platform ini mengimplementasikan best-practice keamanan modern untuk menjaga data pengguna dan performa server:

- **Perlindungan CSRF:** Setiap RPC request ke server functions diproteksi secara otomatis melalui middleware CSRF bawaan TanStack Start.
- **Pencegahan SSRF:** Modul pembuatan OG Image membatasi tautan eksternal gambar hanya dari host yang terpercaya (`*.vercel-storage.com`, `api.dicebear.com`, `tokolink-v2.vercel.app`). Permintaan ke local network/loopback IP diblokir di lingkungan produksi.
- **Validasi Tipe & Skema:** Seluruh parameter input dari client divalidasi ketat menggunakan pustaka **Zod** sebelum dieksekusi di database.
- **Verifikasi Magic Bytes Gambar:** Server-side upload memverifikasi struktur biner gambar (PNG, JPG, GIF, WEBP) untuk menghindari manipulasi berkas biner berbahaya.
- **Proteksi Brute-Force OTP:** Sistem verifikasi kode OTP membatasi percobaan salah maksimal 5 kali sebelum berkas OTP otomatis dihapus dari database.

---

## Kontribusi

Kontribusi dari seluruh developer sangat diapresiasi!

1. Lakukan _Fork_ repositori ini.
2. Buat branch fitur baru (`git checkout -b feature/NamaFitur`).
3. Lakukan commit perubahan (`git commit -m 'feat: menambahkan fitur X'`).
4. Push ke branch Anda (`git push origin feature/NamaFitur`).
5. Ajukan _Pull Request_ (PR).

---

## Lisensi

Proyek ini dirilis di bawah lisensi **MIT License**. Anda bebas menggunakan, memodifikasi, dan mendistribusikannya baik secara komersial maupun privat. Rincian lebih lengkap terdapat pada berkas `LICENSE`.
