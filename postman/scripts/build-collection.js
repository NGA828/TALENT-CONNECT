#!/usr/bin/env node
/*
 * Generates the Talent Connect Postman collection (v2.1) + local environment.
 *
 *   node postman/scripts/build-collection.js
 *
 * The collection is designed to be run top-to-bottom (Postman Collection Runner or newman)
 * against a freshly seeded database. Requests chain values (tokens, ids) through
 * collection variables, and every request carries test assertions.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '..');

// ─── helpers ─────────────────────────────────────────────────────────────────
const json = (obj) => ({ mode: 'raw', raw: JSON.stringify(obj, null, 2), options: { raw: { language: 'json' } } });
const form = (fields) => ({ mode: 'formdata', formdata: fields });
const text = (key, value) => ({ key, value, type: 'text' });
const file = (key, src) => ({ key, src, type: 'file' });

const statusTest = (code) => `pm.test("Status code is ${code}", function () {\n    pm.response.to.have.status(${code});\n});`;
const timeTest = `pm.test("Response time is below 2000ms", function () {\n    pm.expect(pm.response.responseTime).to.be.below(2000);\n});`;
const jsonTest = `pm.test("Response is JSON", function () {\n    pm.response.to.be.json;\n});`;
const errorEnvelope = `pm.test("Error envelope has statusCode, message and path", function () {\n    const b = pm.response.json();\n    pm.expect(b).to.have.property("statusCode");\n    pm.expect(b).to.have.property("message");\n    pm.expect(b).to.have.property("path");\n    pm.expect(JSON.stringify(b)).to.not.include("stack");\n});`;
const pageTest = `pm.test("Paginated payload (items, total, page)", function () {\n    const b = pm.response.json();\n    pm.expect(b.items).to.be.an("array");\n    pm.expect(b).to.have.property("total");\n    pm.expect(b).to.have.property("page");\n});`;

/**
 * Build one request item.
 * @param {object} o
 *   name, method, path (after {{baseUrl}}), token (collection var name or null), body,
 *   expect (status), tests (extra script string), query ([{key,value}]), description
 */
function req(o) {
  const url = `{{baseUrl}}${o.path}`;
  const [rawPath, rawQuery] = o.path.split('?');
  const query = rawQuery
    ? rawQuery.split('&').map((kv) => {
        const [key, value = ''] = kv.split('=');
        return { key, value };
      })
    : undefined;
  const header = [];
  if (o.body && o.body.mode === 'raw') header.push({ key: 'Content-Type', value: 'application/json' });
  const exec = [statusTest(o.expect), timeTest];
  if (!o.noJson) exec.push(jsonTest);
  if (o.expect >= 400) exec.push(errorEnvelope);
  if (o.tests) exec.push(o.tests.trim());
  return {
    name: o.name,
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: exec.join('\n\n').split('\n') } }],
    request: {
      method: o.method,
      header,
      auth: o.token ? { type: 'bearer', bearer: [{ key: 'token', value: `{{${o.token}}}`, type: 'string' }] } : { type: 'noauth' },
      ...(o.body ? { body: o.body } : {}),
      url: {
        raw: url,
        host: ['{{baseUrl}}'],
        path: rawPath.replace(/^\//, '').split('/'),
        ...(query ? { query } : {}),
      },
      description: o.description ?? '',
    },
    response: [],
  };
}
const folder = (name, description, item) => ({ name, description, item });

// Expiry dates computed at run time via pre-request script on the collection.
const collectionPreRequest = [
  '// Shared dynamic values used by several requests',
  'const future = new Date(Date.now() + 45 * 24 * 3600 * 1000);',
  'pm.collectionVariables.set("futureDate", future.toISOString());',
  'const expiry = new Date(Date.now() + 365 * 24 * 3600 * 1000);',
  'pm.collectionVariables.set("licenceExpiry", expiry.toISOString().slice(0, 10));',
  'pm.collectionVariables.set("expYear", String(new Date().getFullYear() + 3));',
  'if (!pm.collectionVariables.get("runId")) { pm.collectionVariables.set("runId", String(Date.now())); }',
];

// ─── folders ────────────────────────────────────────────────────────────────
const items = [];

items.push(
  folder('01 · Public', 'Unauthenticated endpoints used by the landing page and registration forms.', [
    req({
      name: 'Get platform metadata',
      method: 'GET', path: '/public/meta', expect: 200,
      tests: `pm.test("Contains specializations, genders and event categories", function () {\n    const b = pm.response.json();\n    pm.expect(b.specializations).to.be.an("array").that.is.not.empty;\n    pm.expect(b.genders).to.be.an("array");\n    pm.expect(b.eventCategories).to.be.an("array");\n    pm.expect(b.currency).to.eql("XAF");\n});`,
    }),
    req({
      name: 'Get landing page data',
      method: 'GET', path: '/public/landing', expect: 200,
      tests: `pm.test("Contains statistics", function () {\n    const b = pm.response.json();\n    pm.expect(b).to.be.an("object");\n    pm.expect(JSON.stringify(b)).to.not.include("passwordHash");\n});`,
    }),
  ]),
);

