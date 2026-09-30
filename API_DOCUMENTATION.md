# Talent Connect – REST API

Base URL (development): `http://localhost:4000/api`. From the web app use the same-origin proxy `/api/...`.

- All bodies are JSON unless marked **multipart**.
- Every route requires `Authorization: Bearer <accessToken>` unless marked **public**.
- Roles: `TALENT`, `PROMOTER`, `ADMIN`. A route without a role note is open to any authenticated user (with ownership rules noted in the description).
- Dates are ISO-8601 strings. Money is a number plus a `currency` code; all amounts are Central African CFA francs (`XAF`, shown as `FCFA`) in whole units.

## Conventions

### Errors

Every error uses one envelope and never contains a stack trace:

```json
{ "statusCode": 422, "message": "Validation failed. Please check the highlighted fields.",
  "errors": { "email": ["Enter a valid email address."] },
  "path": "/api/auth/register/talent", "timestamp": "2026-09-30T10:00:00.000Z" }
```

| Status | Meaning |
| --- | --- |
| 400 | Malformed request or a rule that cannot be fixed by editing one field (e.g. licence already expired) |
| 401 | Missing, invalid or revoked token; wrong login credentials |
| 403 | Authenticated but not allowed (wrong role, not the owner, suspended account, unverified promoter) |
| 404 | Resource does not exist (or is not visible to you) |
| 409 | State conflict (duplicate email, already enrolled, illegal status transition, fee already paid) |
| 413 | Uploaded file or body too large |
| 422 | DTO validation failed – `errors` maps field → messages. Unknown properties are rejected |
| 429 | Rate limit exceeded |
| 500 | Unexpected error (generic message; details only in server logs) |

### Pagination

