# Talent Connect – Postman API test screenshots

Generated from a newman run on 2026-09-30 12:37:51 UTC against a freshly seeded local API.

**113 requests · 426 assertions · 0 failed · total 7.8s · average response 49 ms**

## Collection Runner

- [Runner results – page 1](00-collection-runner/runner-results-01.png)
- [Runner results – page 2](00-collection-runner/runner-results-02.png)
- [Runner results – page 3](00-collection-runner/runner-results-03.png)
- [Runner results – page 4](00-collection-runner/runner-results-04.png)
- [Runner results – page 5](00-collection-runner/runner-results-05.png)
- [Runner results – page 6](00-collection-runner/runner-results-06.png)
- [Runner results – page 7](00-collection-runner/runner-results-07.png)
- [Runner results – page 8](00-collection-runner/runner-results-08.png)
- [Runner results – page 9](00-collection-runner/runner-results-09.png)
- [Runner results – page 10](00-collection-runner/runner-results-10.png)
- [Runner results – page 11](00-collection-runner/runner-results-11.png)
- [Runner results – page 12](00-collection-runner/runner-results-12.png)
- [Runner results – page 13](00-collection-runner/runner-results-13.png)
- [Runner results – page 14](00-collection-runner/runner-results-14.png)
- [Runner results – page 15](00-collection-runner/runner-results-15.png)
- [Runner results – page 16](00-collection-runner/runner-results-16.png)
- [Runner results – page 17](00-collection-runner/runner-results-17.png)
- [Runner results – page 18](00-collection-runner/runner-results-18.png)
- [Runner results – page 19](00-collection-runner/runner-results-19.png)


## 01 · Public

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Get platform metadata | `GET /public/meta` | 200 OK | 28 ms | 4/4 ✅ | [view](01-public/01-get-platform-metadata.png) |
| 02 | Get landing page data | `GET /public/landing` | 200 OK | 59 ms | 4/4 ✅ | [view](01-public/02-get-landing-page-data.png) |

## 02 · Auth

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Register talent | `POST /auth/register/talent` | 201 Created | 290 ms | 4/4 ✅ | [view](02-auth/01-register-talent.png) |
| 02 | Register talent – duplicate email (409) | `POST /auth/register/talent` | 409 Conflict | 7 ms | 4/4 ✅ | [view](02-auth/02-register-talent-duplicate-email-409.png) |
| 03 | Register talent – validation errors (422) | `POST /auth/register/talent` | 422 Unprocessable Entity | 5 ms | 5/5 ✅ | [view](02-auth/03-register-talent-validation-errors-422.png) |
| 04 | Register promoter | `POST /auth/register/promoter` | 201 Created | 259 ms | 4/4 ✅ | [view](02-auth/04-register-promoter.png) |
| 05 | Login – admin | `POST /auth/login` | 200 OK | 259 ms | 4/4 ✅ | [view](02-auth/05-login-admin.png) |
| 06 | Login – talent | `POST /auth/login` | 200 OK | 254 ms | 4/4 ✅ | [view](02-auth/06-login-talent.png) |
| 07 | Login – promoter | `POST /auth/login` | 200 OK | 254 ms | 4/4 ✅ | [view](02-auth/07-login-promoter.png) |
| 08 | Login – wrong password (401) | `POST /auth/login` | 401 Unauthorized | 248 ms | 4/4 ✅ | [view](02-auth/08-login-wrong-password-401.png) |
| 09 | Get current user (me) | `GET /auth/me` | 200 OK | 10 ms | 4/4 ✅ | [view](02-auth/09-get-current-user-me.png) |
| 10 | Get current user – no token (401) | `GET /auth/me` | 401 Unauthorized | 3 ms | 4/4 ✅ | [view](02-auth/10-get-current-user-no-token-401.png) |