items.push(
  folder('02 · Auth', 'Registration, login, session and logout.', [
    req({
      name: 'Register talent',
      method: 'POST', path: '/auth/register/talent', expect: 201,
      body: json({
        firstName: 'Amina', lastName: 'Bello', email: 'amina.bello.{{runId}}@example.com', phone: '+237 6 99 11 22 33',
        password: 'Password123!', confirmPassword: 'Password123!', gender: 'FEMALE', specialization: 'Dancer',
      }),
      tests: `pm.test("Returns an access token and TALENT user", function () {\n    const b = pm.response.json();\n    pm.expect(b.accessToken).to.be.a("string");\n    pm.expect(b.user.role).to.eql("TALENT");\n    pm.expect(b.user).to.not.have.property("passwordHash");\n    pm.collectionVariables.set("newTalentToken", b.accessToken);\n    pm.collectionVariables.set("newTalentUserId", b.user.id);\n});`,
    }),
    req({
      name: 'Register talent – duplicate email (409)',
      method: 'POST', path: '/auth/register/talent', expect: 409,
      body: json({
        firstName: 'Amina', lastName: 'Bello', email: 'amina.bello.{{runId}}@example.com', phone: '+237 6 99 11 22 33',
        password: 'Password123!', confirmPassword: 'Password123!', gender: 'FEMALE', specialization: 'Dancer',
      }),
    }),
    req({
      name: 'Register talent – validation errors (422)',
      method: 'POST', path: '/auth/register/talent', expect: 422,
      body: json({ firstName: 'A', lastName: 'Bello', email: 'not-an-email', phone: 'abc', password: 'weak', confirmPassword: 'weak', gender: 'OTHER', specialization: 'Dancer' }),
      tests: `pm.test("Per-field errors are returned", function () {\n    const e = pm.response.json().errors;\n    pm.expect(e).to.have.property("email");\n    pm.expect(e).to.have.property("password");\n    pm.expect(e).to.have.property("phone");\n});`,
    }),
    req({
      name: 'Register promoter',
      method: 'POST', path: '/auth/register/promoter', expect: 201,
      body: json({
        firstName: 'Samuel', lastName: 'Eto', email: 'samuel.eto.{{runId}}@example.com', phone: '+237 6 77 88 99 00',
        password: 'Password123!', confirmPassword: 'Password123!', agencyName: 'Wouri Live Agency', licenceNumber: 'CM-DLA-2026-0457',
        licenceInfo: 'Registered events agency in Douala (demo).',
      }),
      tests: `pm.test("Returns an access token and PROMOTER user", function () {\n    const b = pm.response.json();\n    pm.expect(b.user.role).to.eql("PROMOTER");\n    pm.collectionVariables.set("newPromoterToken", b.accessToken);\n    pm.collectionVariables.set("newPromoterUserId", b.user.id);\n});`,
    }),
    req({
      name: 'Login – admin',
      method: 'POST', path: '/auth/login', expect: 200,
      body: json({ email: '{{adminEmail}}', password: '{{adminPassword}}' }),
      tests: `pm.test("Admin token saved", function () {\n    const b = pm.response.json();\n    pm.expect(b.user.role).to.eql("ADMIN");\n    pm.collectionVariables.set("adminToken", b.accessToken);\n});`,
    }),
    req({
      name: 'Login – talent',
      method: 'POST', path: '/auth/login', expect: 200,
      body: json({ email: '{{talentEmail}}', password: '{{talentPassword}}' }),
      tests: `pm.test("Talent token and ids saved", function () {\n    const b = pm.response.json();\n    pm.expect(b.user.role).to.eql("TALENT");\n    pm.collectionVariables.set("talentToken", b.accessToken);\n    pm.collectionVariables.set("talentUserId", b.user.id);\n    pm.collectionVariables.set("talentId", b.user.talent.id);\n});`,
    }),
    req({
      name: 'Login – promoter',
      method: 'POST', path: '/auth/login', expect: 200,
      body: json({ email: '{{promoterEmail}}', password: '{{promoterPassword}}' }),
      tests: `pm.test("Promoter token saved", function () {\n    const b = pm.response.json();\n    pm.expect(b.user.role).to.eql("PROMOTER");\n    pm.collectionVariables.set("promoterToken", b.accessToken);\n    pm.collectionVariables.set("promoterUserId", b.user.id);\n});`,
    }),
    req({
      name: 'Login – wrong password (401)',
      method: 'POST', path: '/auth/login', expect: 401,
      body: json({ email: '{{talentEmail}}', password: 'WrongPassword1' }),
    }),
    req({
      name: 'Get current user (me)',
      method: 'GET', path: '/auth/me', token: 'talentToken', expect: 200,
      tests: `pm.test("Returns the logged-in talent", function () {\n    const b = pm.response.json();\n    pm.expect(b.email).to.eql(pm.environment.get("talentEmail") || pm.collectionVariables.get("talentEmail"));\n    pm.expect(b.talent).to.be.an("object");\n});`,
    }),
    req({
      name: 'Get current user – no token (401)',
      method: 'GET', path: '/auth/me', expect: 401,
    }),
  ]),
);

