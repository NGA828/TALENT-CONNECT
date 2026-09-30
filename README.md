# Talent Connect

Talent Connect is a two-sided marketplace for the live-events industry. **Talents** (photographers, DJs, dancers, hosts, lighting designers …) build a profile and portfolio and enrol in events. **Promoters** (licensed agencies) publish events, search for talent and issue contracts. An **Admin** verifies promoter licences, moderates portfolios and monitors the platform.

The repository contains two separate applications:

| App | Folder | Stack |
| --- | --- | --- |
| Web UI | [`frontend/`](frontend) | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, React Hook Form + Zod |
| REST API | [`backend/`](backend) | NestJS 12, Prisma 6, SQLite, JWT, bcrypt, class-validator |

The frontend never touches the database. The browser only talks to the Next.js origin; Next proxies `/api/*` and `/uploads/*` to the NestJS server (see `frontend/next.config.ts`), so no backend URL, secret or CORS setup is exposed to client code.

Related documents: [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md) · [`DESIGN_RESEARCH.md`](DESIGN_RESEARCH.md) · [Postman collection & API test screenshots](postman/README.md)

---

## Quick start

Requirements: Node.js 20+ (developed on 22) and npm.

```bash
# 1 — API
cd backend
cp .env.example .env            # then set JWT_SECRET to a long random string
npm install
npm run prisma:generate
npm run prisma:migrate          # applies prisma/migrations to prisma/dev.db
npm run prisma:seed             # demo data (see "Seed data")
npm run start:dev               # http://localhost:4000/api

# 2 — Web app (second terminal)
cd frontend
cp .env.example .env.local      # BACKEND_URL=http://127.0.0.1:4000
npm install
npm run dev                     # http://localhost:3000
```

Shortcut: `./scripts/dev-start.sh` runs setup, the API (:4000) and the production web build (:3000) in one command. `./scripts/dev-setup.sh` alone does the install, `.env` (with a fresh random `JWT_SECRET`), Prisma client, database creation/seeding and API build in one go. Then run `node dist/main.js` in `backend/` and `npm run build && npm run start` in `frontend/` (or `npm run dev`). Do not run `next build` while `next dev` is running, because both write to `.next`.

`npm run db:reset` in `backend/` deletes the dev database, re-applies the migrations and re-seeds it.

### Development credentials

These accounts are created **only by the Prisma seed** (`backend/prisma/seed.ts`). Nothing is hard-coded in the frontend.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@talentconnect.dev` | `Admin@12345` |
| Talent (Photographer) | `alex.rivera@talentconnect.dev` | `Password123!` |
| Promoter (verified) | `jordan.blake@talentconnect.dev` | `Password123!` |

Every other seeded user also uses `Password123!`:

- **Talents:** liam.carter (DJ), sofia.martinez (Dancer), kwame.mensah (Musician), yuki.tanaka (Videographer), chloe.dubois (Makeup Artist), daniel.otieno (MC / Host), priya.sharma (Lighting Designer).
- **Promoters:** nadia.haddad and marcus.webb (verified), elena.petrova (licence pending review), victor.alves (licence pending review, fee paid), tom.fischer (licence rejected), grace.lin (no licence submitted, fee unpaid — a good account for walking through licence → payment → admin approval).

All emails use the `@talentconnect.dev` domain. **Change or remove the seed admin before any real deployment.**

### Production build

```bash
cd backend  && npm run build && npm run start:prod
cd frontend && npm run build && npm run start
```

---

## Environment variables

`backend/.env.example` documents every variable. Real `.env` files are git-ignored.

| Variable | Purpose |
| --- | --- |
| `PORT`, `NODE_ENV`, `CORS_ORIGINS` | Server settings. CORS only matters when something other than the Next proxy calls the API. |
| `DATABASE_URL` | SQLite file, e.g. `file:./prisma/dev.db` (resolved relative to `backend/`). |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing. Use a long random secret. |
| `PAYMENT_PROVIDER`, `PAYMENT_CURRENCY`, `LICENCE_FEE_AMOUNT`, `PAYMENT_API_KEY/SECRET` | Payment module. Only `sandbox` ships; the key slots are reserved for a live adapter and stay server-side. |
| `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | AI module. Leave `AI_API_KEY` empty to use the offline assistant. |
| `UPLOAD_DIR` | Local upload folder for the dev storage adapter. |
| `RATE_LIMIT`, `AUTH_RATE_LIMIT`, `AI_RATE_LIMIT` | Requests per minute per client. |

`frontend/.env.example` has a single server-side variable, `BACKEND_URL`. There are no `NEXT_PUBLIC_*` secrets; API keys never reach the browser.

---

## Features by role

