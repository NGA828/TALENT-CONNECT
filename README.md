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
| `PAYMENT_PROVIDER`, `PAYMENT_CURRENCY`, `LICENCE_FEE_AMOUNT`, `PAYMENT_API_KEY/SECRET` | Licence-fee module. `manual` (default) means promoters pay by MTN MoMo / Orange Money and an administrator confirms the transfer; `LICENCE_FEE_AMOUNT` is only the default until an administrator sets the fee. The key slots are reserved for a live aggregator and stay server-side. |
| `XAI_API_KEY` (or `AI_API_KEY` / `GROK_API_KEY`), `AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, `AI_MAX_TOKENS`, `AI_TIMEOUT_MS` | AI assistant. Put a Grok key from [console.x.ai](https://console.x.ai) in `XAI_API_KEY` and the assistant is live — `npm run ai:check` in `backend/` verifies it. With no key it falls back to the offline template writer. |
| `UPLOAD_DIR` | Local upload folder for the dev storage adapter. |
| `RATE_LIMIT`, `AUTH_RATE_LIMIT`, `AI_RATE_LIMIT` | Requests per minute per client. |

`frontend/.env.example` has a single server-side variable, `BACKEND_URL`. There are no `NEXT_PUBLIC_*` secrets; API keys never reach the browser.

### Switching on the AI assistant (Grok)

1. Create an API key at [console.x.ai](https://console.x.ai) → *API Keys*.
2. Put it in `backend/.env`: `XAI_API_KEY=xai-…` (that file is git-ignored — never commit a key).
3. Restart the backend. The boot log prints `AI assistant: live via Grok (xAI) (model grok-4.7)` and the assistant page shows the live provider instead of the offline banner.
4. `cd backend && npm run ai:check` makes one test call and prints the reply, so a bad key or a model name the account cannot use is obvious immediately.

`AI_MODEL` defaults to `grok-4.7`; `grok-4.3` or `grok-4-1-fast-non-reasoning` are cheaper/faster options. To use another vendor instead, set `AI_PROVIDER=openai-compatible` with `AI_BASE_URL` / `AI_MODEL`. With no key at all the assistant keeps working through the built-in offline template writer and says so in the UI.

---

## Features by role

**Visitor** — public landing page (`/`) with a photo slideshow hero, live platform numbers and featured work pulled from the API, CTAs for *Join as Talent*, *Join as Promoter*, *Explore Platform*, *Get Started* and *Login*. Registration (`/register`) has separate talent and promoter flows.

**Talent** — dashboard; profile with photo, skills and completion checklist; portfolio CRUD with image / video / audio / PDF uploads, publish-hide toggle and moderation notices; event browsing with filters, enrol / withdraw; contracts (read the terms, accept or decline while pending); ratings; messages; notifications; AI writing assistant.

**Promoter** — dashboard; agency profile; licence submission with document upload; licence fee paid with MTN Mobile Money (`*126#`) or Orange Money (`#150#`) — the promoter declares the transfer (wallet number, transaction ID, optional receipt) and an administrator confirms it; event create / edit / publish / unpublish / start / complete / cancel with up to 8 event photos (choose the cover, remove photos); photos appear on event cards, the event gallery, dashboards and the landing page; talent search with portfolio previews; issue, amend, cancel and complete contracts, attach a signed PDF, rate talent after completion; messages; notifications.