items.push(
  folder('03 · Users', 'Account-level operations shared by every role.', [
    req({
      name: 'Update my account',
      method: 'PATCH', path: '/users/me', token: 'newTalentToken', expect: 200,
      body: json({ firstName: 'Amina', lastName: 'Bello-Nkemdirim', phone: '+237 6 99 11 22 34' }),
      tests: `pm.test("Last name updated", function () {\n    pm.expect(pm.response.json().lastName).to.eql("Bello-Nkemdirim");\n});`,
    }),
    req({
      name: 'Upload avatar (multipart)',
      method: 'POST', path: '/users/me/avatar', token: 'newTalentToken', expect: 201,
      body: form([file('file', 'backend/seed-assets/dancer-contemporary.jpg')]),
      tests: `pm.test("Avatar URL returned", function () {\n    pm.expect(pm.response.json().avatarUrl).to.match(/^\\/uploads\\//);\n});`,
    }),
    req({
      name: 'Change password',
      method: 'PATCH', path: '/users/me/password', token: 'newTalentToken', expect: 200,
      body: json({ currentPassword: 'Password123!', newPassword: 'NewPassword456!' }),
      tests: `pm.test("Password changed", function () {\n    pm.expect(pm.response.json()).to.be.an("object");\n});`,
    }),
    req({
      name: 'Old token revoked after password change (401)',
      method: 'GET', path: '/auth/me', token: 'newTalentToken', expect: 401,
    }),
    req({
      name: 'Login with the new password',
      method: 'POST', path: '/auth/login', expect: 200,
      body: json({ email: 'amina.bello.{{runId}}@example.com', password: 'NewPassword456!' }),
      tests: `pm.test("Fresh token saved", function () {\n    const b = pm.response.json();\n    pm.expect(b.accessToken).to.be.a("string");\n    pm.collectionVariables.set("newTalentToken", b.accessToken);\n});`,
    }),
    req({
      name: 'Change password – wrong current password (401)',
      method: 'PATCH', path: '/users/me/password', token: 'newTalentToken', expect: 401,
      body: json({ currentPassword: 'Nope12345', newPassword: 'Another789!' }),
    }),
    req({
      name: 'Get user summary card',
      method: 'GET', path: '/users/{{promoterUserId}}/summary', token: 'talentToken', expect: 200,
      tests: `pm.test("Summary has name and role", function () {\n    const b = pm.response.json();\n    pm.expect(b).to.have.property("firstName");\n    pm.expect(b.role).to.eql("PROMOTER");\n});`,
    }),
  ]),
);

items.push(
  folder('04 · Talents', 'Talent profile, dashboard and talent search (for promoters).', [
    req({
      name: 'Get my talent profile',
      method: 'GET', path: '/talents/me', token: 'talentToken', expect: 200,
      tests: `pm.test("Profile includes completion checklist", function () {\n    pm.expect(pm.response.json()).to.have.property("completion");\n});`,
    }),
    req({
      name: 'Update my talent profile',
      method: 'PATCH', path: '/talents/me', token: 'talentToken', expect: 200,
      body: json({
        location: 'Douala, Cameroon', experienceYears: 9,
        skills: ['Editorial photography', 'Live event coverage', 'Retouching', 'Studio lighting', 'Art direction'],
      }),
      tests: `pm.test("Skills saved", function () {\n    const b = pm.response.json();\n    pm.expect(JSON.stringify(b)).to.include("Retouching");\n});`,
    }),
    req({ name: 'Get talent dashboard', method: 'GET', path: '/talents/me/dashboard', token: 'talentToken', expect: 200 }),
    req({
      name: 'List specializations',
      method: 'GET', path: '/talents/specializations', token: 'promoterToken', expect: 200,
      tests: `pm.test("Array of specializations", function () {\n    const names = pm.response.json().map(function (s) { return s.name; });\n    pm.expect(names).to.include("Photographer");\n});`,
    }),
    req({
      name: 'Search talents',
      method: 'GET', path: '/talents?specialization=Photographer&sort=rating&page=1&pageSize=5', token: 'promoterToken', expect: 200,
      tests: pageTest,
    }),
    req({
      name: 'Get talent by id',
      method: 'GET', path: '/talents/{{talentId}}', token: 'promoterToken', expect: 200,
      tests: `pm.test("Correct talent returned", function () {\n    pm.expect(pm.response.json().id).to.eql(pm.collectionVariables.get("talentId"));\n});`,
    }),
    req({
      name: 'Search talents as talent – forbidden (403)',
      method: 'GET', path: '/talents', token: 'talentToken', expect: 403,
    }),
  ]),
);

items.push(
  folder('05 · Promoters', 'Agency profile, dashboard and licence submission.', [
    req({ name: 'Get my promoter profile', method: 'GET', path: '/promoters/me', token: 'promoterToken', expect: 200,
      tests: `pm.test("Verified agency", function () {\n    pm.expect(pm.response.json().licenceStatus).to.eql("VERIFIED");\n});` }),
    req({
      name: 'Update my promoter profile',
      method: 'PATCH', path: '/promoters/me', token: 'newPromoterToken', expect: 200,
      body: json({ agencyDescription: 'Concerts, festivals and corporate galas across the Littoral region.', location: 'Douala, Cameroon', website: 'https://wouri-live.example.com' }),
      tests: `pm.test("Location saved", function () {\n    pm.expect(JSON.stringify(pm.response.json())).to.include("Douala");\n});`,
    }),
    req({ name: 'Get promoter dashboard', method: 'GET', path: '/promoters/me/dashboard', token: 'promoterToken', expect: 200 }),
    req({
      name: 'Submit licence (multipart)',
      method: 'POST', path: '/promoters/me/licence', token: 'newPromoterToken', expect: 201,
      body: form([
        text('licenceNumber', 'CM-DLA-2026-0457'),
        text('licenceAuthority', 'Ministry of Arts and Culture (demo)'),
        text('licenceExpiry', '{{licenceExpiry}}'),
        text('licenceInfo', 'Scanned licence attached.'),
        file('document', 'backend/seed-assets/sample-contract.pdf'),
      ]),
      tests: `pm.test("Licence details stored", function () {\n    const b = pm.response.json();\n    pm.expect(JSON.stringify(b)).to.include("CM-DLA-2026-0457");\n    const id = b.id || (b.promoter && b.promoter.id);\n    if (id) pm.collectionVariables.set("newPromoterId", id);\n});`,
    }),
    req({
      name: 'Submit licence – expired date (400)',
      method: 'POST', path: '/promoters/me/licence', token: 'newPromoterToken', expect: 400,
      body: form([text('licenceNumber', 'CM-DLA-2020-0001'), text('licenceAuthority', 'Ministry (demo)'), text('licenceExpiry', '2020-01-01')]),
    }),
  ]),
);

