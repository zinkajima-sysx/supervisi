# GitHub — Workflow & Conventions

## Repository
- **Remote:** `https://github.com/zinkajima-sysx/supervisi.git`
- **Branch utama:** `master` (bukan `main`)
- **Deploy:** Vercel otomatis deploy dari branch `master`

---

## Branch Naming

```
feature/<deskripsi-singkat>    ← fitur baru
fix/<deskripsi-singkat>        ← bug fix
hotfix/<deskripsi-singkat>     ← fix kritis di production
refactor/<deskripsi-singkat>   ← refactor tanpa perubahan fungsional
chore/<deskripsi-singkat>      ← update dependency, config, dll
```

Contoh:
```
feature/edit-delete-supervisi
fix/p3k-header-row-mapping
hotfix/cloudinary-upload-timeout
refactor/sheets-append-row
chore/update-dependencies
```

**Aturan:**
- Jangan push langsung ke `master` kecuali hotfix kecil
- Buat branch baru untuk setiap fitur/fix
- Merge ke `master` via Pull Request

---

## Commit Message Format

Gunakan format **Conventional Commits**:

```
<type>(<scope>): <deskripsi singkat>

[body opsional — penjelasan lebih detail]

[footer opsional — breaking change, closes issue]
```

### Type yang digunakan di project ini:
| Type | Kapan digunakan |
|---|---|
| `feat` | Fitur baru (form input, halaman baru, API baru) |
| `fix` | Bug fix (data tidak tersimpan, filter tidak bekerja) |
| `hotfix` | Fix kritis yang langsung ke production |
| `refactor` | Perubahan kode tanpa mengubah behavior |
| `perf` | Optimasi performa (caching, query) |
| `style` | Perubahan UI/CSS tanpa logika |
| `chore` | Update dependency, config, .gitignore |
| `docs` | Update dokumentasi, steering files |

### Scope yang relevan:
`sheets`, `cloudinary`, `auth`, `apd`, `p3k`, `master`, `dashboard`, `laporan`, `sidebar`, `pwa`, `api`

### Contoh commit yang baik:
```
feat(apd): tambah fitur edit dan delete data supervisi APD
fix(sheets): gunakan loadHeaderRow(2) untuk Data_P3K multi-row header
perf(sheets): cache header row index untuk mengurangi API calls
style(sidebar): kurangi ukuran nav items 30% untuk tampilan lebih kompak
chore: update cloudinary ke v2, tambah NEXT_PUBLIC env vars
```

---

## File yang TIDAK BOLEH Di-commit

Sudah dikonfigurasi di `.gitignore`:

```
.env              ← berisi Google private key & Cloudinary secret
.env.local        ← credentials lokal
Data_*.csv        ← data sensitif (user, klinik, APD, P3K)
login.txt         ← credentials plaintext
/public/sw.js     ← generated PWA service worker
/public/workbox-* ← generated PWA files
/.next/           ← build artifacts
/node_modules/    ← dependencies
```

**Sebelum commit, selalu cek:**
```bash
git status        # pastikan tidak ada file sensitif
git diff --staged # review perubahan yang akan di-commit
```

---

## Workflow Harian

### 1. Mulai fitur baru
```bash
git checkout master
git pull origin master
git checkout -b feature/nama-fitur
```

### 2. Commit perubahan
```bash
git add src/                    # staging spesifik, hindari git add .
git commit -m "feat(scope): deskripsi"
```

### 3. Push ke GitHub
```bash
git push -u origin feature/nama-fitur
```

### 4. Merge ke master (setelah review)
```bash
git checkout master
git merge feature/nama-fitur --no-ff
git push origin master
```

### 5. Deploy ke Vercel
Push ke `master` → Vercel otomatis build & deploy.

---

## Environment Variables di Vercel

Variabel berikut **wajib** dikonfigurasi di Vercel Dashboard → Settings → Environment Variables:

```
# NextAuth
NEXTAUTH_URL=https://supervisi-mu.vercel.app
NEXTAUTH_SECRET=<random 32+ chars>

# Google Service Account
GOOGLE_PROJECT_ID
GOOGLE_PRIVATE_KEY_ID
GOOGLE_PRIVATE_KEY          ← format multiline dengan \n
GOOGLE_CLIENT_EMAIL
GOOGLE_CLIENT_ID
GOOGLE_SHEETS_ID

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
NEXT_PUBLIC_CLOUDINARY_FOLDER
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_URL
CLOUDINARY_UPLOAD_PRESET
CLOUDINARY_FOLDER
CLOUDINARY_SECURE_DELIVERY
```

**Catatan:** `GOOGLE_PRIVATE_KEY` di Vercel harus ditulis dengan `\n` literal (bukan newline nyata). Vercel akan mengkonversinya dengan benar.

---

## Checklist Sebelum Push ke Master

- [ ] `npm run build` berhasil tanpa error
- [ ] Tidak ada file `.env*` atau `Data_*.csv` di staging
- [ ] Semua env vars sudah dikonfigurasi di Vercel
- [ ] Fitur sudah ditest di local (`npm run dev`)
- [ ] Tidak ada `console.log` debug yang tertinggal di production code
- [ ] PWA icons sudah di-generate jika ada perubahan manifest (`npm run icons:gen`)

---

## Rollback Jika Deploy Bermasalah

```bash
# Lihat commit history
git log --oneline -10

# Revert ke commit sebelumnya (buat commit baru, tidak hapus history)
git revert <commit-hash>
git push origin master
```

Atau via Vercel Dashboard → Deployments → pilih deployment sebelumnya → Redeploy.