## 03 · Users

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Update my account | `PATCH /users/me` | 200 OK | 12 ms | 4/4 ✅ | [view](03-users/01-update-my-account.png) |
| 02 | Upload avatar (multipart) | `POST /users/me/avatar` | 201 Created | 22 ms | 4/4 ✅ | [view](03-users/02-upload-avatar-multipart.png) |
| 03 | Change password | `PATCH /users/me/password` | 200 OK | 496 ms | 4/4 ✅ | [view](03-users/03-change-password.png) |
| 04 | Old token revoked after password change (401) | `GET /auth/me` | 401 Unauthorized | 6 ms | 4/4 ✅ | [view](03-users/04-old-token-revoked-after-password-change-401.png) |
| 05 | Login with the new password | `POST /auth/login` | 200 OK | 253 ms | 4/4 ✅ | [view](03-users/05-login-with-the-new-password.png) |
| 06 | Change password – wrong current password (401) | `PATCH /users/me/password` | 401 Unauthorized | 251 ms | 4/4 ✅ | [view](03-users/06-change-password-wrong-current-password-401.png) |
| 07 | Get user summary card | `GET /users/{{promoterUserId}}/summary` | 200 OK | 6 ms | 4/4 ✅ | [view](03-users/07-get-user-summary-card.png) |

## 04 · Talents

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Get my talent profile | `GET /talents/me` | 200 OK | 8 ms | 4/4 ✅ | [view](04-talents/01-get-my-talent-profile.png) |
| 02 | Update my talent profile | `PATCH /talents/me` | 200 OK | 16 ms | 4/4 ✅ | [view](04-talents/02-update-my-talent-profile.png) |
| 03 | Get talent dashboard | `GET /talents/me/dashboard` | 200 OK | 17 ms | 3/3 ✅ | [view](04-talents/03-get-talent-dashboard.png) |
| 04 | List specializations | `GET /talents/specializations` | 200 OK | 7 ms | 4/4 ✅ | [view](04-talents/04-list-specializations.png) |
| 05 | Search talents | `GET /talents?specialization=Photographer&sort=rating&page=1&pageSize=5` | 200 OK | 12 ms | 4/4 ✅ | [view](04-talents/05-search-talents.png) |
| 06 | Get talent by id | `GET /talents/{{talentId}}` | 200 OK | 13 ms | 4/4 ✅ | [view](04-talents/06-get-talent-by-id.png) |
| 07 | Search talents as talent – forbidden (403) | `GET /talents` | 403 Forbidden | 6 ms | 4/4 ✅ | [view](04-talents/07-search-talents-as-talent-forbidden-403.png) |

## 05 · Promoters

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Get my promoter profile | `GET /promoters/me` | 200 OK | 9 ms | 4/4 ✅ | [view](05-promoters/01-get-my-promoter-profile.png) |
| 02 | Update my promoter profile | `PATCH /promoters/me` | 200 OK | 25 ms | 4/4 ✅ | [view](05-promoters/02-update-my-promoter-profile.png) |
| 03 | Get promoter dashboard | `GET /promoters/me/dashboard` | 200 OK | 18 ms | 3/3 ✅ | [view](05-promoters/03-get-promoter-dashboard.png) |
| 04 | Submit licence (multipart) | `POST /promoters/me/licence` | 201 Created | 18 ms | 4/4 ✅ | [view](05-promoters/04-submit-licence-multipart.png) |
| 05 | Submit licence – expired date (400) | `POST /promoters/me/licence` | 400 Bad Request | 8 ms | 4/4 ✅ | [view](05-promoters/05-submit-licence-expired-date-400.png) |