items.push(
  folder('06 · Portfolios', 'Talent portfolio media (image, video, audio, PDF).', [
    req({
      name: 'Upload portfolio item (multipart)',
      method: 'POST', path: '/portfolios', token: 'talentToken', expect: 201,
      body: form([
        text('title', 'Douala Fashion Week – backstage'),
        text('description', 'Editorial backstage coverage shot on location.'),
        text('isPublished', 'true'),
        file('file', 'backend/seed-assets/fashion-editorial.jpg'),
      ]),
      tests: `pm.test("Portfolio item created as IMAGE", function () {\n    const b = pm.response.json();\n    pm.expect(b.mediaType || b.type).to.eql("IMAGE");\n    pm.collectionVariables.set("portfolioId", b.id);\n});`,
    }),
    req({
      name: 'Upload portfolio – missing file (400/422)',
      method: 'POST', path: '/portfolios', token: 'talentToken', expect: 400,
      body: form([text('title', 'No file attached')]),
    }),
    req({ name: 'List my portfolio', method: 'GET', path: '/portfolios/mine?type=IMAGE&page=1&pageSize=5', token: 'talentToken', expect: 200, tests: pageTest }),
    req({ name: 'Get portfolio item', method: 'GET', path: '/portfolios/{{portfolioId}}', token: 'talentToken', expect: 200 }),
    req({
      name: 'Update portfolio item',
      method: 'PATCH', path: '/portfolios/{{portfolioId}}', token: 'talentToken', expect: 200,
      body: form([text('title', 'Douala Fashion Week – backstage (selects)'), text('isPublished', 'true')]),
      tests: `pm.test("Title updated", function () {\n    pm.expect(pm.response.json().title).to.include("selects");\n});`,
    }),
    req({ name: "Get a talent's public portfolio", method: 'GET', path: '/portfolios/talent/{{talentId}}', token: 'promoterToken', expect: 200 }),
  ]),
);

