"""
Content of the Talent Connect user guide (Cameroon edition).

Blocks are plain tuples consumed by build-user-guide.py:
  ("h1"|"h2"|"h3", text)                 headings
  ("p", text)                            paragraph (supports <b>, <i>, <font color>)
  ("bullets", [text, ...])                bullet list
  ("steps", [(title, text), ...])         numbered steps
  ("table", head, rows, widths)           table (widths as fractions of the text width)
  ("callout", kind, title, text)          kind = info | tip | warn | danger
  ("kv", [(key, value), ...])             definition-style two-column list
  ("code", text)                          monospace block
  ("pagebreak",)                          page break
"""

TITLE = "Talent Connect — User Guide"
SUBTITLE = "Cameroon edition · FCFA · Mobile Money (MTN MoMo & Orange Money)"
VERSION = "Version 1.1 — licence fees and AI assistant"
DATE = "September 2026"

CONTACT = {
    "platform": "Talent Connect Cameroun SARL (demo data)",
    "support": "support@talentconnect.dev",
    "website": "https://talent-connect.local",
}

DEMO_ACCOUNTS = [
    ["Administrator", "admin@talentconnect.dev", "Admin@12345", "Full console, licence-fee management"],
    ["Talent", "alex.rivera@talentconnect.dev", "Password123!", "Photographer profile with portfolio, contracts, AI assistant"],
    ["Promoter (verified)", "jordan.blake@talentconnect.dev", "Password123!", "Verified agency with events and contracts"],
    ["Promoter (licence in review)", "grace.lin@talentconnect.dev", "Password123!", "Transfer submitted, waiting for confirmation"],
]