## 06 · Portfolios

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Upload portfolio item (multipart) | `POST /portfolios` | 201 Created | 11 ms | 4/4 ✅ | [view](06-portfolios/01-upload-portfolio-item-multipart.png) |
| 02 | Upload portfolio – missing file (400/422) | `POST /portfolios` | 400 Bad Request | 7 ms | 4/4 ✅ | [view](06-portfolios/02-upload-portfolio-missing-file-400-422.png) |
| 03 | List my portfolio | `GET /portfolios/mine?type=IMAGE&page=1&pageSize=5` | 200 OK | 9 ms | 4/4 ✅ | [view](06-portfolios/03-list-my-portfolio.png) |
| 04 | Get portfolio item | `GET /portfolios/{{portfolioId}}` | 200 OK | 8 ms | 3/3 ✅ | [view](06-portfolios/04-get-portfolio-item.png) |
| 05 | Update portfolio item | `PATCH /portfolios/{{portfolioId}}` | 200 OK | 11 ms | 4/4 ✅ | [view](06-portfolios/05-update-portfolio-item.png) |
| 06 | Get a talent's public portfolio | `GET /portfolios/talent/{{talentId}}` | 200 OK | 7 ms | 3/3 ✅ | [view](06-portfolios/06-get-a-talent-s-public-portfolio.png) |

## 07 · Events

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Create event (publish) | `POST /events` | 201 Created | 15 ms | 4/4 ✅ | [view](07-events/01-create-event-publish.png) |
| 02 | Create draft event | `POST /events` | 201 Created | 12 ms | 4/4 ✅ | [view](07-events/02-create-draft-event.png) |
| 03 | Create event – validation errors (422) | `POST /events` | 422 Unprocessable Entity | 8 ms | 4/4 ✅ | [view](07-events/03-create-event-validation-errors-422.png) |
| 04 | Browse events (talent) | `GET /events?sort=date&page=1&pageSize=5` | 200 OK | 10 ms | 4/4 ✅ | [view](07-events/04-browse-events-talent.png) |
| 05 | List my events (promoter) | `GET /events/mine?page=1&pageSize=5` | 200 OK | 10 ms | 4/4 ✅ | [view](07-events/05-list-my-events-promoter.png) |
| 06 | Get event by id | `GET /events/{{eventId}}` | 200 OK | 10 ms | 3/3 ✅ | [view](07-events/06-get-event-by-id.png) |
| 07 | Update event | `PATCH /events/{{eventId}}` | 200 OK | 14 ms | 4/4 ✅ | [view](07-events/07-update-event.png) |
| 08 | Update event – foreign-currency budget (422) | `PATCH /events/{{eventId}}` | 422 Unprocessable Entity | 5 ms | 5/5 ✅ | [view](07-events/08-update-event-foreign-currency-budget-422.png) |
| 09 | Upload event photos (multipart) | `POST /events/{{eventId}}/images` | 201 Created | 18 ms | 4/4 ✅ | [view](07-events/09-upload-event-photos-multipart.png) |
| 10 | Upload event photo – not an image (415) | `POST /events/{{eventId}}/images` | 415 Unsupported Media Type | 8 ms | 4/4 ✅ | [view](07-events/10-upload-event-photo-not-an-image-415.png) |
| 11 | Set event cover photo | `PATCH /events/{{eventId}}/images/{{eventImageId}}/cover` | 200 OK | 16 ms | 4/4 ✅ | [view](07-events/11-set-event-cover-photo.png) |
| 12 | Delete event photo | `DELETE /events/{{eventId}}/images/{{eventImageId}}` | 200 OK | 13 ms | 4/4 ✅ | [view](07-events/12-delete-event-photo.png) |
| 13 | Enrol in event (talent) | `POST /events/{{eventId}}/enroll` | 201 Created | 16 ms | 3/3 ✅ | [view](07-events/13-enrol-in-event-talent.png) |
| 14 | Enrol again – conflict (409) | `POST /events/{{eventId}}/enroll` | 409 Conflict | 7 ms | 4/4 ✅ | [view](07-events/14-enrol-again-conflict-409.png) |
| 15 | List my enrolments (talent) | `GET /events/enrolled/mine?when=upcoming` | 200 OK | 11 ms | 3/3 ✅ | [view](07-events/15-list-my-enrolments-talent.png) |
| 16 | List event enrolments (promoter) | `GET /events/{{eventId}}/enrollments` | 200 OK | 8 ms | 3/3 ✅ | [view](07-events/16-list-event-enrolments-promoter.png) |
| 17 | Publish draft event | `POST /events/{{draftEventId}}/publish` | 201 Created | 19 ms | 4/4 ✅ | [view](07-events/17-publish-draft-event.png) |
| 18 | Unpublish event | `POST /events/{{draftEventId}}/unpublish` | 201 Created | 12 ms | 4/4 ✅ | [view](07-events/18-unpublish-event.png) |
| 19 | Update event as talent – forbidden (403) | `PATCH /events/{{eventId}}` | 403 Forbidden | 5 ms | 4/4 ✅ | [view](07-events/19-update-event-as-talent-forbidden-403.png) |
| 20 | Get unknown event (404) | `GET /events/does-not-exist` | 404 Not Found | 7 ms | 4/4 ✅ | [view](07-events/20-get-unknown-event-404.png) |