List endpoints accept `page` (default 1) and `pageSize` (default 10, max 50) and return:

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 10, "totalPages": 1 }
```

Some lists add `counts` (per-status totals) or other summary fields, noted below.

### Authentication

`POST /auth/login` returns `{ "accessToken": "…", "user": { … } }`. Tokens embed a `tokenVersion`; changing the password or suspending/deactivating a user revokes all previous tokens. Suspended or deactivated users get `403` on login.

Password rule: 8–72 characters with an uppercase letter, a lowercase letter and a digit. Phone: `^\+?[0-9()\-\s]{7,20}$`.

### Uploads

**multipart** endpoints validate MIME type and size server-side: image (JPEG, PNG, GIF, WebP) 10 MB · video (MP4, WebM, QuickTime) 50 MB · audio (MP3, WAV, OGG, AAC…) 20 MB · PDF 10 MB. Files are served from `/uploads/...`; the returned URLs are relative.

---

## auth

| Method & path | Access | Description |
| --- | --- | --- |
| `POST /auth/register/talent` | public, throttled | Body `firstName, lastName, email, phone, password, confirmPassword, gender (FEMALE\|MALE\|NON_BINARY\|PREFER_NOT_TO_SAY), specialization`. Returns `{accessToken,user}` (201). 409 if the email exists. |
| `POST /auth/register/promoter` | public, throttled | Same personal fields plus `agencyName, licenceNumber, licenceInfo?`. |
| `POST /auth/login` | public, throttled | `{ email, password }`. 401 for bad credentials, 403 if suspended. |
| `POST /auth/logout` | any | Stateless acknowledgement (clients discard the token). |
| `GET /auth/me` | any | Current user with `talent` / `promoter` summary. |

## users

| Method & path | Description |
| --- | --- |
| `PATCH /users/me` | Update `firstName, lastName, phone`. |
| `PATCH /users/me/password` | `{ currentPassword, newPassword }`. 401 if the current password is wrong; 400 if unchanged. Revokes old tokens. |
| `POST /users/me/avatar` | **multipart**, field `file` (image). |
| `GET /users/:id/summary` | Minimal public card (name, avatar, role, headline) used by messaging. |

## talents

| Method & path | Access | Description |
| --- | --- | --- |
| `GET /talents/me` | TALENT | Own profile incl. `completion` checklist. |
| `PATCH /talents/me` | TALENT | `firstName, lastName, phone, gender, specialization, location, bio, skills[], experienceYears, website`. |
| `GET /talents/me/dashboard` | TALENT | Completion, rating, portfolio counts, upcoming events, pending contracts, unread counts, recent notifications. |
| `GET /talents/specializations` | PROMOTER, ADMIN | List of specializations. |
| `GET /talents` | PROMOTER, ADMIN | Search. Query: `q, specialization, location, minRating, minExperience, gender, sort (rating\|experience\|newest\|name)`. Each item includes `portfolioPreview`. |
| `GET /talents/:id` | PROMOTER, ADMIN | Profile + published portfolio + rating summary + reviews + your contracts with this talent. |

## promoters

All routes: PROMOTER.

| Method & path | Description |
| --- | --- |
| `GET /promoters/me` | Agency profile, licence state, `licenceHistory`. |
| `PATCH /promoters/me` | `firstName, lastName, phone, agencyName, agencyDescription, website, location`. |
| `GET /promoters/me/dashboard` | Licence state, events by status, contract counts, payments, upcoming events, latest applicants, pending contracts, notifications. |
| `POST /promoters/me/licence` | **multipart**: `licenceNumber, licenceAuthority, licenceExpiry, licenceInfo?`, optional file `document` (PDF/image). 409 if already verified, 400 if expired. When details **and** the fee are in, status moves to `PENDING` automatically and admins are notified. |

## portfolios

| Method & path | Access | Description |
| --- | --- | --- |
| `GET /portfolios/mine` | TALENT | Paginated. Query `type (IMAGE\|VIDEO\|AUDIO\|DOCUMENT), q`. |
| `GET /portfolios/talent/:talentId` | any role | Published, non-removed items (owner and admin also see the rest). |
| `GET /portfolios/:id` | any | One item (hidden or removed items only for owner/admin). |
| `POST /portfolios` | TALENT | **multipart**: `title, description?, isPublished?`, `file` (required). Media type is derived from the file. |
| `PATCH /portfolios/:id` | TALENT (owner) | **multipart**: `title?, description?, isPublished?`, optional replacement `file`. Removed items cannot be republished. |
| `DELETE /portfolios/:id` | TALENT (owner) | Deletes the row and the stored file. |

## events

Every event object includes `coverImageUrl` (first photo or `null`) and `images: [{ id, url, fileName }]` in display order. Dashboard and landing event summaries include `coverImageUrl`.

Event statuses: `DRAFT → PUBLISHED / CANCELLED`, `PUBLISHED → DRAFT / ONGOING / CANCELLED`, `ONGOING → COMPLETED / CANCELLED`. Publishing and editing rules: a promoter must be `VERIFIED` to publish; completed/cancelled events cannot be edited; unpublishing is blocked once talent has enrolled; only `DRAFT` events without enrolments or contracts can be deleted.

| Method & path | Access | Description |
| --- | --- | --- |
| `GET /events` | any | Public browse (published/ongoing). Query `q, category, location, from, to, sort (date\|newest)`. Talent results include `enrolled` and `myContract`. |
| `GET /events/mine` | PROMOTER | Own events. Query `status, q`; adds `counts`. |
| `GET /events/enrolled/mine` | TALENT | Query `when (upcoming\|past\|all)`. |
| `POST /events` | PROMOTER | `title, location, description (≥30 chars), category?, talentNeeded?, budget?, eventDate (future), publish?`. `budget` is free text in FCFA (e.g. `300,000 – 450,000 FCFA`); text containing `$ € £ ₦` or `USD/EUR/GBP/NGN/GHS/ZAR/KES` is rejected with 422. Photos are added afterwards with `POST /events/:id/images`. |
| `GET /events/:id` | any | Drafts are visible only to their owner (and admin). |
| `PATCH /events/:id` | PROMOTER (owner) | Partial update. |
| `DELETE /events/:id` | PROMOTER (owner) | See rules above. |
| `PATCH /events/:id/status` | PROMOTER (owner) | `{ status }` following the transitions above. |
| `POST /events/:id/publish` · `/unpublish` · `/cancel` | PROMOTER (owner) | Shortcuts. Cancelling notifies enrolled talent and cancels open contracts. |
| `POST /events/:id/images` | PROMOTER (owner) | `multipart/form-data`, field **`images`** (one or more files). JPEG/PNG/GIF/WebP only (415 otherwise, magic bytes checked), 10 MB each (413), max 8 photos per event (400). Not allowed on `COMPLETED`/`CANCELLED` events (409). Returns the event. |
| `PATCH /events/:id/images/:imageId/cover` | PROMOTER (owner) | Makes the photo the cover (moves it first). Returns the event. |
| `DELETE /events/:id/images/:imageId` | PROMOTER (owner) | Removes the photo and its file. Returns the event. |
| `GET /events/:id/enrollments` | PROMOTER (owner), ADMIN | Enrolled talent with notes. |
| `POST /events/:id/enroll` | TALENT | `{ note? }`. 404 if the event is not `PUBLISHED`, 409 if already enrolled or the event date has passed. |
| `DELETE /events/:id/enroll` | TALENT | Withdraw (blocked while an active contract exists). |

## contracts

Statuses: `PENDING → ACTIVE (talent accepts) / REJECTED (talent declines) / CANCELLED`, `ACTIVE → COMPLETED / CANCELLED`.

| Method & path | Access | Description |
| --- | --- | --- |
| `GET /contracts` | TALENT, PROMOTER | Only your own contracts. Query `status, q`; adds `counts`. |
| `GET /contracts/:id` | participants, ADMIN | 403 for anyone else. |
| `POST /contracts` | PROMOTER (verified) | `talentId, eventId, terms, amount?, currency?, reviewNotes?, contractDate?`. `amount` is a whole number of FCFA (≤ 100,000,000); `currency` may be omitted or `XAF` — anything else is 422. The event must be yours and `PUBLISHED`/`ONGOING`. 409 if an open contract already exists for the pair. |
| `PATCH /contracts/:id` | PROMOTER (owner) | `terms?, amount?, reviewNotes?` while `PENDING`/`ACTIVE`. |
| `PATCH /contracts/:id/status` | PROMOTER (owner) | `{ status }` – only `CANCELLED` (from PENDING/ACTIVE) or `COMPLETED` (from ACTIVE). |
| `POST /contracts/:id/document` | PROMOTER (owner) | **multipart**, field `file` (PDF). |
| `POST /contracts/:id/respond` | TALENT (party) | `{ decision: "ACCEPT"\|"REJECT", note? }` while `PENDING`. A note is required to decline. |

## ratings

| Method & path | Access | Description |
| --- | --- | --- |
| `GET /ratings/me` | TALENT | `{ summary:{average,count,distribution}, reviews: Page }`. |
| `GET /ratings/talent/:talentId` | PROMOTER, ADMIN | Same shape for one talent. |
| `POST /ratings` | PROMOTER | `{ contractId, score (1–5), comment? }`. Only for your own contracts (403 otherwise); 400 if the contract is not completed, 409 if already rated. Updates the talent's average. |

## messages

Roles: TALENT, PROMOTER. Users can only read and write their own conversations.

| Method & path | Description |
| --- | --- |
| `GET /messages/conversations` | Array of `{ user, lastMessage, unread }`. |
| `GET /messages/unread-count` | `{ count }`. |
| `GET /messages/conversations/:userId` | Messages with that user (oldest first). |
| `PATCH /messages/conversations/:userId/read` | Mark the thread read. |
| `POST /messages` | `{ recipientId, content }`. Recipient must be an active talent/promoter (not yourself, not an admin). Creates a notification. |
| `PATCH /messages/:id/read` | Only the recipient may mark a message read. |

## notifications

| Method & path | Description |
| --- | --- |
| `GET /notifications` | Paginated, newest first. Query `unread=true`. |
| `GET /notifications/unread-count` | `{ count }`. |
| `PATCH /notifications/read-all` | Mark all read. |
| `PATCH /notifications/:id/read` | Only the owner (404 otherwise). |

Notification types: `CONTRACT, EVENT, LICENCE, PAYMENT, MESSAGE, RATING, ADMIN`.

## payments — licence fee in Cameroon

Role: PROMOTER. The licence fee is charged in CFA francs (XAF / FCFA) and collected with **Mobile Money**: MTN MoMo (`*126#`) or Orange Money (`#150#`) on the merchant wallets an administrator manages in `Admin → Licence fees`. The bundled `manual` adapter (`PAYMENT_PROVIDER=manual`) leaves the confirmation to an administrator; a live aggregator (Campay, MeSomb, Notch Pay, MTN MoMo API, Orange Money API, Flutterwave) can implement `MobileMoneyProvider` and settle transfers automatically.