**Admin** — overview with a verification queue; **licence-fee management** (`/admin/licence-fees`: set the amount in FCFA, the MTN MoMo / Orange Money merchant wallets and the instructions promoters see, confirm or reject declared transfers, refund a confirmed fee, or record a payment received at the counter); user list with suspend / deactivate / reactivate; promoter verification (approve, or reject with a reason); portfolio moderation (flag / remove / restore); reports (users, events, contracts, licence fees, verifications, moderation) with CSV export; monitoring (system health, 14-day activity, pipelines).

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
- **Licence fees** (`payments/`): `PaymentsModule`, controller, service, DTOs, `LicenceFeeService` (the admin-managed settings) and a `MobileMoneyProvider` abstraction. Cameroon pays with Mobile Money, so the bundled `ManualMobileMoneyProvider` (`PAYMENT_PROVIDER=manual`, `automatic: false`) is the honest default: the promoter transfers the fee with MTN MoMo (`*126#`) or Orange Money (`#150#`) to the merchant wallet the admin publishes, declares the transaction ID (plus an optional receipt screenshot) and an administrator — who holds the wallet — confirms or rejects it. Only the Cameroonian numbering plan is accepted for wallet numbers, and a transaction ID cannot be declared twice. Implement `MobileMoneyProvider` (Campay, MeSomb, Notch Pay, MTN MoMo API, Orange Money API, Flutterwave …) to settle transfers without an administrator touching them; the interface, the factory in `payments.module.ts` and the UI wording already support it.
  Administrators own the fee end to end in `Admin → Licence fees`: the amount in whole FCFA, the two merchant numbers, which networks are open, the instructions, the confirmation queue, refunds (sent back from the merchant wallet) and counter payments recorded on a promoter's behalf.
- **Settings** (`Setting` table): a small key/value store (prefix `licenceFee.`) so the fee can change without a redeploy; `LICENCE_FEE_AMOUNT` and `PAYMENT_CURRENCY` remain the fallbacks.
- **AI** (`ai/`): `AIController`, `AiService` and an `AiProvider` abstraction with three adapters: **Grok (xAI)** — the default, called over `https://api.x.ai/v1/chat/completions`; a generic OpenAI-compatible adapter for OpenAI / OpenRouter / a proxy (`AI_PROVIDER=openai-compatible`); and an offline template writer used automatically when no key is configured. `AiModule` picks the adapter from `AI_PROVIDER` + the presence of a key (`XAI_API_KEY`, `AI_API_KEY` or `GROK_API_KEY`) and logs the choice at boot; `/ai/status` reports it and the UI shows the live vendor and model or says plainly that it is offline. Every answer stays grounded in the signed-in talent's profile (plus the selected event), the key never leaves the server, and provider failures surface as clear messages (bad key, rate limit, unknown model, timeout). Run `npm run ai:check` in `backend/` after adding a key to test it in one call.
- **Storage** (`storage/`): `StorageService` validates MIME type and size per media type (image 10 MB, video 50 MB, audio 20 MB, PDF 10 MB) and delegates to a `StorageProvider`. `LocalStorageProvider` writes to `UPLOAD_DIR`; an S3 / Cloudinary adapter only needs to implement the same interface.
- **Status enums:** Contract `PENDING / ACTIVE / COMPLETED / CANCELLED / REJECTED`; Licence `NOT_SUBMITTED / PENDING / VERIFIED / REJECTED`; Payment `PENDING / SUCCESS / FAILED / REFUNDED` (a `PENDING` payment with `submittedAt` is waiting for administrator confirmation) with method `MTN_MOMO / ORANGE_MONEY / OFFLINE`; Event `DRAFT / PUBLISHED / ONGOING / COMPLETED / CANCELLED`.

### Database (`backend/prisma/schema.prisma`)