## 08 · Contracts

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Create contract | `POST /contracts` | 201 Created | 20 ms | 4/4 ✅ | [view](08-contracts/01-create-contract.png) |
| 02 | Create contract – duplicate (409) | `POST /contracts` | 409 Conflict | 10 ms | 4/4 ✅ | [view](08-contracts/02-create-contract-duplicate-409.png) |
| 03 | List my contracts (talent) | `GET /contracts?status=PENDING` | 200 OK | 11 ms | 4/4 ✅ | [view](08-contracts/03-list-my-contracts-talent.png) |
| 04 | Get contract by id | `GET /contracts/{{contractId}}` | 200 OK | 8 ms | 3/3 ✅ | [view](08-contracts/04-get-contract-by-id.png) |
| 05 | Amend contract | `PATCH /contracts/{{contractId}}` | 200 OK | 18 ms | 4/4 ✅ | [view](08-contracts/05-amend-contract.png) |
| 06 | Respond to contract – accept (talent) | `POST /contracts/{{contractId}}/respond` | 201 Created | 18 ms | 4/4 ✅ | [view](08-contracts/06-respond-to-contract-accept-talent.png) |
| 07 | Attach signed contract PDF (multipart) | `POST /contracts/{{contractId}}/document` | 201 Created | 18 ms | 3/3 ✅ | [view](08-contracts/07-attach-signed-contract-pdf-multipart.png) |
| 08 | Complete contract | `PATCH /contracts/{{contractId}}/status` | 200 OK | 24 ms | 4/4 ✅ | [view](08-contracts/08-complete-contract.png) |
| 09 | Get contract as another talent – forbidden (403) | `GET /contracts/{{contractId}}` | 403 Forbidden | 13 ms | 4/4 ✅ | [view](08-contracts/09-get-contract-as-another-talent-forbidden-403.png) |

## 09 · Ratings

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Rate talent | `POST /ratings` | 201 Created | 18 ms | 4/4 ✅ | [view](09-ratings/01-rate-talent.png) |
| 02 | Rate again – conflict (409) | `POST /ratings` | 409 Conflict | 8 ms | 4/4 ✅ | [view](09-ratings/02-rate-again-conflict-409.png) |
| 03 | Get my ratings (talent) | `GET /ratings/me` | 200 OK | 10 ms | 4/4 ✅ | [view](09-ratings/03-get-my-ratings-talent.png) |
| 04 | Get a talent's ratings (promoter) | `GET /ratings/talent/{{talentId}}` | 200 OK | 8 ms | 3/3 ✅ | [view](09-ratings/04-get-a-talent-s-ratings-promoter.png) |