| Method & path | Description |
| --- | --- |
| `GET /payments/config` | `{ provider, automatic, currency, licenceFee, payeeName, instructions, methods[], suggestedPayerPhone? }` where each method is `{ value: MTN_MOMO\|ORANGE_MONEY, label, shortLabel, ussd, prefixes, enabled, number }`. The fee and numbers come from the settings administrators edit. |
| `GET /payments` | Paginated history (`status`, `method` filters) plus `totalPaid`, `awaitingConfirmation`, `licence {licenceFeePaid, licenceStatus}` and `config`. |
| `POST /payments/checkout` | Creates (or reuses) the pending fee record and returns its `providerRef` (e.g. `TC-LIC-8F3A21`) — the reference the promoter quotes in the transfer. 409 when the fee is already confirmed or a transfer is already waiting for confirmation. |
| `POST /payments/:id/submit` | Multipart: `method (MTN_MOMO\|ORANGE_MONEY)`, `payerName`, `payerPhone` (+237 6XX XX XX XX), `transactionRef` (transaction ID from the SMS receipt) and an optional `receipt` file (image or PDF, 10 MB). Returns `{ payment, licence }`. With the manual adapter the payment stays `PENDING` until an administrator confirms it; the mobile number must be Cameroonian (422 otherwise), a transaction ID already declared elsewhere is refused (409), and a rejected transfer can be resubmitted with a corrected ID. |
| `GET /payments/:id` | Own payment only. |

