# Design research

Before designing each major screen I ran screen-specific searches on Dribbble (and a few UI-pattern references) and recorded what they suggested. **Nothing was copied.** The shots informed layout patterns, hierarchy and component choices, which were then adapted to Talent Connect's own brand, copy and one shared design system.

**Method note.** Research was done through search-result and tag pages (titles, previews, descriptions). Individual shots were not downloaded or traced; observations are about recurring patterns across results, not about pixel details of any single shot.

## Design system decisions (apply to every screen)

- **One system:** shared tokens in `frontend/src/app/globals.css`, fonts Inter (UI) and Plus Jakarta Sans (display), one radius scale, one elevation level (hairline border, almost no shadow), one set of primitives in `components/ui`.
- **Restraint:** flat colour, no decorative gradients, no illustration clutter. Real photography appears only on the landing page and in portfolio content.
- **Three role workspaces, one family.** Accent and navigation pattern differentiate roles; components are identical.
  - Talent: light sidebar + indigo accent (personal, friendly).
  - Promoter: dark ink sidebar + teal accent (operational console).
  - Admin: dense slate top-navigation + amber accent (supervision, tables first).
- **Status is always a badge** (dot + label) with the same colour mapping for contracts, licences, payments, events and moderation.
- **States:** every API-driven view has skeleton loading, an explanatory empty state and an error state with retry.
- **Accessibility:** native `<dialog>` modals (focus trap, Esc), visible focus rings, labelled controls, `aria-live` for chat and toasts, colour never the only signal.

---

## 1. Public landing page (Visitor)

- **Search terms:** "talent marketplace landing page", "talent website hero", "hire talent get hired marketplace", "event booking landing".
- **Links:** https://dribbble.com/tags/talent-website · https://dribbble.com/tags/marketplace · https://dribbble.com/marketplace · https://dribbble.com/tags/events_booking
- **Observations:** Strong two-sided CTAs ("Hire talent" / "Get hired") sit above the fold next to a short value statement; proof (numbers, verified badges) follows immediately; work/people imagery carries the page; event cards show date and place at a glance; typography-led layouts feel more credible than dashboards-in-a-hero.
- **Components inspired:** two-CTA hero, proof strip of live stats, dual-audience section ("For talent" / "For promoters"), featured-event cards, "how it works" steps, closing CTA band.
- **Decisions:** original copy ("The right crew for every night on your calendar."); full-bleed hero slideshow of real demo work (six slides that cross-fade and zoom slowly on their own, with no click controls; it stays on the first image under `prefers-reduced-motion`) with a dark scrim so the headline stays legible; stats, events and showcase come from `GET /public/landing` (live data, no fake numbers); a "Licence verified" trust chip explains the admin vetting; the page never forces login and deliberately does not resemble a dashboard. Mobile collapses the mosaic under the copy and keeps both CTAs full-width.

## 2. Login and registration

- **Search terms:** "split screen sign up page", "role selection onboarding", "multi step sign up form".
- **Links:** https://dribbble.com/shots/6668446-Split-Screen-Sign-Up-Page · https://dribbble.com/tags/signup · https://dribbble.com/search/select-role
- **Observations:** Split layouts pair a short form with a brand/value panel; role choice works best as an explicit first step; long forms are grouped into labelled sections with inline validation.
- **Components inspired:** split auth layout, role switch tabs, grouped fieldsets, password hint and strength rules, inline field errors.
- **Decisions:** a single auth layout used by `/login` and `/register` with an ambient slideshow panel (role-specific captions on register; a photo banner on mobile); registration starts with a Talent / Promoter switch (also driven by `?role=`) and shows only the fields for that role (talent: gender and specialization; promoter: agency name and licence info). Validation mirrors the API rules, and server 422 errors are mapped back onto fields. The value panel collapses on mobile.

## 3. Talent dashboard