**Visitor** — public landing page (`/`) with a photo slideshow hero, live platform numbers and featured work pulled from the API, CTAs for *Join as Talent*, *Join as Promoter*, *Explore Platform*, *Get Started* and *Login*. Registration (`/register`) has separate talent and promoter flows.

**Talent** — dashboard; profile with photo, skills and completion checklist; portfolio CRUD with image / video / audio / PDF uploads, publish-hide toggle and moderation notices; event browsing with filters, enrol / withdraw; contracts (read the terms, accept or decline while pending); ratings; messages; notifications; AI writing assistant.

**Promoter** — dashboard; agency profile; licence submission with document upload; licence-fee payment (sandbox); event create / edit / publish / unpublish / start / complete / cancel with up to 8 event photos (choose the cover, remove photos); photos appear on event cards, the event gallery, dashboards and the landing page; talent search with portfolio previews; issue, amend, cancel and complete contracts, attach a signed PDF, rate talent after completion; messages; notifications.

**Admin** — overview with a verification queue; user list with suspend / deactivate / reactivate; promoter verification (approve, or reject with a reason); portfolio moderation (flag / remove / restore); reports (users, events, contracts, payments, verifications, moderation) with CSV export; monitoring (system health, 14-day activity, pipelines).

The three dashboards are intentionally organised differently: talent = personal "what needs me" page, promoter = operations console with a pipeline and tables, admin = queue-first dense tables.

---

## Architecture

### Backend (`backend/src`)

```
admin  ai  auth  contracts  events  messages  notifications  payments
portfolios  promoters  public  ratings  storage  talents  users
common/{decorators,guards,filters,utils}   prisma/
```

- **Controllers are thin**; business rules live in services; all data access goes through `PrismaService`.
- **Security pipeline:** global `JwtAuthGuard` (routes are private unless marked `@Public()`), `RolesGuard` with `@Roles()`, `@CurrentUser()` decorator, `ValidationPipe` with DTOs (`whitelist`, `forbidNonWhitelisted`, 422 with a per-field `errors` map), a `@Sanitize()` transform that strips markup from free-text input, `helmet`, and throttling (stricter on auth and AI). Tokens carry a `tokenVersion`, so suspending a user or changing a password invalidates existing sessions.
- **Ownership checks** are enforced in the services: talents can only edit their own profile / portfolio / enrolments; promoters only their own events, contracts and payments; conversation and contract access is limited to participants. Admins get elevated access only through `/admin/*` and read access to specific resources.
- **Payments** (`payments/`): `PaymentsModule`, controller, service, DTOs and a `PaymentProvider` abstraction. The bundled `SandboxPaymentProvider` is explicit, not a silent mock: it validates card numbers (Luhn, expiry), really declines test cards, records `FAILED` payments with a reason, stores only brand and last four digits, and the UI shows a "Sandbox mode" banner everywhere a payment is taken. Add a live provider by implementing `PaymentProvider` and switching `PAYMENT_PROVIDER`.
  Sandbox cards: `4242 4242 4242 4242` and `5555 5555 5555 4444` succeed; `4000 0000 0000 0002` is declined; `4000 0000 0000 9995` has insufficient funds.
- **AI** (`ai/`): `AIController`, `AIService` and an `AiProvider` abstraction with an OpenAI-compatible adapter (uses `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`) and an offline template adapter used automatically when no key is set. The UI tells the user which mode is active. The key never leaves the server.
- **Storage** (`storage/`): `StorageService` validates MIME type and size per media type (image 10 MB, video 50 MB, audio 20 MB, PDF 10 MB) and delegates to a `StorageProvider`. `LocalStorageProvider` writes to `UPLOAD_DIR`; an S3 / Cloudinary adapter only needs to implement the same interface.
- **Status enums:** Contract `PENDING / ACTIVE / COMPLETED / CANCELLED / REJECTED`; Licence `NOT_SUBMITTED / PENDING / VERIFIED / REJECTED`; Payment `PENDING / SUCCESS / FAILED / REFUNDED`; Event `DRAFT / PUBLISHED / ONGOING / COMPLETED / CANCELLED`.

### Database (`backend/prisma/schema.prisma`)

Entities: `User`, `Talent`, `Promoter`, `Portfolio`, `Event`, `EventImage`, `TalentEvent`, `Contract`, `Payment`, `Message`, `Notification`, `Rating`, plus two supporting tables — `LicenceReview` (audit trail of admin decisions) and `AiMessage` (assistant history).

### Frontend (`frontend/src`)

```
app/           routes: /, /login, /register, /talent/*, /promoter/*, /admin/*
features/      auth, landing, talent, promoter, admin, events, portfolio,
               contracts, payments, messaging, notifications, ai
components/    ui/ (design-system primitives)  layout/ (shells, nav)
lib/           api client, useApi, toast, hooks, formatters, shared types
```