items.push(
  folder('07 · Events', 'Event lifecycle for promoters and enrolment for talents.', [
    req({
      name: 'Create event (publish)',
      method: 'POST', path: '/events', token: 'promoterToken', expect: 201,
      body: json({
        title: 'Yaoundé Jazz Night {{runId}}', location: 'Palais des Congrès (demo), Yaoundé',
        description: 'An evening of live jazz for 800 guests. We need a photographer to cover the stage and VIP lounge.',
        category: 'Music', talentNeeded: 'Photographer', budget: '250,000 – 400,000 FCFA', eventDate: '{{futureDate}}', publish: true,
      }),
      tests: `pm.test("Event is PUBLISHED", function () {\n    const b = pm.response.json();\n    pm.expect(b.status).to.eql("PUBLISHED");\n    pm.collectionVariables.set("eventId", b.id);\n});`,
    }),
    req({
      name: 'Create draft event',
      method: 'POST', path: '/events', token: 'promoterToken', expect: 201,
      body: json({
        title: 'Kribi Beach Festival (draft)', location: 'Kribi, Cameroon',
        description: 'Draft planning for a two-day beach festival with DJs and dancers.', category: 'Festival', eventDate: '{{futureDate}}',
      }),
      tests: `pm.test("Event is DRAFT", function () {\n    const b = pm.response.json();\n    pm.expect(b.status).to.eql("DRAFT");\n    pm.collectionVariables.set("draftEventId", b.id);\n});`,
    }),
    req({
      name: 'Create event – validation errors (422)',
      method: 'POST', path: '/events', token: 'promoterToken', expect: 422,
      body: json({ title: 'X', location: '', description: 'too short', eventDate: 'tomorrow' }),
    }),
    req({ name: 'Browse events (talent)', method: 'GET', path: '/events?sort=date&page=1&pageSize=5', token: 'talentToken', expect: 200, tests: pageTest }),
    req({ name: 'List my events (promoter)', method: 'GET', path: '/events/mine?page=1&pageSize=5', token: 'promoterToken', expect: 200, tests: pageTest }),
    req({ name: 'Get event by id', method: 'GET', path: '/events/{{eventId}}', token: 'talentToken', expect: 200 }),
    req({
      name: 'Update event',
      method: 'PATCH', path: '/events/{{eventId}}', token: 'promoterToken', expect: 200,
      body: json({ budget: '300,000 – 450,000 FCFA', talentNeeded: 'Photographer, Videographer' }),
      tests: `pm.test("Budget updated", function () {\n    pm.expect(pm.response.json().budget).to.include("300,000");\n});`,
    }),
    req({
      name: 'Update event – foreign-currency budget (422)',
      method: 'PATCH', path: '/events/{{eventId}}', token: 'promoterToken', expect: 422,
      body: json({ budget: '$500 – $900' }),
      tests: `pm.test(\"Budget must be in FCFA\", function () {\n    pm.expect(pm.response.json().errors.budget[0]).to.include(\"FCFA\");\n});`,
    }),
    req({
      name: 'Upload event photos (multipart)',
      method: 'POST', path: '/events/{{eventId}}/images', token: 'promoterToken', expect: 201,
      body: form([file('images', 'backend/seed-assets/event-jazz-club.jpg'), file('images', 'backend/seed-assets/band-live-stage.jpg')]),
      tests: `pm.test(\"Two photos attached; first is the cover\", function () {\n    const b = pm.response.json();\n    pm.expect(b.images).to.have.lengthOf(2);\n    pm.expect(b.coverImageUrl).to.eql(b.images[0].url);\n    pm.collectionVariables.set(\"eventImageId\", b.images[1].id);\n});`,
    }),
    req({
      name: 'Upload event photo – not an image (415)',
      method: 'POST', path: '/events/{{eventId}}/images', token: 'promoterToken', expect: 415,
      body: form([file('images', 'backend/seed-assets/sample-contract.pdf')]),
    }),
    req({
      name: 'Set event cover photo',
      method: 'PATCH', path: '/events/{{eventId}}/images/{{eventImageId}}/cover', token: 'promoterToken', expect: 200,
      tests: `pm.test(\"Chosen photo is now the cover\", function () {\n    const b = pm.response.json();\n    pm.expect(b.images[0].id).to.eql(pm.collectionVariables.get(\"eventImageId\"));\n    pm.expect(b.coverImageUrl).to.eql(b.images[0].url);\n});`,
    }),
    req({
      name: 'Delete event photo',
      method: 'DELETE', path: '/events/{{eventId}}/images/{{eventImageId}}', token: 'promoterToken', expect: 200,
      tests: `pm.test(\"One photo left\", function () {\n    pm.expect(pm.response.json().images).to.have.lengthOf(1);\n});`,
    }),
    req({
      name: 'Enrol in event (talent)',
      method: 'POST', path: '/events/{{eventId}}/enroll', token: 'talentToken', expect: 201,
      body: json({ note: 'Available all evening – I can deliver selects within 48 hours.' }),
    }),
    req({
      name: 'Enrol again – conflict (409)',
      method: 'POST', path: '/events/{{eventId}}/enroll', token: 'talentToken', expect: 409,
      body: json({ note: 'Second try' }),
    }),
    req({ name: 'List my enrolments (talent)', method: 'GET', path: '/events/enrolled/mine?when=upcoming', token: 'talentToken', expect: 200 }),
    req({ name: 'List event enrolments (promoter)', method: 'GET', path: '/events/{{eventId}}/enrollments', token: 'promoterToken', expect: 200 }),
    req({ name: 'Publish draft event', method: 'POST', path: '/events/{{draftEventId}}/publish', token: 'promoterToken', expect: 201,
      tests: `pm.test("Now PUBLISHED", function () {\n    pm.expect(pm.response.json().status).to.eql("PUBLISHED");\n});` }),
    req({ name: 'Unpublish event', method: 'POST', path: '/events/{{draftEventId}}/unpublish', token: 'promoterToken', expect: 201,
      tests: `pm.test("Back to DRAFT", function () {\n    pm.expect(pm.response.json().status).to.eql("DRAFT");\n});` }),
    req({ name: 'Update event as talent – forbidden (403)', method: 'PATCH', path: '/events/{{eventId}}', token: 'talentToken', expect: 403, body: json({ budget: '1 FCFA' }) }),
    req({ name: 'Get unknown event (404)', method: 'GET', path: '/events/does-not-exist', token: 'talentToken', expect: 404 }),
  ]),
);