- **Search terms:** "freelancer dashboard design", "talent marketplace dashboard".
- **Links:** https://dribbble.com/shots/25304920-Freelancer-Dashboard-Design · https://dribbble.com/shots/21877791-Active-Professional-talent-marketplace-dashboard
- **Observations:** Freelancer dashboards lead with a personal greeting and the profile's own rating/completion, then "what needs my attention", then upcoming work; cards are soft and few.
- **Components inspired:** greeting card with profile-strength ring, action list, upcoming timeline with date blocks, compact rating/portfolio tiles.
- **Decisions:** the page answers "what needs me?" — pending contracts first, upcoming events second, small rating/portfolio/contract tiles and recent notifications on the right rail. No charts (the data would be thin and decorative).

## 4. Promoter dashboard

- **Search terms:** "talent hiring dashboard", "event management dashboard", "agency operations dashboard".
- **Links:** https://dribbble.com/shots/23402970-Talent-Hiring-Dashboard · https://dribbble.com/tags/event_management
- **Observations:** Hiring/operations dashboards use a KPI strip, a pipeline/status summary and tables of upcoming items with counts.
- **Components inspired:** joined KPI strip, segmented pipeline bar, upcoming-events table with enrolment counts, applicant feed.
- **Decisions:** deliberately different from the talent page: titled "Operations overview", a joined four-cell KPI strip, a real event-status pipeline bar computed from the database, a table of upcoming events, pending contracts and latest applicants. A licence banner appears until the agency is verified and links to the licence flow.

## 5. Admin dashboard and monitoring

- **Search terms:** "admin dashboard SaaS", "user management table", "system monitoring dashboard".
- **Links:** https://dribbble.com/tags/dashboard-saas · https://dribbble.com/search/user-management
- **Observations:** Admin tools favour dense tables, top navigation, filter bars and inline status actions; attention items (pending reviews) are surfaced above metrics.
- **Components inspired:** top navigation bar, attention banner, dense KPI row, verification queue table, small bar charts and breakdown lists.
- **Decisions:** the admin console is queue-first: an amber banner states how many licences and flagged items need a decision, a six-cell metrics row follows, then the verification queue table. The monitoring page only shows measurable data: API/DB health, 14-day counts per day read from Prisma, licence and moderation breakdowns and a recent activity feed. No random charts, no invented metrics.

## 6. Events: browse, detail and create

- **Search terms:** "event booking page", "event card date location", "create event form", "event management vendor profile".
- **Links:** https://dribbble.com/tags/events_booking · https://dribbble.com/tags/event_booking · https://dribbble.com/tags/event_management
- **Observations:** Event cards lead with a date block, then title, place and a small fact row; detail pages put the primary action (enrol / book) in a sticky side card; creation flows use one calm form with optional details clearly marked.
- **Components inspired:** date-block cards, filter bar (search, category, location, sort), side action card, organiser card with agency and rating, single-column event form.
- **Decisions:** talent see filterable event cards and a detail page with an "Enrol" side card (note modal, withdraw, contract link); promoters get a status-tabbed list, a create/edit form with "Save as draft" vs "Publish", and a detail page with lifecycle actions (publish, start, complete, unpublish, cancel) and an enrolled-talent list with "Issue contract".

## 7. Portfolio (talent)

- **Search terms:** "media library cards", "upload manager", "gallery grid hover".
- **Links:** https://dribbble.com/tags/media_library · https://www.shadcn-ui-blocks.com/blocks/application-pro/media-gallery/media-library-grid
- **Observations:** Media libraries use a grid with type badges, a toolbar (search, type filter, upload), hover actions and an always-visible asset count.
- **Components inspired:** asset cards with type badge, type tabs with counts, upload dialog with file constraints, preview lightbox.
- **Decisions:** grid with image/video/audio/PDF previews, type tabs, publish/hide toggle, edit and delete; the upload dialog states limits up-front (10 / 50 / 20 / 10 MB) and validates before sending; moderator notes from admins are shown on the item.

## 8. Talent discovery (promoter)

- **Search terms:** "talent search marketplace", "talent profile work history", "talent directory cards".
- **Links:** https://dribbble.com/tags/marketplace · https://dribbble.com/tags/talent-website
- **Observations:** Directories show a work preview on each card plus rating and key facts; profile pages add trust signals (reviews, experience) and a clear contact action.
- **Components inspired:** card with portfolio strip, rating + experience row, skill chips, profile header with actions, review list.
- **Decisions:** search bar with specialization and sort plus an expandable filter panel (location, rating, experience, gender); cards preview up to three portfolio items; the profile page offers "Issue contract" (choose one of your live events first) and "Message".