- One design system (`globals.css` tokens, Inter + Plus Jakarta Sans). Role workspaces differ by layout and accent only: Talent = light sidebar + indigo, Promoter = dark sidebar + teal, Admin = slate top-nav + amber.
- Every API-driven page has loading skeletons, empty states and error states with retry. The API client maps 400 / 401 / 403 / 404 / 409 / 422 / 429 / 500 and network failures to friendly messages and never renders raw server errors.
- Route guards in the role layouts are a convenience only; the API enforces authorization.
- The JWT is kept in `localStorage` (`tc.token`). That is simple and works with the Next proxy, but it is exposed to XSS; moving to an `httpOnly` cookie session is the natural hardening step for production.

---

## Testing

```bash
cd backend && npm test          # 58 API tests against a throw-away SQLite database
cd backend && npm run lint && npm run build
cd frontend && npm run lint && npm run typecheck && npm run build
```

**Postman / newman:** [`postman/`](postman/README.md) contains a 113-request Postman collection (426 assertions) covering every module, and [screenshots of each request](postman/screenshots/README.md). Run it with `cd postman && npm install && npm test`.

The backend suite (`node:test` + `expect`, real Nest app, real SQLite) covers both valid and invalid paths: registration validation and duplicate emails, login failures, suspended users, role and ownership violations (403), unknown resources (404), state conflicts (409), validation errors (422), upload type and size limits, event and contract state machines, licence → payment → admin verification, declined cards, messaging, notifications, AI, admin operations and the error envelope (no stack traces).

The UI flows were additionally exercised end-to-end in a headless browser (invalid login, registration validation and duplicates, profile save, AI chat, licence submission, declined then successful sandbox payment, admin approval and reject-needs-reason, event create and publish, enrol, issue and accept a contract, notifications, CSV report generation) and checked for horizontal overflow at 390 px on every page.

---

## Environment notes (Prisma without engine downloads)

This project was built in a sandbox that cannot download Prisma's native engine binaries, so it uses Prisma's **engine-less client** with the libSQL driver adapter:

- `schema.prisma` sets `engineType = "client"`; `prisma.config.ts` sets `engine: 'js'` and connects through `@prisma/adapter-libsql` using `DATABASE_URL`.
- `npm run prisma:generate` and `npm run prisma:migrate` (`prisma migrate deploy`) work with this setup. `prisma migrate dev` does not work on a fresh database here; to create a new migration, generate the SQL with
  `npx prisma migrate diff --from-schema-datamodel <old-schema> --to-schema-datamodel prisma/schema.prisma --script`, save it under `prisma/migrations/<timestamp>_<name>/migration.sql`, and apply it with `npm run prisma:migrate`.
- With libSQL, enums are stored as text; the client still validates them.
- The `url` in the datasource block is ignored by the adapter (Prisma prints a harmless warning).

If you have normal network access you can remove the adapter and the `engineType` line and use stock Prisma.

---

## Known limitations

- Payments are sandbox-only; there is no live provider adapter yet (the abstraction is in place).
- Uploads use the local disk; swap `LocalStorageProvider` for S3 / Cloudinary before deploying to multiple instances.
- Email delivery is not implemented; notifications are in-app only.
- Contract terms are read-only for talent by design; talent can accept or decline a pending contract but cannot negotiate inside the app (use messages).


### Cameroon defaults

Contracts and sandbox licence payments use Central African CFA francs (`XAF`),
displayed as `FCFA` without decimal places. Contract fees are whole FCFA amounts
(the API rejects other currencies and decimals), event budgets are entered as a
minimum/maximum in FCFA (budgets mentioning `$`, `€`, `USD`, `EUR` … are rejected),
and notification texts read e.g. "30,000 FCFA". Rows created before this change
keep the currency they were stored with. The illustrative platform
licence fee is **30,000 FCFA**, configurable through `LICENCE_FEE_AMOUNT`; it is
not an official government fee. Set `PAYMENT_CURRENCY=XAF` in an existing backend
`.env` (new installations inherit this from `.env.example`). Payments remain
sandbox-only; no live mobile-money integration is implied.

Event display and entry use `Africa/Douala` (UTC+1). Demo profiles and events use
Cameroon locations, +237 contact examples, and English/French hosting examples.
Demo licence numbers and authorities are fictional, not regulatory guidance.
Login credentials are unchanged.

Run `cd backend && npm run prisma:migrate && npm run prisma:generate` to apply
the new database defaults. Existing contract/payment amounts and currencies are
preserved. The revised seed applies to fresh demo databases; **do not reseed a
production database** because the seed deletes existing data.