## 10 · Messages

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Send message | `POST /messages` | 201 Created | 17 ms | 4/4 ✅ | [view](10-messages/01-send-message.png) |
| 02 | Send message – empty content (422) | `POST /messages` | 422 Unprocessable Entity | 6 ms | 4/4 ✅ | [view](10-messages/02-send-message-empty-content-422.png) |
| 03 | List conversations | `GET /messages/conversations` | 200 OK | 9 ms | 3/3 ✅ | [view](10-messages/03-list-conversations.png) |
| 04 | Get unread message count | `GET /messages/unread-count` | 200 OK | 8 ms | 4/4 ✅ | [view](10-messages/04-get-unread-message-count.png) |
| 05 | Get conversation with user | `GET /messages/conversations/{{talentUserId}}` | 200 OK | 10 ms | 3/3 ✅ | [view](10-messages/05-get-conversation-with-user.png) |
| 06 | Mark message read | `PATCH /messages/{{messageId}}/read` | 200 OK | 14 ms | 3/3 ✅ | [view](10-messages/06-mark-message-read.png) |
| 07 | Mark conversation read | `PATCH /messages/conversations/{{talentUserId}}/read` | 200 OK | 11 ms | 3/3 ✅ | [view](10-messages/07-mark-conversation-read.png) |

## 11 · Notifications

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | List notifications | `GET /notifications?page=1&pageSize=5` | 200 OK | 8 ms | 5/5 ✅ | [view](11-notifications/01-list-notifications.png) |
| 02 | Get unread notification count | `GET /notifications/unread-count` | 200 OK | 7 ms | 3/3 ✅ | [view](11-notifications/02-get-unread-notification-count.png) |
| 03 | Mark notification read | `PATCH /notifications/{{notificationId}}/read` | 200 OK | 12 ms | 3/3 ✅ | [view](11-notifications/03-mark-notification-read.png) |
| 04 | Mark all notifications read | `PATCH /notifications/read-all` | 200 OK | 10 ms | 3/3 ✅ | [view](11-notifications/04-mark-all-notifications-read.png) |

## 12 · Payments

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Get payment config | `GET /payments/config` | 200 OK | 7 ms | 4/4 ✅ | [view](12-payments/01-get-payment-config.png) |
| 02 | Start licence-fee checkout | `POST /payments/checkout` | 201 Created | 18 ms | 4/4 ✅ | [view](12-payments/02-start-licence-fee-checkout.png) |
| 03 | Pay – declined card | `POST /payments/{{paymentId}}/pay` | 201 Created | 720 ms | 4/4 ✅ | [view](12-payments/03-pay-declined-card.png) |
| 04 | Pay – invalid card number (422) | `POST /payments/{{paymentId}}/pay` | 422 Unprocessable Entity | 9 ms | 4/4 ✅ | [view](12-payments/04-pay-invalid-card-number-422.png) |
| 05 | Pay – successful card | `POST /payments/{{paymentId}}/pay` | 201 Created | 747 ms | 4/4 ✅ | [view](12-payments/05-pay-successful-card.png) |
| 06 | List my payments | `GET /payments` | 200 OK | 9 ms | 4/4 ✅ | [view](12-payments/06-list-my-payments.png) |
| 07 | Get payment by id | `GET /payments/{{paymentId}}` | 200 OK | 6 ms | 3/3 ✅ | [view](12-payments/07-get-payment-by-id.png) |

## 13 · AI assistant

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Get AI status | `GET /ai/status` | 200 OK | 4 ms | 3/3 ✅ | [view](13-ai-assistant/01-get-ai-status.png) |
| 02 | Chat – improve bio | `POST /ai/chat` | 200 OK | 11 ms | 4/4 ✅ | [view](13-ai-assistant/02-chat-improve-bio.png) |
| 03 | Get AI history | `GET /ai/history` | 200 OK | 6 ms | 3/3 ✅ | [view](13-ai-assistant/03-get-ai-history.png) |
| 04 | Clear AI history | `DELETE /ai/history` | 200 OK | 7 ms | 3/3 ✅ | [view](13-ai-assistant/04-clear-ai-history.png) |