## 9. Contracts

- **Search terms:** "contract management UI", "agreement timeline status", "digital contract list detail".
- **Links:** https://dribbble.com/tags/agreement · https://dribbble.com/tags/contracts
- **Observations:** Contract tools pair a filterable list (status tabs with counts) with a detail page that has a status timeline, the terms as readable text and a party card.
- **Components inspired:** status tabs with counts, list rows with party/event/amount, three-step timeline (Issued → Accepted → Completed), summary card with fee and dates.
- **Decisions:** one role-aware contract detail for both sides. Talents read the terms and accept or decline while the contract is pending (declining requires a note); promoters can amend terms while it is open, cancel, complete, attach a signed PDF and rate the talent after completion.

## 10. Messaging

- **Search terms:** "team communication dashboard", "messaging dashboard UI", "chat list and thread".
- **Links:** https://dribbble.com/shots/24833351-Team-Communication-Dashboard-UI · https://dribbble.com/tags/messaging-dashboard
- **Observations:** Two panes — conversations on the left with unread counts, the thread on the right with clearly different own/other bubbles and timestamps.
- **Components inspired:** conversation list with avatar, last message and unread badge; bubbles; composer with send button.
- **Decisions:** same component for talent and promoter; on mobile it becomes list → thread navigation; deep links (`?to=userId`) from profiles and contracts start or resume a conversation; sending persists through the API and creates a notification.

## 11. Notifications

- **Search terms:** "notification center unread", "inbox tabs filters".
- **Links:** https://dribbble.com/tags/unread · https://meta.stackexchange.com/questions/382693 · https://www.suprsend.com/products/app-inbox
- **Observations:** Unread items are distinguished by bold title and a tint/dot; All/Unread tabs and a "Mark all as read" action are the expected controls.
- **Components inspired:** typed icon tiles, unread emphasis, tab filter, mark-all action.
- **Decisions:** one shared notification view; each notification links to the thing it is about; the header bell and sidebar badges use live unread counts.

## 12. Licence verification and payments

- **Search terms:** "payment dashboard transactions", "billing history table status chips", "verification steps".
- **Links:** https://dribbble.com/search/payment-dashboard
- **Observations:** Payment pages combine summary cards with a transaction table using status chips; verification flows use a short stepper.
- **Components inspired:** summary cards, transactions table, three-step stepper (Details → Fee → Review), payment dialog.
- **Decisions:** the licence page is a stepper plus form plus review history; the payment dialog always shows a **Sandbox mode** banner with clickable test cards, shows declined cards as a clear failure with a retry, and stores only brand and last four digits. The payments page lists real payments from the API with status filters.

## 13. AI assistant

- **Search terms:** "chatbot UI", "AI chat dashboard suggested prompts".
- **Links:** https://dribbble.com/tags/chat-dashboard · https://dribbble.com/tags/chatbot-ui
- **Observations:** Single-column conversation, suggested-prompt chips as the empty state, compact composer, copy actions on replies.
- **Components inspired:** prompt chips, task pills in the composer, typing indicator, copy button, clear-history action.
- **Decisions:** chips map to the backend tasks (improve bio, present skills, describe portfolio item, draft a message, event advice); a banner states honestly whether a live model or the offline template assistant is answering; history persists per user and can be cleared.

## 14. Admin user, promoter and portfolio management

- **Search terms:** "user management table", "admin verification queue", "content moderation grid".
- **Links:** https://dribbble.com/search/user-management · https://dribbble.com/tags/dashboard-saas
- **Observations:** Filterable tables with search, role/status filters, pagination and inline actions; moderation works best as a card grid with media preview and per-item actions.
- **Components inspired:** filter bar, dense table, status badges, reason dialogs, moderation cards.
- **Decisions:** users table with suspend / deactivate / reactivate via a reason dialog (admin accounts and self are protected); promoter list defaults to "Awaiting review" and opens a detail page with licence data, payments, history and approve / reject (reason required); portfolio moderation grid with flag / remove / restore and a mandatory note for flag and remove; reports page with type picker, date range, on-screen preview and CSV export.
