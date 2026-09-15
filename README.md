# Bokföring

En avskalad bokföringsapp för **enskild firma** som bokför enligt **kontantmetoden** och saknar
anställda – tänk "Fortnox light". Fristående app, byggd med samma stack som Millform.

**MVP (denna version):**
- 📒 **Kontoplan** – BAS-baserad, avskalad kontoplan (svenska konton)
- 🧾 **Verifikationer** – dubbel bokföring med automatisk balanskontroll (debet = kredit) och
  obruten verifikationsserie per räkenskapsår
- 📅 **Räkenskapsår** – kalenderår, kan låsas (bokslut)

**Planerat (kommande faser):** resultat-/balansrapport + huvudbok, momsrapport (kontantmetoden),
förenklat årsbokslut med NE-underlag, SIE4-export/import, kvittouppladdning.

## Teknik

| Del | Stack |
| --- | --- |
| Backend | TypeScript, Express, Prisma, PostgreSQL |
| Frontend | React, Vite, TanStack Query, Tailwind, react-hook-form + zod |

## Kom igång

### 1. Miljövariabler
```bash
cp .env.example .env          # roten – används av docker-compose
# skapa även backend/.env (se .env.example för nycklar):
#   DATABASE_URL, JWT_SECRET, PORT=3101, FRONTEND_URL=http://localhost:5273
```

### 2. Databas
```bash
docker compose up -d postgres           # startar PostgreSQL på :5432
```

### 3. Backend
```bash
cd backend
npm install
npm run db:migrate                      # skapar tabeller
npm run db:seed                         # kontoplan + räkenskapsår + första användaren
npm run dev                             # http://localhost:3101
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev                             # http://localhost:5273 (proxar /api → :3101)
```

### Inloggning (från seed)
Standard: `admin@firma.se` / `bokfor123` (kan ändras via `SEED_USER_*` i `backend/.env`).

## Utvecklingskommandon

**Backend** (`cd backend`)
```bash
npm run dev          # nodemon
npm run type-check   # tsc --noEmit
npm run lint         # ESLint
npm run test         # vitest (balansregel m.m.)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # seed
npm run db:studio    # Prisma Studio
```

**Frontend** (`cd frontend`)
```bash
npm run dev          # Vite dev server
npm run type-check   # tsc --noEmit
npm run lint         # ESLint
npm run build        # tsc && vite build
```

## Arkitektur i korthet

- **Backend** – moduler under `src/modules/<domän>/` med
  `<domän>.{schema,service,controller,router}.ts`. Service kastar felkoder som strängar; controller
  mappar dem till HTTP. Monetära fält lagras som `Decimal`. Balanskontroll och obruten
  verifikationsserie sker i en `$transaction`.
- **Frontend** – `types/`, `features/<domän>/api.ts` (TanStack Query-hooks), `pages/<domän>/`.
  Decimaler kommer som `string` och parsas med `parseFloat`.

## Kärnregler för bokföring

- Varje verifikation måste balansera: summa debet = summa kredit (> 0).
- Verifikationsnummer är en obruten serie per räkenskapsår, med start på 1.
- Ett låst räkenskapsår (bokslut) hindrar ändring/borttag av verifikationer. Rättelse sker då via
  en ny verifikation (kommande fas).