## 14 · Admin

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Get platform stats | `GET /admin/stats` | 200 OK | 15 ms | 3/3 ✅ | [view](14-admin/01-get-platform-stats.png) |
| 02 | Get monitoring data | `GET /admin/monitoring` | 200 OK | 16 ms | 3/3 ✅ | [view](14-admin/02-get-monitoring-data.png) |
| 03 | List users | `GET /admin/users?role=TALENT&page=1&pageSize=5` | 200 OK | 9 ms | 4/4 ✅ | [view](14-admin/03-list-users.png) |
| 04 | List promoters pending verification | `GET /admin/promoters?status=PENDING&q=Wouri` | 200 OK | 11 ms | 5/5 ✅ | [view](14-admin/04-list-promoters-pending-verification.png) |
| 05 | Get promoter details | `GET /admin/promoters/{{newPromoterId}}` | 200 OK | 8 ms | 3/3 ✅ | [view](14-admin/05-get-promoter-details.png) |
| 06 | Reject promoter – reason required (400) | `PATCH /admin/promoters/{{newPromoterId}}/verify` | 400 Bad Request | 7 ms | 4/4 ✅ | [view](14-admin/06-reject-promoter-reason-required-400.png) |
| 07 | Approve promoter | `PATCH /admin/promoters/{{newPromoterId}}/verify` | 200 OK | 13 ms | 4/4 ✅ | [view](14-admin/07-approve-promoter.png) |
| 08 | List portfolios for moderation | `GET /admin/portfolios?status=ACTIVE&page=1&pageSize=5` | 200 OK | 9 ms | 4/4 ✅ | [view](14-admin/08-list-portfolios-for-moderation.png) |
| 09 | Flag portfolio item | `PATCH /admin/portfolios/{{portfolioId}}/moderate` | 200 OK | 13 ms | 4/4 ✅ | [view](14-admin/09-flag-portfolio-item.png) |
| 10 | Restore portfolio item | `PATCH /admin/portfolios/{{portfolioId}}/moderate` | 200 OK | 12 ms | 3/3 ✅ | [view](14-admin/10-restore-portfolio-item.png) |
| 11 | List events (admin) | `GET /admin/events?page=1&pageSize=5` | 200 OK | 8 ms | 4/4 ✅ | [view](14-admin/11-list-events-admin.png) |
| 12 | List payments (admin) | `GET /admin/payments?status=SUCCESS&page=1&pageSize=5` | 200 OK | 8 ms | 4/4 ✅ | [view](14-admin/12-list-payments-admin.png) |
| 13 | Refund payment | `POST /admin/payments/{{paymentId}}/refund` | 201 Created | 317 ms | 4/4 ✅ | [view](14-admin/13-refund-payment.png) |
| 14 | Generate report (JSON) | `GET /admin/reports/contracts?format=json` | 200 OK | 10 ms | 4/4 ✅ | [view](14-admin/14-generate-report-json.png) |
| 15 | Export report (CSV) | `GET /admin/reports/users?format=csv` | 200 OK | 9 ms | 3/3 ✅ | [view](14-admin/15-export-report-csv.png) |
| 16 | Suspend user | `PATCH /admin/users/{{newTalentUserId}}/status` | 200 OK | 12 ms | 4/4 ✅ | [view](14-admin/16-suspend-user.png) |
| 17 | Suspended user token is revoked (401) | `GET /auth/me` | 401 Unauthorized | 4 ms | 4/4 ✅ | [view](14-admin/17-suspended-user-token-is-revoked-401.png) |
| 18 | Admin route as talent – forbidden (403) | `GET /admin/stats` | 403 Forbidden | 5 ms | 4/4 ✅ | [view](14-admin/18-admin-route-as-talent-forbidden-403.png) |

## 15 · Cleanup

| # | Request | Method & URL | Status | Time | Tests | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Delete draft event | `DELETE /events/{{draftEventId}}` | 200 OK | 10 ms | 3/3 ✅ | [view](15-cleanup/01-delete-draft-event.png) |
| 02 | Delete portfolio item | `DELETE /portfolios/{{portfolioId}}` | 200 OK | 9 ms | 3/3 ✅ | [view](15-cleanup/02-delete-portfolio-item.png) |
| 03 | Logout | `POST /auth/logout` | 200 OK | 8 ms | 3/3 ✅ | [view](15-cleanup/03-logout.png) |
