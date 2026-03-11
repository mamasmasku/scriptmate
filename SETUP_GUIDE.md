# 🚀 ScriptMate — Panduan Setup Lengkap

## Struktur File yang Perlu Ditambahkan

```
scriptmate/
├── .env.example              → salin jadi .env.local & isi
├── supabase_schema.sql       → jalankan di Supabase SQL Editor
├── lib/
│   ├── supabase.ts           → Supabase client
│   ├── midtrans.ts           → Midtrans helper
│   └── useAuth.ts            → React auth hook
├── pages/
│   ├── index.tsx             → Halaman utama (ganti App.tsx lama)
│   ├── auth/
│   │   ├── login.tsx         → Halaman login
│   │   ├── register.tsx      → Halaman register
│   │   └── callback.tsx      → OAuth callback
│   ├── admin/
│   │   └── index.tsx         → Admin panel (/admin)
│   └── api/
│       ├── gemini.ts         → Gemini API (update yang lama)
│       ├── credits/
│       │   ├── balance.ts
│       │   └── deduct.ts
│       ├── payment/
│       │   ├── create.ts
│       │   └── webhook.ts
│       └── admin/
│           ├── users.ts
│           └── add-credits.ts
└── components/
    ├── UserMenu.tsx
    ├── BuyCreditsModal.tsx
    └── SettingsModal.tsx
```

---

## LANGKAH 1 — Setup Supabase

1. Buka https://supabase.com → pilih project kamu (atau buat baru)
2. Pergi ke **SQL Editor**
3. Copy seluruh isi `supabase_schema.sql` → paste → klik **Run**
4. Pergi ke **Authentication → Providers**:
   - Aktifkan **Google** → masukkan Google OAuth Client ID & Secret
   - Aktifkan **Phone** (untuk WhatsApp OTP) → butuh Twilio atau provider SMS lain
5. Di **Authentication → URL Configuration**:
   - Site URL: `https://app-kamu.vercel.app`
   - Redirect URLs: `https://app-kamu.vercel.app/auth/callback`
6. Ambil credentials di **Settings → API**

### Setup Google OAuth untuk Supabase:
1. Buka https://console.cloud.google.com
2. Buat project → Credentials → Create OAuth 2.0 Client ID
3. Authorized redirect URI: `https://[PROJECT_ID].supabase.co/auth/v1/callback`
4. Copy Client ID & Secret → paste ke Supabase Google Provider

---

## LANGKAH 2 — Setup Midtrans

1. Daftar/login di https://dashboard.midtrans.com
2. Untuk testing: gunakan https://sandbox.midtrans.com
3. Pergi ke **Settings → Access Keys**
4. Copy **Server Key** dan **Client Key**
5. Set Notification URL (webhook) di Settings → Configuration:
   `https://app-kamu.vercel.app/api/payment/webhook`

### Snap.js di _document.tsx atau _app.tsx:
Tambahkan script Midtrans Snap di `pages/_app.tsx`:
```tsx
import Script from 'next/script'

// Di dalam return App component:
<Script 
  src="https://app.sandbox.midtrans.com/snap/snap.js"  // untuk production: app.midtrans.com
  data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
/>
```

---

## LANGKAH 3 — Install Dependencies

```bash
npm install @supabase/supabase-js openai
```

---

## LANGKAH 4 — Konfigurasi .env.local

Salin `.env.example` jadi `.env.local` dan isi semua nilainya.

Di Vercel: Settings → Environment Variables → tambahkan semua variabel.

---

## LANGKAH 5 — Set Admin Pertama

Setelah kamu register akun pertama kali:
1. Buka Supabase → SQL Editor
2. Jalankan:
```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'email_admin_kamu@gmail.com');
```

---

## LANGKAH 6 — Deploy ke Vercel

```bash
vercel deploy --prod
```

---

## Cara Kerja Sistem Kredit

| Aksi | Kredit |
|------|--------|
| Generate Mode Bebas (3 segmen) | 3 kredit |
| Generate Mode Rapi (3 segmen) | 3 kredit |
| Generate Mode Urai (2 segmen) | 2 kredit |
| Generate Skrip Jualan | 1 kredit |

- Free user: tidak pakai kredit, tapi pakai API key sendiri, hanya Mode Bebas
- Pro user: pakai kredit & API key server (semua mode aktif)
- Admin: semua mode aktif, tidak dipotong kredit (optional — bisa diubah di kode)

---

## Akses Admin Panel

URL tersembunyi: `https://app-kamu.vercel.app/admin`

Fitur admin:
- ✅ Lihat semua user + saldo kredit
- ✅ Tambah kredit manual ke user manapun
- ✅ Daftarkan user baru
- ✅ Ubah role user (free/pro/admin)
- ✅ Statistik total user & kredit

---

## Flow Pembayaran (Midtrans)

1. User klik "Beli Kredit" → pilih paket
2. Frontend call `/api/payment/create` → dapat Snap token
3. Midtrans Snap popup muncul → user bayar (DANA/OVO/GoPay/dll)
4. Midtrans kirim webhook ke `/api/payment/webhook`
5. Server verifikasi signature → tambah kredit otomatis
6. User otomatis upgrade ke Pro jika sebelumnya Free

---

## Metode Login yang Tersedia

| Metode | Provider | Catatan |
|--------|----------|---------|
| Google OAuth | Gmail | Butuh setup Google OAuth |
| Email + Password | Gmail/Yahoo | Validasi domain di register |
| Phone OTP | WhatsApp number | Butuh Twilio/SMS provider di Supabase |

---

## Catatan Penting

- `SUPABASE_SERVICE_ROLE_KEY` bersifat **sangat rahasia** — jangan expose ke client
- Webhook Midtrans diverifikasi dengan SHA-512 signature untuk keamanan
- Kredit dipotong **setelah** AI berhasil generate (bukan sebelum)
- Admin panel hanya bisa diakses user dengan role `admin`