items.push(
  folder('08 · Contracts', 'Contract creation, negotiation and completion.', [
    req({
      name: 'Create contract',
      method: 'POST', path: '/contracts', token: 'promoterToken', expect: 201,
      body: json({
        talentId: '{{talentId}}', eventId: '{{eventId}}', amount: 350000, currency: 'XAF',
        terms: 'Photography coverage from 18:00 to 23:00 including stage and VIP lounge. Delivery of 150 retouched images within 48 hours.',
      }),
      tests: `pm.test("Contract is PENDING", function () {\n    const b = pm.response.json();\n    pm.expect(b.status).to.eql("PENDING");\n    pm.collectionVariables.set("contractId", b.id);\n});`,
    }),
    req({
      name: 'Create contract – duplicate (409)',
      method: 'POST', path: '/contracts', token: 'promoterToken', expect: 409,
      body: json({ talentId: '{{talentId}}', eventId: '{{eventId}}', terms: 'Duplicate contract for the same talent and event.' }),
    }),
    req({ name: 'List my contracts (talent)', method: 'GET', path: '/contracts?status=PENDING', token: 'talentToken', expect: 200, tests: pageTest }),
    req({ name: 'Get contract by id', method: 'GET', path: '/contracts/{{contractId}}', token: 'talentToken', expect: 200 }),
    req({
      name: 'Amend contract',
      method: 'PATCH', path: '/contracts/{{contractId}}', token: 'promoterToken', expect: 200,
      body: json({ amount: 375000, reviewNotes: 'Added 30 minutes of after-party coverage.' }),
      tests: `pm.test("Amount updated", function () {\n    pm.expect(Number(pm.response.json().amount)).to.eql(375000);\n});`,
    }),
    req({
      name: 'Respond to contract – accept (talent)',
      method: 'POST', path: '/contracts/{{contractId}}/respond', token: 'talentToken', expect: 201,
      body: json({ decision: 'ACCEPT', note: 'Looking forward to it!' }),
      tests: `pm.test("Contract is ACTIVE", function () {\n    pm.expect(pm.response.json().status).to.eql("ACTIVE");\n});`,
    }),
    req({
      name: 'Attach signed contract PDF (multipart)',
      method: 'POST', path: '/contracts/{{contractId}}/document', token: 'promoterToken', expect: 201,
      body: form([file('file', 'backend/seed-assets/sample-contract.pdf')]),
    }),
    req({
      name: 'Complete contract',
      method: 'PATCH', path: '/contracts/{{contractId}}/status', token: 'promoterToken', expect: 200,
      body: json({ status: 'COMPLETED' }),
      tests: `pm.test("Contract is COMPLETED", function () {\n    pm.expect(pm.response.json().status).to.eql("COMPLETED");\n});`,
    }),
    req({ name: 'Get contract as another talent – forbidden (403)', method: 'GET', path: '/contracts/{{contractId}}', token: 'newTalentToken', expect: 403 }),
  ]),
);

items.push(
  folder('09 · Ratings', 'Promoters rate talents after a completed contract.', [
    req({
      name: 'Rate talent',
      method: 'POST', path: '/ratings', token: 'promoterToken', expect: 201,
      body: json({ contractId: '{{contractId}}', score: 5, comment: 'Punctual, professional and delivered stunning images.' }),
      tests: `pm.test("Score saved", function () {\n    pm.expect(pm.response.json().score).to.eql(5);\n});`,
    }),
    req({
      name: 'Rate again – conflict (409)',
      method: 'POST', path: '/ratings', token: 'promoterToken', expect: 409,
      body: json({ contractId: '{{contractId}}', score: 4 }),
    }),
    req({ name: 'Get my ratings (talent)', method: 'GET', path: '/ratings/me', token: 'talentToken', expect: 200,
      tests: `pm.test("Summary with average", function () {\n    pm.expect(pm.response.json().summary).to.have.property("average");\n});` }),
    req({ name: "Get a talent's ratings (promoter)", method: 'GET', path: '/ratings/talent/{{talentId}}', token: 'promoterToken', expect: 200 }),
  ]),
);

items.push(
  folder('10 · Messages', 'Direct messages between talents and promoters.', [
    req({
      name: 'Send message',
      method: 'POST', path: '/messages', token: 'talentToken', expect: 201,
      body: json({ recipientId: '{{promoterUserId}}', content: 'Hello Jordan, thanks for the contract! Could you share the stage plan for the jazz night?' }),
      tests: `pm.test("Message created", function () {\n    const b = pm.response.json();\n    pm.collectionVariables.set("messageId", b.id);\n    pm.expect(b.content).to.include("stage plan");\n});`,
    }),
    req({
      name: 'Send message – empty content (422)',
      method: 'POST', path: '/messages', token: 'talentToken', expect: 422,
      body: json({ recipientId: '{{promoterUserId}}', content: '' }),
    }),
    req({ name: 'List conversations', method: 'GET', path: '/messages/conversations', token: 'promoterToken', expect: 200 }),
    req({ name: 'Get unread message count', method: 'GET', path: '/messages/unread-count', token: 'promoterToken', expect: 200,
      tests: `pm.test("Count is a number", function () {\n    pm.expect(pm.response.json().count).to.be.a("number");\n});` }),
    req({ name: 'Get conversation with user', method: 'GET', path: '/messages/conversations/{{talentUserId}}', token: 'promoterToken', expect: 200 }),
    req({ name: 'Mark message read', method: 'PATCH', path: '/messages/{{messageId}}/read', token: 'promoterToken', expect: 200 }),
    req({ name: 'Mark conversation read', method: 'PATCH', path: '/messages/conversations/{{talentUserId}}/read', token: 'promoterToken', expect: 200 }),
  ]),
);

items.push(
  folder('11 · Notifications', 'In-app notifications.', [
    req({
      name: 'List notifications',
      method: 'GET', path: '/notifications?page=1&pageSize=5', token: 'talentToken', expect: 200,
      tests: `${pageTest}\n\npm.test("Save first notification id", function () {\n    const b = pm.response.json();\n    if (b.items.length) pm.collectionVariables.set("notificationId", b.items[0].id);\n});`,
    }),
    req({ name: 'Get unread notification count', method: 'GET', path: '/notifications/unread-count', token: 'talentToken', expect: 200 }),
    req({ name: 'Mark notification read', method: 'PATCH', path: '/notifications/{{notificationId}}/read', token: 'talentToken', expect: 200 }),
    req({ name: 'Mark all notifications read', method: 'PATCH', path: '/notifications/read-all', token: 'talentToken', expect: 200 }),
  ]),
);