CONTENT = [
    # ─────────────────────────── Getting started ───────────────────────────
    ("h1", "1 · Getting started"),
    ("p", "Talent Connect is the platform where Cameroonian event professionals meet the agencies that hire them. "
          "Talents (photographers, DJs, dancers, hosts, musicians, decorators, sound engineers…) publish a portfolio, "
          "find published events and sign contracts. Promoters (agencies, organisers, venues) publish events, hire talent "
          "and manage contracts — once their licence is approved. Administrators verify agencies, moderate content, "
          "manage the licence fee and keep an eye on the platform."),
    ("h2", "1.1 The three roles"),
    ("table", ["Role", "What you can do", "What is restricted"], [
        ["Talent", "Build a profile and portfolio, browse events, enrol, accept contracts, message promoters, use the AI writing assistant.",
         "Cannot create events or contracts; cannot pay or receive money on the platform."],
        ["Promoter", "Submit a licence, pay the licence fee with Mobile Money, publish events, hire talent, issue contracts, rate talent.",
         "Cannot publish events or issue contracts until the licence is verified and the fee is confirmed."],
        ["Administrator", "Verify licences, set and collect the licence fee, manage users, moderate portfolios, export reports, monitor the platform.",
         "Cannot create events or contracts, and never sees a user's password."],
    ], [0.16, 0.52, 0.32]),
    ("h2", "1.2 Create an account"),
    ("steps", [
        ("Open the site", "Go to the platform address and choose <b>Register</b>. The same form serves both talent and promoter — pick your side first."),
        ("Choose Talent or Promoter", "The form shows only the fields for the role you pick. Promoters add their agency name and the licence they hold."),
        ("Fill in your details", "First and last name, email, your mobile number (<font face=\"Guide-Mono\">+237 6XX XX XX XX</font>) and a password of 8 to 72 characters with an uppercase letter, a lowercase letter and a number."),
        ("Talent: add your craft", "Pick your gender and your specialisation (photographer, DJ, dancer, host…). You can change both later in your profile."),
        ("Promoter: describe your agency", "Agency name plus your licence number. The issuing authority, the expiry date and the scanned document are added on the Licence page after you sign in."),
        ("Confirm", "You are signed in immediately. Talents land on their dashboard; promoters land on the licence page, because the account becomes active for events only once the licence and the fee are verified."),
    ]),
    ("callout", "tip", "Use a number you actually own", "Your mobile number identifies you on contracts and receipts. If you pay the licence fee from a different wallet, "
              "you declare that wallet number when you submit the transfer — the platform records both."),
    ("h2", "1.3 Sign in and out"),
    ("bullets", [
        "<b>Sign in</b> — email and password on the login page. Sign-in and registration attempts from the same address are limited to 10 per minute; beyond that the platform makes you wait a minute.",
        "<b>Sign out</b> — the menu at the bottom of the sidebar. Signing out (or changing your password) revokes every token issued so far on all devices.",
        "<b>Forgotten password</b> — there is no self-service reset in this release: contact an administrator, who can suspend or reactivate the account.",
    ]),
    ("h2", "1.4 The interface at a glance"),
    ("table", ["Area", "What it does"], [
        ["Sidebar", "The pages your role can open. Counters show unread messages, notifications and work waiting for you."],
        ["Dashboard", "A single screen answering “what needs my attention today?” — action list, upcoming work, licences and payments."],
        ["Notifications", "Every event, contract, message and licence change, with a link straight to the item it is about."],
        ["Messages", "One-to-one conversations with the people you work with. Attachments live in your portfolio or contracts, not the chat."],
        ["Profile menu", "Your account details, avatar, password and sign-out."],
    ], [0.22, 0.78]),
    ("pagebreak",),

    # ─────────────────────────── Talents ───────────────────────────
    ("h1", "2 · Guide for talents"),
    ("h2", "2.1 Your dashboard"),
    ("p", "The talent dashboard opens with a greeting, your profile-completion ring, your average rating and a list of what needs "
          "attention: contracts waiting for your answer, events starting soon, portfolio items that were flagged, and new messages."),
    ("h2", "2.2 Build a profile that gets you booked"),
    ("kv", [
        ("Photo", "A clear, recent headshot or a strong work photo. Uploads are limited to 10 MB and are moderated."),
        ("Bio", "Up to 1500 characters — four or five sentences (roughly 80–400 characters) saying what you do, for whom and what makes you different. The AI assistant can draft it."),
        ("Skills", "Up to 15 skills, three to five of them being the ones that matter. Use the words promoters use: “Event photography”, “Live mixing”, “Stage hosting”."),
        ("Experience", "Complete years of practice. It feeds the “experience” filter in talent search."),
        ("Location", "Your city (Douala, Yaoundé, Bamenda, Buea, Limbe…). Talents are filtered by city."),
        ("Portfolio", "The proof. Three published items or more is what distinguishes a complete profile — photos, videos, audio or PDFs."),
    ]),
    ("table", ["Upload type", "Formats", "Maximum size"], [
        ["Photo", "JPEG, PNG, GIF, WebP", "10 MB"],
        ["Video", "MP4, WebM, QuickTime (.mov)", "50 MB"],
        ["Audio", "MP3, WAV, OGG, M4A", "20 MB"],
        ["Document", "PDF", "10 MB"],
    ], [0.3, 0.5, 0.2]),
    ("p", "Files are checked by their real content, not by their name: renaming a video to <font face=\"Guide-Mono\">.jpg</font> "
          "does not get it through, and a corrupted file is refused with a clear message instead of being stored."),
    ("callout", "info", "Moderation", "Portfolio items are visible to promoters once published. An administrator may flag an item that needs a "
              "release or proof of permission; you are notified and can fix it, and the item is restored afterwards."),
    ("h2", "2.3 Find and enrol in events"),
    ("steps", [
        ("Browse", "<b>Events</b> lists published events with a date block, place, category and budget. Search by keyword, filter by category and location, and switch between <b>Browse events</b>, <b>My upcoming</b> and <b>Past</b>."),
        ("Read the brief", "Open an event to see the description, what the organiser is looking for, the budget range and the organiser's licence status."),
        ("Enrol", "<b>Enrol</b> on the side card and add an optional note about what you would bring. The organiser is notified immediately."),
        ("Withdraw", "You can withdraw at any time, unless you have an active contract for that event — then the contract has to be closed first."),
    ]),
    ("h2", "2.4 Contracts"),
    ("p", "A contract is created by the promoter and appears under <b>Contracts</b>. It lists the role, the fee in FCFA, the dates and the terms. "
          "Read it carefully, then <b>accept</b> it (the status becomes Active) or <b>decline</b> it with a short note. Only the promoter can "
          "change the terms; if they change a material term — fee, dates or deliverables — of an active contract it returns to Pending for you to confirm again, and the contract fee is always "
          "a whole number of CFA francs."),
    ("callout", "warn", "Agree money in the contract, not in the chat", "Talent Connect does not handle payments between you and a promoter. "
              "The contract is the record of what you agreed: fee, payment date and deliverables. Keep it there so both sides have the same version."),
    ("h2", "2.5 Ratings"),
    ("p", "After a contract is marked completed, the promoter can rate you once, from one to five stars, with a written review. Your average, "
          "distribution and reviews are on the <b>Ratings</b> page. Ratings cannot be edited or removed by the promoter, and they feed the "
          "rating filter promoters use when they search for talent."),
    ("h2", "2.6 Messages and notifications"),
    ("bullets", [
        "<b>Messages</b> keeps one thread per person, with unread counters in the sidebar.",
        "<b>Notifications</b> collects everything the platform did on your behalf: enrolment confirmed, contract issued, contract completed, rating received, portfolio flagged.",
        "Promoters can only start a conversation with you after they have found you in search or from an event — you can always decline to continue it.",
    ]),
    ("pagebreak",),

    # ─────────────────────────── The licence fee (promoters) ───────────────────────────
    ("h1", "3 · The promoter licence and the licence fee"),
    ("p", "Every agency on Talent Connect must show that it is a real, licensed organiser. That check has two parts: the licence document you "
          "submit, and the platform licence fee you pay. Both must be done before you can publish events or issue contracts."),
    ("callout", "warn", "What the fee is — and what it is not", "The licence fee is <b>Talent Connect's own platform charge</b> for vetting and "
              "operating your agency account. It is <b>not</b> a government fee, not a tax, and it is not paid to the Ministry of Arts and Culture "
              "or to any other authority. Your real licence is issued by the authority named on your document — the platform only checks it."),
    ("h2", "3.1 Submit your licence"),
    ("steps", [
        ("Open Licence", "In the promoter menu, choose <b>Licence</b>. The page shows three steps: details, fee, review."),
        ("Enter the licence details", "Licence number, the authority that issued it (for example “Ministère des Arts et de la Culture”), the expiry date and any extra information."),
        ("Attach the document", "A PDF scan or clear photo of the licence, up to 10 MB. Expired licences are refused, so check the date first."),
        ("Send it for review", "Once saved, the licence can be reviewed — and it becomes reviewable only after the fee below is confirmed."),
    ]),
    ("h2", "3.2 Pay the licence fee with Mobile Money"),
    ("p", "The fee is charged in CFA francs (XAF, written <b>FCFA</b>, always a whole number) and collected with Mobile Money — the way Cameroon "
          "pays. You send the money from your own wallet to the platform's merchant wallet, then tell the platform you have done it. An "
          "administrator checks the merchant wallet and confirms your transfer."),
    ("table", ["Network", "How to send", "Typical numbers", "Wallet prefix hints"], [
        ["MTN Mobile Money (MoMo)", "Dial <b>*126#</b>, choose Transfer, enter the merchant number and the exact amount", "+237 677 12 34 56 (demo)", "67X, 68X, 650–654"],
        ["Orange Money", "Dial <b>#150#</b>, choose Transfer, enter the merchant number and the exact amount", "+237 699 12 34 56 (demo)", "69X, 655–659"],
    ], [0.26, 0.44, 0.18, 0.12]),
    ("steps", [
        ("Open the fee", "On the <b>Licence</b> page (or <b>Payments</b>), press <b>Pay the licence fee</b>. The dialog shows the exact amount in FCFA, both networks with their USSD code and the merchant number that receives the money."),
        ("Send the money", "Dial the USSD code for the network you use, choose Transfer, paste the merchant number and the exact amount. Keep the SMS you receive: it contains the transaction ID you need next."),
        ("Declare the transfer", "Choose the network, enter the name on your wallet, the Cameroonian number that sent the money and the <b>transaction ID from the SMS</b>. Attach a screenshot of the receipt — optional, but it speeds up the check."),
        ("Wait for confirmation", "Your transfer shows as <b>Awaiting confirmation</b>. An administrator compares it with the merchant wallet, usually the same working day. You are notified either way."),
        ("Send your licence for review", "Once the fee is confirmed, submit the licence if you have not already, and the administrator reviews it. Approval triggers the final verification badge on your agency."),
    ]),
    ("callout", "tip", "Copy the transaction ID exactly", "The transaction ID is the only thing that ties your transfer to your account. It looks like "
              "<font face=\"Guide-Mono\">MP2509.1002.A01002</font> for MTN MoMo or <font face=\"Guide-Mono\">OM2509.5150.B00777</font> for Orange Money. "
              "Never type another person's ID: a transaction ID can be declared only once on the platform, and a duplicate is refused."),
    ("h2", "3.3 If the transfer is rejected"),
    ("p", "An administrator can reject a declared transfer when the money is not visible on the merchant wallet, when the amount differs, or when "
          "the transaction ID is wrong. You receive a notification with the reason, the payment is marked <b>Rejected</b>, and the fee becomes "
          "outstanding again. Open the payment, read the reason, check the SMS, then <b>submit the transfer again</b> with the corrected "
          "transaction ID. Nothing is lost — the corrected declaration simply returns to the confirmation queue."),
    ("h2", "3.4 Refunds and counter payments"),
    ("bullets", [
        "<b>Refund</b> — if an administrator refunds a confirmed fee (for example because your agency is closing), the money is sent back from the "
        "merchant wallet and the payment is marked <b>Refunded</b>. Your fee then counts as unpaid again.",
        "<b>Counter payment</b> — if you pay in cash at the office or send the money with someone else's wallet, an administrator can record the "
        "payment on your behalf. It appears in your payment history as a <b>Counter payment</b>, already confirmed.",
        "<b>Receipts</b> — every payment keeps its reference, network, wallet number, transaction ID, the note and the receipt file you attached. "
        "<b>Payments</b> lists every payment for your own bookkeeping.",
    ]),
    ("h2", "3.5 Your payments page"),
    ("table", ["Card or tab", "Meaning"], [
        ["Total confirmed", "Everything confirmed on your account, in FCFA."],
        ["Licence fee", "The current amount, straight from the administrators' settings. The hint under it reads Confirmed, Awaiting confirmation or Not paid yet."],
        ["Awaiting confirmation", "Transfers you declared that an administrator has not checked yet."],
        ["Licence status", "Not submitted · Pending · Verified · Rejected."],
        ["Status tabs", "All · Confirmed · Awaiting confirmation · Rejected · Refunded."],
    ], [0.28, 0.72]),
    ("pagebreak",),

    # ─────────────────────────── Promoter guide (the rest) ───────────────────────────
    ("h1", "4 · Guide for promoters"),
    ("h2", "4.1 Dashboard and agency profile"),
    ("p", "The promoter dashboard shows the licence banner (until you are verified), your event pipeline by status, pending contracts, "
          "latest applicants and anything waiting for your answer. The agency profile holds your name, logo, city, contact details, "
          "a short description and your specialities — this is what talents see before they accept your contracts."),
    ("h2", "4.2 Create and publish events"),
    ("steps", [
        ("New event", "<b>Events → Create event</b>. Title, category, description, date and time, venue, city and the budget range in FCFA."),
        ("Choose who you need", "Name the specialisation you are looking for (photographer, DJ, host…) so the right talents find it."),
        ("Save as draft", "Drafts are private. Use them to prepare an event before the line-up is final."),
        ("Publish", "Publishing makes the event visible to talents and opens enrolments. You can unpublish or cancel later; cancelling notifies every enrolled talent."),
    ]),
    ("callout", "info", "Budgets are in FCFA", "Enter a minimum and a maximum in whole CFA francs. Budgets written in dollars or euros are refused — "
              "the platform only speaks FCFA."),
    ("h2", "4.3 Hire talent"),
    ("bullets", [
        "<b>Search</b> — filter the talent directory by specialisation, city, rating and experience. Cards preview their portfolio.",
        "<b>Review</b> — open a profile to see the full portfolio, reviews and availability.",
        "<b>Contract</b> — issue a contract from the talent's profile or from an event's applicant list. Terms, fee (FCFA), dates and deliverables.",
        "<b>Track</b> — follow every contract from Pending to Active to Completed on the contracts page; that final step is what unlocks a rating.",
    ]),
    ("h2", "4.4 Ratings"),
    ("p", "After a contract is completed you can rate the talent once, from one to five stars with a written review. Ratings build the reputation "
          "system the whole platform depends on, so use them: they are the talent's public track record and they are not editable afterwards."),
    ("pagebreak",),

    # ─────────────────────────── Administrator guide ───────────────────────────
    ("h1", "5 · Guide for administrators"),
    ("p", "The admin console is queue-first: whenever you sign in, the dashboard leads with what needs a decision — licences to review, "
          "licence-fee transfers waiting for confirmation and flagged portfolios."),
    ("h2", "5.1 Licence fees (Admin → Licence fees)"),
    ("p", "This page is where the platform's licence fee is managed. You own the amount, the wallets that receive the money, the instructions "
          "promoters read, and the confirmation of every transfer."),
    ("h3", "Fee settings"),
    ("table", ["Setting", "What it does", "Rules"], [
        ["Licence fee (FCFA)", "The fee every promoter pays for the current period.", "Whole CFA francs between 1 000 and 5 000 000."],
        ["Account holder", "The name on the merchant wallet, shown to promoters.", "Free text, up to 120 characters."],
        ["MTN MoMo merchant number", "The wallet that receives MTN transfers.", "Cameroonian mobile number, e.g. +237 6 77 12 34 56."],
        ["Accept MTN MoMo", "Whether promoters may pay with MTN MoMo.", "At least one network must stay accepted."],
        ["Orange Money merchant number", "The wallet that receives Orange transfers.", "Cameroonian mobile number, e.g. +237 6 99 12 34 56."],
        ["Accept Orange Money", "Whether promoters may pay with Orange Money.", "At least one network must stay accepted."],
        ["Instructions shown to promoters", "The sentence promoters read above the payment steps.", "Free text, up to 500 characters."],
    ], [0.3, 0.42, 0.28]),
    ("callout", "danger", "Replace the demo wallets before real use", "A fresh installation ships with demo wallets (+237 677 12 34 56 and "
              "+237 699 12 34 56) and the page warns you when they are still in use. Promoters would be sending money to a number nobody controls. "
              "Set your real merchant numbers first, then tell promoters."),
    ("h3", "The confirmation queue"),
    ("steps", [
        ("Open the transfer", "The queue lists every declared transfer with the promoter, network, wallet number, transaction ID, receipt and declared time."),
        ("Check your wallet", "Look up the transaction ID or the amount on the MTN MoMo or Orange Money merchant wallet (or the statement you export from the operator portal)."),
        ("Confirm", "The payment becomes <b>Confirmed</b>, the promoter is marked as having paid the fee, and a complete licence goes into the review queue."),
        ("Reject", "Give a clear reason — “no transfer with this ID on the MoMo wallet on 12 September”, for example. The promoter is notified, the payment becomes <b>Rejected</b> and can be resubmitted."),
    ]),
    ("h3", "Refunds and counter payments"),
    ("bullets", [
        "<b>Refund</b> — for a confirmed payment, use <b>Refund</b>. The record is marked Refunded, the fee counts as unpaid again, and a licence "
        "still under review returns to “not submitted”. <b>Send the money back from the merchant wallet yourself</b> — the platform only records it.",
        "<b>Record a payment</b> — for cash at the office or a transfer from a third party's wallet, choose the promoter, the amount, the network "
        "(Counter payment is the default) and a note. The payment is created already confirmed, the fee is marked paid and the promoter is notified.",
    ]),
    ("h3", "Overview and follow-up"),
    ("bullets", [
        "Four cards at the top: the current <b>Licence fee</b>, the amount <b>Collected</b> with the number of confirmed transfers, "
        "<b>To confirm</b> with the amount declared and still waiting, and <b>Fee unpaid</b> with the number of promoters who still owe the fee.",
        "The transfers table is filtered by the tabs <b>To confirm · Confirmed · Rejected · Refunded · All</b> and is searchable by agency, payer "
        "or transaction ID. Every row links to the promoter's full record.",
        "To chase an agency that has not paid, open <b>Promoters</b>: each row shows the licence status, <b>Paid</b> or <b>Unpaid</b> for the fee, "
        "and the contact details for a direct follow-up.",
        "The same numbers appear on the dashboard, and the licence-fees CSV export in <b>Reports</b> gives you the full ledger for accounting.",
    ]),
    ("h2", "5.2 Verify licences"),
    ("steps", [
        ("Open the queue", "<b>Promoters</b> lists agencies by licence status: Pending, Verified, Rejected, Not submitted."),
        ("Check the file", "Compare the licence number, authority and expiry date with the PDF the promoter uploaded, and confirm the fee is confirmed."),
        ("Approve", "<b>Approve</b> marks the agency Verified — it can now publish events and issue contracts, and the badge appears on its public pages."),
        ("Reject", "Reject with a reason (a blurry document, a licence that does not match the agency name…). The promoter is notified and can submit again."),
    ]),
    ("callout", "info", "Order matters", "A licence can only be approved once the fee is confirmed. Try to approve earlier and the platform refuses with "
              "a 409 “licence fee has not been paid” — confirm the transfer first, then review the document."),
    ("h2", "5.3 Users, content and reports"),
    ("table", ["Page", "What you do there"], [
        ["Users", "Search by role or status; suspend, deactivate or reactivate an account with a reason. Suspension revokes the user's sessions immediately."],
        ["Promoters", "The licence queue and full agency detail: licence, payments, events and review history."],
        ["Portfolios", "Moderate flagged or removed work: flag with a note, remove, restore. The talent is notified at each step."],
        ["Events", "See every event on the platform with its status and organiser."],
        ["Payments", "The full payment ledger with filters (status, network, search) and the transfers awaiting confirmation."],
        ["Reports", "Export users, events, contracts, licence fees, verifications or moderation as JSON or CSV, for any date range."],
        ["Monitoring", "API and database health, 14-day activity, licence and moderation pipelines, recent activity."],
    ], [0.18, 0.82]),
    ("pagebreak",),

    # ─────────────────────────── AI assistant ───────────────────────────
    ("h1", "6 · The AI assistant"),
    ("p", "Talents have a writing partner inside the platform. It knows the platform's rules, the Cameroon payments wording and the profile of "
          "the talent who is signed in — and nothing else about them."),
    ("h2", "6.1 What it is good at"),
    ("table", ["Quick action", "What you get"], [
        ["Improve my bio", "A polished professional summary built from your specialisation, city, experience and skills, ready to paste into your profile."],
        ["Present my skills", "Advice on turning a skill list into outcomes a promoter can picture, with proof from your portfolio."],
        ["Describe a portfolio item", "A caption for a photo, video or PDF: what it is, who it was for and why it is good."],
        ["Draft a message", "A polite, professional message to a promoter — optionally about a specific event you have selected."],
        ["Event advice", "A preparation checklist built from the event's date, venue, organiser and requirements."],
        ["Anything else", "Questions about enrolment, contracts, ratings, verification, the licence fee — answered with the platform's rules."],
    ], [0.3, 0.7]),
    ("h2", "6.2 Who is answering"),
    ("bullets", [
        "<b>Live (Groq)</b> — the assistant is connected to a real model served by Groq (open-weight models on fast LPU hardware, "
        "<font face=\"Guide-Mono\">llama-3.3-70b-versatile</font> by default, at <font face=\"Guide-Mono\">api.groq.com</font>). "
        "The banner on the page names the model in use.",
        "<b>Offline assistant</b> — when the server has no API key configured, replies come from a built-in template writer. It still works from "
        "your profile data and answers platform questions, but it is less flexible; the page says so plainly instead of pretending otherwise.",
    ]),
    ("callout", "info", "Your data and the API key", "Only what you have already put on your profile (name, specialisation, city, skills, bio, "
              "experience) and the event you select are sent to the model, together with your question and the last few messages of the conversation. "
              "The API key lives on the server and is never sent to your browser or included in any response. Clearing the conversation deletes it "
              "from the platform."),
    ("h2", "6.3 Getting the best out of it"),
    ("bullets", [
        "Say what the text is for: “for festival promoters in Douala”, “for a wedding client”, “for a corporate booking”.",
        "Ask for a length and a tone: “three sentences, confident, no clichés”.",
        "Paste your rough draft and ask for a rewrite — the assistant keeps your facts and improves the wording.",
        "Always read before you publish: you are responsible for what appears on your profile.",
    ]),
    ("pagebreak",),

    # ─────────────────────────── Money reference ───────────────────────────
    ("h1", "7 · Money, in Cameroonian terms"),
    ("h2", "7.1 The currency"),
    ("bullets", [
        "Everything on the platform is in <b>CFA francs</b> — currency code <b>XAF</b>, displayed as <b>FCFA</b>.",
        "The CFA franc has no subunits: amounts are whole numbers. <font face=\"Guide-Mono\">30 000 FCFA</font> is right; "
        "<font face=\"Guide-Mono\">30 000,50 FCFA</font> does not exist.",
        "Contract fees, event budgets, licence fees and reports are all FCFA. Amounts written in dollars or euros are refused by the platform.",
        "Timestamps are shown in Douala time (Africa/Douala, UTC+1).",
    ]),
    ("h2", "7.2 Mobile Money at a glance"),
    ("table", ["", "MTN Mobile Money", "Orange Money"], [
        ["USSD code", "*126#", "#150#"],
        ["Send money", "Transfer → merchant number → exact amount", "Transfer → merchant number → exact amount"],
        ["Number prefixes (hint only)", "67X · 68X · 650–654", "69X · 655–659"],
        ["Receipt", "SMS with the transaction ID", "SMS with the transaction ID"],
        ["Confirmation on Talent Connect", "An administrator checks the merchant wallet", "An administrator checks the merchant wallet"],
    ], [0.3, 0.35, 0.35]),
    ("callout", "tip", "Number portability", "A number's prefix suggests its network but is not a guarantee — numbers can be ported. Choose the network "
              "that actually holds the wallet you are paying from, and always use the merchant number shown on the payment screen."),
    ("h2", "7.3 Writing a Cameroonian number"),
    ("kv", [
        ("Correct", "+237 6 77 12 34 56 or +237677123456 — country code, then nine digits starting with 6."),
        ("Wrong", "00237…, 237…, 077… or a number with letters. The platform rejects anything else with a clear message."),
        ("Why it matters", "Wallet numbers are validated so a mistyped number cannot silently hide a real transfer."),
    ]),
    ("h2", "7.4 What talent never pays"),
    ("p", "Talents never pay to register, to be listed, to enrol in an event or to sign a contract. The only fee on the platform is the promoter "
          "licence fee described in section 3. If anyone asks a talent for a payment to “activate” an account on Talent Connect, it is not us — "
          "report it to " + CONTACT["support"] + "."),
    ("pagebreak",),

    # ─────────────────────────── FAQ ───────────────────────────
    ("h1", "8 · Questions and troubleshooting"),
    ("table", ["Symptom", "What it means and what to do"], [
        ["“A transfer is already waiting for administrator confirmation.”",
         "You declared a transfer that has not been checked yet. Open Payments to see its status; declare another only after it is confirmed or rejected."],
        ["“This transaction ID has already been submitted.”",
         "A transaction ID can be used once, on any account. Check the SMS again — the ID probably belongs to another transfer, or was typed by someone else."],
        ["“Enter the Cameroonian number that sent the money.”",
         "The wallet number must be a +237 mobile number starting with 6. Remove spaces, the leading 0 or the 00237 prefix."],
        ["“The licence fee has not been paid.”",
         "You are trying to approve a licence (or publish) before the fee is confirmed. Confirm the transfer first, then review the licence."],
        ["“Keep at least one Mobile Money service enabled.”",
         "As an administrator you tried to switch off both networks. Promoters would have no way to pay, so one must stay on."],
        ["The fee did not reach the merchant wallet.",
         "The transfer failed or went to a saved contact instead of the number shown. Open the payment, read the merchant number again and submit a new transfer with its own transaction ID."],
        ["The AI assistant says “Offline assistant”.",
         "No model key is configured on the server. It still answers platform questions from the built-in writer; ask an administrator to add the key."],
        ["“Your account has been suspended.”",
         "An administrator suspended the account, usually while investigating a report. Contact support; reactivation restores access."],
        ["“This account has been deactivated.”",
         "The account was closed. Contact support if that was not intentional."],
        ["An upload is refused.",
         "Check the format and the size against the table in section 2.2. Videos stop at 50 MB, documents at 10 MB."],
    ], [0.36, 0.64]),
    ("h2", "8.1 Status words you will see"),
    ("table", ["Where", "Status", "Meaning"], [
        ["Licence", "Not submitted / Pending / Verified / Rejected", "No licence filed yet · filed and waiting for review · approved · refused with a reason."],
        ["Payment", "Not submitted yet / Awaiting confirmation / Confirmed / Rejected / Refunded", "The fee record exists but no transfer was declared · declared, waiting for an administrator · money seen · refused with a reason · sent back."],
        ["Contract", "Pending / Active / Completed / Cancelled / Rejected", "Waiting for the talent · accepted · work finished · cancelled by the promoter · declined by the talent."],
        ["Event", "Draft / Published / Ongoing / Completed / Cancelled", "Private preparation · open to talents · happening · finished · cancelled."],
        ["Moderation", "Active / Flagged / Removed", "Visible · needs a fix from the owner · hidden from promoters."],
        ["Account", "Active / Suspended / Deactivated", "Normal · temporarily blocked · closed."],
    ], [0.14, 0.34, 0.52]),
    ("pagebreak",),

    # ─────────────────────────── Reference ───────────────────────────
    ("h1", "9 · Quick reference"),
    ("h2", "9.1 Demo accounts (this installation only)"),
    ("table", ["Role", "Email", "Password", "What it shows"], DEMO_ACCOUNTS, [0.22, 0.3, 0.16, 0.32]),
    ("callout", "danger", "Demo data, not production", "These accounts, the demo license numbers (LIC-MINAC-DEMO-…) and the demo merchant wallets exist "
              "only so the platform can be demonstrated. Delete them and set real values before the platform is used with real money."),
    ("h2", "9.2 Promoter licence-fee checklist"),
    ("steps", [
        ("Administrator", "Set the amount, the two merchant numbers, the account holder and the instructions in <b>Admin → Licence fees</b>."),
        ("Promoter", "Read the amount and the merchant number on the Licence page."),
        ("Promoter", "Send the exact amount with MTN MoMo (*126#) or Orange Money (#150#) and keep the SMS."),
        ("Promoter", "Declare the transfer: network, wallet name and number, transaction ID, optional receipt."),
        ("Administrator", "Check the merchant wallet or statement and confirm (or reject with a reason)."),
        ("Promoter", "Submit the licence document once the fee is confirmed."),
        ("Administrator", "Approve the licence; the Verified badge appears on the agency's pages."),
    ]),
    ("h2", "9.3 Where things are"),
    ("table", ["I want to…", "Go to"], [
        ["Pay the licence fee / see my payments", "Promoter → Licence, or Promoter → Payments"],
        ["Set the amount, wallets and instructions; confirm or reject a transfer", "Admin → Licence fees"],
        ["Record a cash or counter payment", "Admin → Licence fees → Record a payment"],
        ["Approve or reject a licence", "Admin → Promoters"],
        ["Export the licence-fee ledger", "Admin → Reports → Licence fees → CSV"],
        ["Ask for help with my bio or a message", "Talent → AI assistant"],
    ], [0.42, 0.58]),
    ("h2", "9.4 Support"),
    ("kv", [
        ("Support", CONTACT["support"]),
        ("Platform", CONTACT["platform"]),
        ("Included with this guide", "Talent, promoter and administrator sections · Mobile Money fee walkthrough · AI assistant · troubleshooting"),
        ("About this guide", "This guide describes Talent Connect as it behaves in this installation, including the Cameroon licence-fee flow and "
                             "the AI assistant. Screens, labels and limits may differ from a live deployment once administrators change the fee settings "
                             "or enable live Mobile Money collection."),
    ]),
]
