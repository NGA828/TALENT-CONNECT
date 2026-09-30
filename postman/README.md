# Talent Connect – Postman API tests

This folder holds the Postman test suite for the REST API and screenshots of every request.

| File / folder | What it is |
| --- | --- |
| [`TalentConnect.postman_collection.json`](TalentConnect.postman_collection.json) | Postman collection (v2.1): **15 folders, 108 requests, 405 test assertions** |
| [`TalentConnect.local.postman_environment.json`](TalentConnect.local.postman_environment.json) | Environment: `baseUrl` and the seeded demo logins |
| [`screenshots/`](screenshots/README.md) | One screenshot per request plus Collection Runner summaries. **Start with [`screenshots/README.md`](screenshots/README.md)** |
| `scripts/build-collection.js` | Builds the collection and environment JSON files |
| `scripts/render-screenshots.mjs` | Makes the screenshots from a newman JSON report |

## What the collection covers

| # | Folder | Endpoints tested |
| --- | --- | --- |
| 01 | Public | `/public/meta`, `/public/landing` |
| 02 | Auth | register talent / promoter (201, 409 duplicate, 422 validation), login for all 3 roles, wrong password (401), `/auth/me` with and without a token |
| 03 | Users | update account, avatar upload (multipart), change password, old token revoked (401), wrong current password (401), user summary |
| 04 | Talents | profile, update, dashboard, specializations, search, get by id, role check (403) |
| 05 | Promoters | profile, update, dashboard, licence submission with PDF (multipart), expired licence (400) |
| 06 | Portfolios | upload image (multipart), missing file (400), list, get, update |
| 07 | Events | create (published and draft), validation (422), browse, mine, get, update, enrol, double enrol (409), enrolments, publish/unpublish, not the owner (403), unknown id (404) |
| 08 | Contracts | create, duplicate (409), list, get, amend, talent accepts, attach PDF, complete, not a party (403) |
| 09 | Ratings | rate, rate twice (409), my ratings, a talent's ratings |
| 10 | Messages | send, empty message (422), conversations, unread count, thread, mark read |
| 11 | Notifications | list, unread count, mark one read, mark all read |
| 12 | Payments | config, checkout, declined card, invalid card (422), successful card, history, get by id |
| 13 | AI assistant | status, chat, history, clear history |
| 14 | Admin | stats, monitoring, users, verification queue, promoter details, reject without a reason (400), approve, portfolio flag/restore, events, payments, refund, JSON report, CSV export, suspend user, suspended token revoked (401), non-admin (403) |
| 15 | Cleanup | delete draft event, delete portfolio item, logout |

Each request checks the status code, the response time (under 2 s), the content type, and at least one thing in the response body. Error responses also check the standard error format and that no stack trace leaks out. Requests save tokens and ids (`talentToken`, `eventId`, `contractId`, `paymentId`, …) to collection variables for the requests that follow them.

## Run it in Postman

1. Start the API on a **freshly seeded** database (`cd backend && npm run db:reset && npm run start:dev`).
2. In Postman, **Import** both JSON files and select the **Talent Connect – Local** environment.
3. Open the collection and click **Run**. Keep the default order: requests depend on earlier ones.
4. For the multipart requests (avatar, portfolio, licence, contract PDF), Postman must be able to reach the files in `backend/seed-assets/`. Set your Postman *working directory* (Settings → General) to the repository root, or pick the files again in each request's Body tab.

## Run it from the command line (newman)

```bash
cd postman
npm install
npm test               # newman run → results/newman-run.json (git-ignored)
```

## Regenerate the screenshots

```bash
cd postman
npm test                                  # fresh run against a freshly seeded API
npx playwright install chromium           # once, or set CHROME_PATH=/path/to/chrome
npm run screenshots                       # → screenshots/**.png and screenshots/README.md
```

The screenshots are **drawn by a script in a Postman-style layout**. They are not captures of the Postman desktop app. Everything in them comes from a real run of this collection with newman, Postman's official command-line runner: the request, the URL, the auth, the body, the status, the time, the size, the response body and the test results. For captures of the real Postman app, import the collection and run it as described above.

> The seed data (and so the ids and timestamps in the screenshots) changes on every `db:reset`. The collection adds a unique `runId` to new e-mail addresses, so you can run it more than once without a reset. A clean database still gives the tidiest results.