items.push(
  folder('12 · Payments', 'Licence-fee payment through the sandbox provider.', [
    req({ name: 'Get payment config', method: 'GET', path: '/payments/config', token: 'newPromoterToken', expect: 200,
      tests: `pm.test("Sandbox provider in XAF", function () {\n    const b = pm.response.json();\n    pm.expect(b.sandbox).to.eql(true);\n    pm.expect(b.currency).to.eql("XAF");\n});` }),
    req({
      name: 'Start licence-fee checkout',
      method: 'POST', path: '/payments/checkout', token: 'newPromoterToken', expect: 201,
      tests: `pm.test("Pending payment created", function () {\n    const b = pm.response.json();\n    pm.expect(b.payment.status).to.eql("PENDING");\n    pm.collectionVariables.set("paymentId", b.payment.id);\n});`,
    }),
    req({
      name: 'Pay – declined card',
      method: 'POST', path: '/payments/{{paymentId}}/pay', token: 'newPromoterToken', expect: 201,
      body: json({ cardholderName: 'Samuel Eto', cardNumber: '4000000000000002', expMonth: 12, expYear: '{{expYear}}', cvc: '123' }),
      tests: `pm.test("Payment FAILED with a reason", function () {\n    const p = pm.response.json().payment;\n    pm.expect(p.status).to.eql("FAILED");\n    pm.expect(p.failureReason).to.be.a("string");\n});`,
    }),
    req({
      name: 'Pay – invalid card number (422)',
      method: 'POST', path: '/payments/{{paymentId}}/pay', token: 'newPromoterToken', expect: 422,
      body: json({ cardholderName: 'Samuel Eto', cardNumber: '1234567890123456', expMonth: 12, expYear: '{{expYear}}', cvc: '123' }),
    }),
    req({
      name: 'Pay – successful card',
      method: 'POST', path: '/payments/{{paymentId}}/pay', token: 'newPromoterToken', expect: 201,
      body: json({ cardholderName: 'Samuel Eto', cardNumber: '4242424242424242', expMonth: 12, expYear: '{{expYear}}', cvc: '123' }),
      tests: `pm.test("Payment SUCCESS, only last4 stored", function () {\n    const p = pm.response.json().payment;\n    pm.expect(p.status).to.eql("SUCCESS");\n    pm.expect(JSON.stringify(p)).to.not.include("4242424242424242");\n});`,
    }),
    req({ name: 'List my payments', method: 'GET', path: '/payments', token: 'newPromoterToken', expect: 200, tests: pageTest }),
    req({ name: 'Get payment by id', method: 'GET', path: '/payments/{{paymentId}}', token: 'newPromoterToken', expect: 200 }),
  ]),
);

items.push(
  folder('13 · AI assistant', 'AI writing assistant for talents (offline provider when no key is configured).', [
    req({ name: 'Get AI status', method: 'GET', path: '/ai/status', token: 'talentToken', expect: 200 }),
    req({
      name: 'Chat – improve bio',
      method: 'POST', path: '/ai/chat', token: 'talentToken', expect: 200,
      body: json({ message: 'Please make my bio more engaging for festival promoters.', task: 'IMPROVE_BIO' }),
      tests: `pm.test("Reply returned", function () {\n    pm.expect(pm.response.json().reply).to.be.a("string").and.not.empty;\n});`,
    }),
    req({ name: 'Get AI history', method: 'GET', path: '/ai/history', token: 'talentToken', expect: 200 }),
    req({ name: 'Clear AI history', method: 'DELETE', path: '/ai/history', token: 'talentToken', expect: 200 }),
  ]),
);