Payment records store the method, payer name and number, transaction ID, optional receipt and the administrator's review note. Card data is never involved.

## ai

Role: TALENT. The model answers through Grok (xAI) by default; the API key stays on the server (never in a response or the browser). `POST /ai/chat` is throttled (`AI_RATE_LIMIT`).

Configuration (backend `.env`): `XAI_API_KEY` (or `AI_API_KEY` / `GROK_API_KEY`) switches the assistant on, `AI_PROVIDER` chooses the adapter (`grok` — the default — `openai-compatible`, or `offline`), `AI_MODEL` defaults to `grok-4.7`, `AI_BASE_URL` defaults to `https://api.x.ai/v1`, `AI_MAX_TOKENS` / `AI_TIMEOUT_MS` bound each call. With no key configured the platform serves the offline template assistant instead and `/ai/status` says so. Provider problems (rejected key, rate limit, unknown model, timeout) return 503 with a plain-language message.

| Method & path | Description |
| --- | --- |
| `GET /ai/status` | `{ live, provider, providerLabel, model, mode }` – `live:false` (mode `offline`) means the offline template assistant; `providerLabel` is the vendor shown in the UI (e.g. "Grok (xAI)"). |
| `GET /ai/history` | Your saved conversation (array). |
| `DELETE /ai/history` | Clear it. |
| `POST /ai/chat` | `{ message (2–2000 chars), task?: IMPROVE_BIO\|PORTFOLIO_DESCRIPTION\|MESSAGE_DRAFT\|EVENT_ADVICE\|SKILLS_PRESENTATION\|GENERAL, eventId? }` → `{ reply, task, live, provider, providerLabel, model, mode }`. The reply is grounded in your profile (and the event, for `EVENT_ADVICE`); the licence fee it mentions is the platform's own FCFA charge paid with MTN MoMo or Orange Money, not a government fee. |

## public

| Method & path | Access | Description |
| --- | --- | --- |
| `GET /public/meta` | public | `{ specializations, genders, eventCategories, licenceFee, currency, licenceFeeMethods[] }` — the fee and Mobile Money wallets administrators manage. |
| `GET /public/landing` | public | Live statistics, featured upcoming events and showcase work for the landing page. Contains no private data. |

## admin

All routes: ADMIN.

