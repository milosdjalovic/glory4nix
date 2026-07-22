# Glory 4 Nix — Premium Barbershop Website

Mobilno-usmjeren website za zakazivanje termina u barbershopu Glory 4 Nix.

## Lokalni razvoj

```bash
npm install
cp .env.example .env   # popuni DATABASE_URL i ostalo
npm run db:deploy      # primijeni migracije
npm run db:seed        # barberi, usluge, admin nalozi
npm run dev
```

Website: http://localhost:3000

### Baza (PostgreSQL)

Projekt koristi **PostgreSQL** (ne SQLite) — potreban je i lokalno i na Vercelu.

Besplatna opcija: [Neon](https://neon.tech) — napravi projekat, kopiraj connection string u `.env`:

```
DATABASE_URL="postgresql://...-pooler...?sslmode=require"
DIRECT_URL="postgresql://...direct...?sslmode=require"
```

## Pristupni podaci (nakon seed-a)

| Ko | Korisničko ime | Lozinka | Pristup |
|----|----------------|---------|---------|
| **Nix** (admin) | `nix` | `ADMIN_PASSWORD` iz .env | Sve |
| Seki | `seki` | `seki123` (ili `BARBER_SEKI_PASSWORD`) | Termini + dostupnost |
| Ivan | `ivan` | `ivan123` (ili `BARBER_IVAN_PASSWORD`) | Termini + dostupnost |

Prijava: **`/barber`**

---

## Deploy na Vercel (GitHub)

### 1. GitHub repozitorij

```bash
git init
git add .
git commit -m "Initial commit"
```

Na [github.com](https://github.com) → **New repository** → ime npr. `glory4nix`.

```bash
git remote add origin https://github.com/TVOJ-USERNAME/glory4nix.git
git branch -M main
git push -u origin main
```

### 2. Neon baza (produkcija)

1. [neon.tech](https://neon.tech) → New Project
2. Kopiraj **Pooled connection** → `DATABASE_URL`
3. Kopiraj **Direct connection** → `DIRECT_URL`

### 3. Vercel projekat

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Importuj GitHub repozitorij `glory4nix`
3. Framework: **Next.js** (automatski)
4. **Environment Variables** — dodaj:

| Varijabla | Obavezno | Opis |
|-----------|----------|------|
| `DATABASE_URL` | Da | Neon pooled connection |
| `DIRECT_URL` | Da | Neon direct connection |
| `JWT_SECRET` | Da | `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | Da | Lozinka za Nix |
| `VAPID_PUBLIC_KEY` | Ne* | Push obavještenja |
| `VAPID_PRIVATE_KEY` | Ne* | Push obavještenja |
| `VAPID_SUBJECT` | Ne | npr. `mailto:info@glory4nix.com` |

\* Bez VAPID ključeva sajt radi, ali push neće slati obavještenja.

5. **Deploy** — Vercel automatski pokreće `prisma migrate deploy` + `next build`

### 4. Seed produkcijske baze (jednom)

Nakon prvog uspješnog deploya, popuni bazu podacima:

```bash
# Preuzmi env varijable sa Vercela
npx vercel env pull .env.production

# Postavi DATABASE_URL iz .env.production i pokreni seed
npm run db:seed
```

Ili ručno u `.env` stavi produkcijski `DATABASE_URL` i pokreni `npm run db:seed`.

### 5. Custom domen (opciono)

Vercel → Project → **Settings → Domains** → dodaj npr. `glory4nix.com`.

---

## Push obavještenja

Generiši VAPID ključeve:

```bash
npx web-push generate-vapid-keys
```

Dodaj u Vercel env varijable i u lokalni `.env`. Barberi se prijave na `/barber` → **Obavještenja**.

## Skripte

| Komanda | Opis |
|---------|------|
| `npm run dev` | Dev server |
| `npm run build` | Migracije + produkcijski build |
| `npm run db:deploy` | Primijeni migracije |
| `npm run db:seed` | Početni podaci |
| `npm run update-services` | Ažuriraj cjenovnik |

## Produkcija — checklist

- [ ] `JWT_SECRET` — jaka random vrijednost
- [ ] `ADMIN_PASSWORD` — jaka lozinka za Nix
- [ ] Neon baza kreirana i seed pokrenut
- [ ] VAPID ključevi postavljeni (za push)
- [ ] Custom domen povezan (opciono)