items.push(
  folder('14 · Admin', 'Platform administration: users, verification, moderation, payments and reports.', [
    req({ name: 'Get platform stats', method: 'GET', path: '/admin/stats', token: 'adminToken', expect: 200 }),
    req({ name: 'Get monitoring data', method: 'GET', path: '/admin/monitoring', token: 'adminToken', expect: 200 }),
    req({ name: 'List users', method: 'GET', path: '/admin/users?role=TALENT&page=1&pageSize=5', token: 'adminToken', expect: 200, tests: pageTest }),
    req({
      name: 'List promoters pending verification',
      method: 'GET', path: '/admin/promoters?status=PENDING&q=Wouri', token: 'adminToken', expect: 200,
      tests: `${pageTest}\n\npm.test("New promoter is in the queue", function () {\n    const b = pm.response.json();\n    pm.expect(b.items.length).to.be.above(0);\n    pm.collectionVariables.set("newPromoterId", b.items[0].id);\n});`,
    }),
    req({ name: 'Get promoter details', method: 'GET', path: '/admin/promoters/{{newPromoterId}}', token: 'adminToken', expect: 200 }),
    req({
      name: 'Reject promoter – reason required (400)',
      method: 'PATCH', path: '/admin/promoters/{{newPromoterId}}/verify', token: 'adminToken', expect: 400,
      body: json({ approved: false }),
    }),
    req({
      name: 'Approve promoter',
      method: 'PATCH', path: '/admin/promoters/{{newPromoterId}}/verify', token: 'adminToken', expect: 200,
      body: json({ approved: true }),
      tests: `pm.test("Licence VERIFIED", function () {\n    pm.expect(JSON.stringify(pm.response.json())).to.include("VERIFIED");\n});`,
    }),
    req({ name: 'List portfolios for moderation', method: 'GET', path: '/admin/portfolios?status=ACTIVE&page=1&pageSize=5', token: 'adminToken', expect: 200, tests: pageTest }),
    req({
      name: 'Flag portfolio item',
      method: 'PATCH', path: '/admin/portfolios/{{portfolioId}}/moderate', token: 'adminToken', expect: 200,
      body: json({ action: 'FLAG', note: 'Please confirm you hold the model release for this image.' }),
      tests: `pm.test("Item FLAGGED", function () {\n    pm.expect(JSON.stringify(pm.response.json())).to.include("FLAGGED");\n});`,
    }),
    req({
      name: 'Restore portfolio item',
      method: 'PATCH', path: '/admin/portfolios/{{portfolioId}}/moderate', token: 'adminToken', expect: 200,
      body: json({ action: 'RESTORE' }),
    }),
    req({ name: 'List events (admin)', method: 'GET', path: '/admin/events?page=1&pageSize=5', token: 'adminToken', expect: 200, tests: pageTest }),
    req({ name: 'List payments (admin)', method: 'GET', path: '/admin/payments?status=SUCCESS&page=1&pageSize=5', token: 'adminToken', expect: 200, tests: pageTest }),
    req({ name: 'Refund payment', method: 'POST', path: '/admin/payments/{{paymentId}}/refund', token: 'adminToken', expect: 201,
      tests: `pm.test("Payment REFUNDED", function () {\n    pm.expect(JSON.stringify(pm.response.json())).to.include("REFUNDED");\n});` }),
    req({ name: 'Generate report (JSON)', method: 'GET', path: '/admin/reports/contracts?format=json', token: 'adminToken', expect: 200,
      tests: `pm.test("Report has columns and rows", function () {\n    const b = pm.response.json();\n    pm.expect(b.columns).to.be.an("array");\n    pm.expect(b.rows).to.be.an("array");\n});` }),
    req({ name: 'Export report (CSV)', method: 'GET', path: '/admin/reports/users?format=csv', token: 'adminToken', expect: 200, noJson: true,
      tests: `pm.test("CSV attachment", function () {\n    pm.expect(pm.response.headers.get("Content-Type")).to.include("text/csv");\n});` }),
    req({
      name: 'Suspend user',
      method: 'PATCH', path: '/admin/users/{{newTalentUserId}}/status', token: 'adminToken', expect: 200,
      body: json({ status: 'SUSPENDED', reason: 'Automated API test – suspended account check.' }),
      tests: `pm.test("User SUSPENDED", function () {\n    pm.expect(pm.response.json().status).to.eql("SUSPENDED");\n});`,
    }),
    req({ name: 'Suspended user token is revoked (401)', method: 'GET', path: '/auth/me', token: 'newTalentToken', expect: 401 }),
    req({ name: 'Admin route as talent – forbidden (403)', method: 'GET', path: '/admin/stats', token: 'talentToken', expect: 403 }),
  ]),
);

items.push(
  folder('15 · Cleanup', 'Deletes data created by the run.', [
    req({ name: 'Delete draft event', method: 'DELETE', path: '/events/{{draftEventId}}', token: 'promoterToken', expect: 200 }),
    req({ name: 'Delete portfolio item', method: 'DELETE', path: '/portfolios/{{portfolioId}}', token: 'talentToken', expect: 200 }),
    req({ name: 'Logout', method: 'POST', path: '/auth/logout', token: 'talentToken', expect: 200 }),
  ]),
);

// ─── write files ────────────────────────────────────────────────────────────
const collection = {
  info: {
    name: 'Talent Connect API',
    _postman_id: '6f2d3c1e-8a47-4b5e-9d7a-talentconnect',
    description:
      'End-to-end API test collection for the Talent Connect NestJS backend.\n\nRun it top-to-bottom against a freshly seeded database (`npm run db:reset`). Requests chain tokens and ids through collection variables; each request has test assertions.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: collectionPreRequest } }],
  variable: [
    'runId', 'futureDate', 'licenceExpiry', 'expYear',
    'adminToken', 'talentToken', 'promoterToken', 'newTalentToken', 'newPromoterToken',
    'talentUserId', 'talentId', 'promoterUserId', 'newTalentUserId', 'newPromoterUserId', 'newPromoterId',
    'portfolioId', 'eventId', 'eventImageId', 'draftEventId', 'contractId', 'messageId', 'notificationId', 'paymentId',
  ].map((key) => ({ key, value: '' })),
  item: items,
};

const environment = {
  id: 'b1d6c4a2-3f0e-4e8b-a1f2-talentconnect-local',
  name: 'Talent Connect – Local',
  values: [
    ['baseUrl', 'http://localhost:4000/api'],
    ['adminEmail', 'admin@talentconnect.dev'],
    ['adminPassword', 'Admin@12345'],
    ['talentEmail', 'alex.rivera@talentconnect.dev'],
    ['talentPassword', 'Password123!'],
    ['promoterEmail', 'jordan.blake@talentconnect.dev'],
    ['promoterPassword', 'Password123!'],
  ].map(([key, value]) => ({ key, value, type: key.includes('Password') ? 'secret' : 'default', enabled: true })),
  _postman_variable_scope: 'environment',
};

fs.writeFileSync(path.join(OUT, 'TalentConnect.postman_collection.json'), JSON.stringify(collection, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'TalentConnect.local.postman_environment.json'), JSON.stringify(environment, null, 2) + '\n');
const count = items.reduce((n, f) => n + f.item.length, 0);
console.log(`Wrote collection with ${items.length} folders and ${count} requests.`);
