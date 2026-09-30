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

## payments

Role: PROMOTER. Provider is selected by `PAYMENT_PROVIDER`; the bundled `sandbox` provider is clearly flagged in responses (`sandbox: true`).

| Method & path | Description |
| --- | --- |
| `GET /payments/config` | `{ provider, sandbox, currency, licenceFee, testCards[] }` (test cards only in sandbox mode). |
| `GET /payments` | Paginated history (`status` filter) plus `totalPaid`, `licence {licenceFeePaid, licenceStatus}` and `config`. |
| `POST /payments/checkout` | Creates (or reuses) a pending licence-fee payment → `{ payment, config }`. 409 if the fee is already paid. |
| `POST /payments/:id/pay` | `{ cardholderName, cardNumber, expMonth, expYear, cvc }`. Returns `{ payment, licence }`. A **declined card is a normal 200 response** with `payment.status = "FAILED"` and `failureReason`; the payment can be retried. 403 for someone else's payment, 409 if already paid, 422 for invalid card data. Only brand and last four digits are stored. |
| `GET /payments/:id` | Own payment only. |

## ai

Role: TALENT. The provider key stays on the server. `POST /ai/chat` is throttled (`AI_RATE_LIMIT`).

| Method & path | Description |
| --- | --- |
| `GET /ai/status` | `{ live, provider, model }` – `live:false` means the offline template assistant. |
| `GET /ai/history` | Your saved conversation (array). |
| `DELETE /ai/history` | Clear it. |
| `POST /ai/chat` | `{ message (2–2000 chars), task?: IMPROVE_BIO\|PORTFOLIO_DESCRIPTION\|MESSAGE_DRAFT\|EVENT_ADVICE\|SKILLS_PRESENTATION\|GENERAL, eventId? }` → `{ reply, task, live, provider, model }`. The reply is grounded in your profile (and the event, for `EVENT_ADVICE`). |

## public

| Method & path | Access | Description |
| --- | --- | --- |
| `GET /public/meta` | public | `{ specializations, genders, eventCategories, licenceFee, currency }`. |
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
| `PATCH /admin/promoters/:id/verify` | `{ approved: boolean, reason? }`. Only applications in `PENDING` can be reviewed (409 otherwise). Approval requires the fee to be paid (409); rejection requires a reason (400). Writes a `LicenceReview` row and notifies the promoter. |
| `GET /admin/portfolios` | Query `status (ACTIVE\|FLAGGED\|REMOVED), type, q`. |
| `PATCH /admin/portfolios/:id/moderate` | `{ action: FLAG\|REMOVE\|RESTORE, note? }`. `FLAG` and `REMOVE` require a note (400); the talent is notified. |
| `GET /admin/events` | Query `status, q`. |
| `GET /admin/payments` | Query `status`. |
| `POST /admin/payments/:id/refund` | Refunds a successful payment (status `REFUNDED`). |
| `GET /admin/reports/:type` | `type` = `users\|events\|contracts\|payments\|verifications\|moderation`. Query `from, to` (dates) and `format=json\|csv`. JSON: `{ type, title, generatedAt, total, columns, rows }`; CSV is returned as an attachment. |

## Status enums

| Enum | Values |
| --- | --- |
| Contract | `PENDING, ACTIVE, COMPLETED, CANCELLED, REJECTED` |
| Licence | `NOT_SUBMITTED, PENDING, VERIFIED, REJECTED` |
| Payment | `PENDING, SUCCESS, FAILED, REFUNDED` |
| Event | `DRAFT, PUBLISHED, ONGOING, COMPLETED, CANCELLED` |
| Moderation | `ACTIVE, FLAGGED, REMOVED` |
| User | `ACTIVE, SUSPENDED, DEACTIVATED` |