Entities: `User`, `Talent`, `Promoter`, `Portfolio`, `Event`, `EventImage`, `TalentEvent`, `Contract`, `Payment` (Mobile Money details, no card data), `Message`, `Notification`, `Rating`, plus supporting tables — `LicenceReview` (audit trail of admin decisions), `Setting` (admin-managed platform settings such as the licence fee and merchant wallets) and `AiMessage` (assistant history).

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
cd backend && npm test          # 71 API tests against a throw-away SQLite database
cd backend && npm run lint && npm run build
cd frontend && npm run lint && npm run typecheck && npm run build
```

**Postman / newman:** [`postman/`](postman/README.md) contains a 118-request Postman collection covering every module, and [screenshots of each request](postman/screenshots/README.md). Run it with `cd postman && npm install && npm test`.

The backend suite (`node:test` + `expect`, real Nest app, real SQLite) covers both valid and invalid paths: registration validation and duplicate emails, login failures, suspended users, role and ownership violations (403), unknown resources (404), state conflicts (409), validation errors (422), upload type and size limits, event and contract state machines, the Mobile Money licence fee (checkout → transfer declared → administrator confirm/reject → licence review), admin fee settings and counter payments, messaging, notifications, AI, admin operations and the error envelope (no stack traces).

The UI flows were additionally exercised end-to-end in a headless browser (invalid login, registration validation and duplicates, profile save, AI chat, licence submission, the Mobile Money licence fee — checkout, transfer declared, administrator confirm/reject with a corrected transaction ID — admin approval and reject-needs-reason, event create and publish, enrol, issue and accept a contract, notifications, CSV report generation) and checked for horizontal overflow at 390 px on every page.

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

- Licence-fee transfers are confirmed manually by an administrator; there is no live Mobile Money gateway adapter yet (the `MobileMoneyProvider` abstraction is in place). Refunds are recorded in the app and must be sent back from the MTN MoMo / Orange Money merchant wallet.
- Uploads use the local disk; swap `LocalStorageProvider` for S3 / Cloudinary before deploying to multiple instances.
- Email delivery is not implemented; notifications are in-app only.
- Contract terms are read-only for talent by design; talent can accept or decline a pending contract but cannot negotiate inside the app (use messages).


### Cameroon licence fee and Mobile Money

The licence fee is the platform's own charge, paid in Central African CFA francs
(`XAF`, displayed as `FCFA` with no decimals) and collected the Cameroonian way:

- **MTN Mobile Money (MoMo)** — USSD `*126#`
- **Orange Money** — USSD `#150#`

Promoters send the fee from their own wallet to the merchant number the
administrators publish, then declare the transfer in the app (wallet number,
transaction ID from the SMS receipt, optional receipt screenshot). Wallet numbers
must be Cameroonian mobile numbers (`+237 6XX XX XX XX`); prefixes are shown as a
hint (`67X / 68X / 650–654` for MTN, `69X / 655–659` for Orange) but portability
means they are not enforced. An **administrator confirms every transfer** against
the merchant wallet before the licence can be approved — this is the
`PAYMENT_PROVIDER=manual` adapter, so no live gateway is implied. The fee amount
is a platform charge, **not an official government fee**, and the demo database
ships 30,000 FCFA with two clearly-marked demo wallets that must be replaced in
`Admin → Licence fees`.

Administrators manage the fee end to end: amount (whole FCFA, 1 000 – 5 000 000),
account holder, both merchant numbers, which networks are open, the instructions,
the confirmation queue, rejections with a reason, refunds (sent back from the
merchant wallet) and counter payments recorded on a promoter's behalf. The public
registration page reads the same settings.

Contracts, event budgets and notifications are also in FCFA (contract fees are
whole amounts and budgets mentioning `$`, `€`, `USD`, `EUR` … are rejected). Event
display and entry use `Africa/Douala` (UTC+1). Demo profiles and events use
Cameroon locations, +237 contact examples, and English/French hosting examples.
Demo licence numbers and authorities are fictional (Ministry of Arts and Culture
wording is demo data), not regulatory guidance. Login credentials are unchanged.
To plug in a live aggregator later, implement `MobileMoneyProvider` (Campay,
MeSomb, Notch Pay, MTN MoMo API, Orange Money API …) and switch
`PAYMENT_PROVIDER`.

Run `cd backend && npm run prisma:migrate && npm run prisma:generate` to apply
the new database defaults. Existing contract/payment amounts and currencies are
preserved. The revised seed applies to fresh demo databases; **do not reseed a
production database** because the seed deletes existing data.