| Method & path | Description |
| --- | --- |
| `GET /admin/stats` | Totals, status breakdowns, revenue, pending licences, flagged items, recent users. |
| `GET /admin/monitoring` | 14-day series, licence pipeline, moderation breakdown, recent activity, system health (uptime, memory, DB latency, record counts). |
| `GET /admin/users` | Query `role, status, q`. |
| `PATCH /admin/users/:id/status` | `{ status: ACTIVE\|SUSPENDED\|DEACTIVATED, reason? }`. Admin accounts and your own account cannot be changed. Non-active statuses revoke tokens and notify the user. |
| `GET /admin/promoters` | Query `status (licence), q`. |
| `GET /admin/promoters/:id` | Licence details, payments, events, review history. |
| `PATCH /admin/promoters/:id/verify` | `{ approved: boolean, reason? }`. Only applications in `PENDING` can be reviewed (409 otherwise). Approval requires the licence fee to be confirmed (409); rejection requires a reason (400). Writes a `LicenceReview` row and notifies the promoter. |
| `GET /admin/portfolios` | Query `status (ACTIVE\|FLAGGED\|REMOVED), type, q`. |
| `PATCH /admin/portfolios/:id/moderate` | `{ action: FLAG\|REMOVE\|RESTORE, note? }`. `FLAG` and `REMOVE` require a note (400); the talent is notified. |
| `GET /admin/events` | Query `status, q`. |
| `GET /admin/licence-fee` | The fee administrators own: `{ settings, limits, demoWalletsInUse, overview, promoters }`. `overview` gives collected / refunded / awaiting amounts and counts; `promoters` lists the agencies that still owe the fee. |
| `PATCH /admin/licence-fee` | `{ amount, payeeName, mtnNumber, orangeNumber, mtnEnabled, orangeEnabled, instructions }`, all optional. The amount is a whole FCFA value between 1 000 and 5 000 000 (422 otherwise), the numbers must be Cameroonian mobiles (422) and both services cannot be disabled at once (400). |
| `GET /admin/payments` | Query `status`, `method`, `q` (agency, payer, transaction ID, reference) and `awaiting=true` for the confirmation queue. Rows include the promoter contact. |
| `POST /admin/payments/manual` | Records a fee received outside the app: `{ promoterId, method?: OFFLINE\|MTN_MOMO\|ORANGE_MONEY, amount?, payerName?, payerPhone?, transactionRef?, note? }`. Creates a confirmed payment, marks the fee paid and notifies the promoter. 409 when the fee is already settled, 404 for an unknown promoter. |
| `POST /admin/payments/:id/confirm` | Confirms a declared transfer: `{ note? }`. Only a `PENDING` transfer that a promoter submitted can be confirmed (409). Sets the fee as paid, which moves a complete licence into review. |
| `POST /admin/payments/:id/reject` | `{ reason }`. Marks the transfer `FAILED`, stores the reason and notifies the promoter so they can correct the transaction ID and resubmit. |
| `POST /admin/payments/:id/refund` | `{ note? }`. Refunds a confirmed payment (status `REFUNDED`); the fee becomes outstanding again and a licence still under review returns to `NOT_SUBMITTED`. The money is returned from the MTN MoMo / Orange Money merchant wallet. |
| `GET /admin/reports/:type` | `type` = `users\|events\|contracts\|payments\|verifications\|moderation`. Query `from, to` (dates) and `format=json\|csv`. JSON: `{ type, title, generatedAt, total, columns, rows }`; CSV is returned as an attachment. |

## Status enums

| Enum | Values |
| --- | --- |
| Contract | `PENDING, ACTIVE, COMPLETED, CANCELLED, REJECTED` |
| Licence | `NOT_SUBMITTED, PENDING, VERIFIED, REJECTED` |
| Payment | `PENDING, SUCCESS, FAILED, REFUNDED` (`PENDING` with `submittedAt` = waiting for administrator confirmation) |
| Payment method | `MTN_MOMO, ORANGE_MONEY, OFFLINE` |
| Event | `DRAFT, PUBLISHED, ONGOING, COMPLETED, CANCELLED` |
| Moderation | `ACTIVE, FLAGGED, REMOVED` |
| User | `ACTIVE, SUSPENDED, DEACTIVATED` |
