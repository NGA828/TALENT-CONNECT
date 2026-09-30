import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'expect';
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { after as afterAll, before as beforeAll, describe, it } from 'node:test';
import request from 'supertest';

process.env.DATABASE_URL = 'file:./prisma/test.db';
process.env.UPLOAD_DIR = './uploads-test';
process.env.RATE_LIMIT = '100000';
process.env.AUTH_RATE_LIMIT = '100000';
process.env.AI_RATE_LIMIT = '100000';

/** Builds a fresh, seeded SQLite database (prisma/test.db) – the development database is never touched. */
function prepareDatabase() {
  const env = { ...process.env };
  rmSync('prisma/test.db', { force: true });
  execSync('npx prisma migrate deploy', { env, stdio: 'ignore' });
  execSync('npx ts-node --transpile-only prisma/seed.ts', { env, stdio: 'ignore' });
}


const PASSWORD = 'Password123!';
// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const future = (days: number) => new Date(Date.now() + days * 864e5).toISOString();

describe('Talent Connect API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  const login = async (email: string, password = PASSWORD) => {
    const res = await http.post('/api/auth/login').send({ email, password });
    return { token: res.body.accessToken as string, user: res.body.user, status: res.status };
  };
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const get = (url: string, token?: string) => http.get(url).set(token ? auth(token) : {});
  const post = (url: string, token: string, body: object = {}) => http.post(url).set(auth(token)).send(body);
  const patch = (url: string, token: string, body: object = {}) => http.patch(url).set(auth(token)).send(body);

  let admin: string, alex: string, liam: string, jordan: string, nadia: string, grace: string, elena: string;
  let alexUser: any, jordanUser: any, liamUser: any;

  beforeAll(async () => {
    prepareDatabase();
    const { AppModule } = await import('../src/app.module');
    const { configureApp } = await import('../src/setup-app');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, []);
    await app.init();
    http = request(app.getHttpServer());
    admin = (await login('admin@talentconnect.dev', 'Admin@12345')).token;
    const a = await login('alex.rivera@talentconnect.dev'); alex = a.token; alexUser = a.user;
    const l = await login('liam.carter@talentconnect.dev'); liam = l.token; liamUser = l.user;
    const j = await login('jordan.blake@talentconnect.dev'); jordan = j.token; jordanUser = j.user;
    nadia = (await login('nadia.haddad@talentconnect.dev')).token;
    grace = (await login('grace.lin@talentconnect.dev')).token;
    elena = (await login('elena.petrova@talentconnect.dev')).token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ───────────────────────── public ─────────────────────────
  describe('public', () => {
    it('serves landing data without authentication', async () => {
      const res = await get('/api/public/landing');
      expect(res.status).toBe(200);
      expect(res.body.stats.talents).toBeGreaterThan(5);
      expect(res.body.featuredTalents.length).toBeGreaterThan(0);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|@talentconnect/);
    });
    it('rejects protected routes without a token (401)', async () => {
      expect((await get('/api/talents/me')).status).toBe(401);
      expect((await get('/api/events')).status).toBe(401);
    });
  });

  // ───────────────────────── authentication ─────────────────────────
  describe('authentication', () => {
    const talentBody = { firstName: 'Mia', lastName: 'Chen', email: 'Mia.Chen@Example.com', phone: '+1 555 010 2030', password: 'Str0ngPass!', confirmPassword: 'Str0ngPass!', gender: 'FEMALE', specialization: 'Vocalist' };

    it('registers a talent, hashes the password and returns a JWT', async () => {
      const res = await http.post('/api/auth/register/talent').send(talentBody);
      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.user.role).toBe('TALENT');
      expect(res.body.user.email).toBe('mia.chen@example.com');
      expect(res.body.user.talent.specialization).toBe('Vocalist');
      expect(res.body.user.passwordHash).toBeUndefined();
    });
    it('rejects duplicate registration (409)', async () => {
      const res = await http.post('/api/auth/register/talent').send(talentBody);
      expect(res.status).toBe(409);
    });
    it('rejects a weak password and mismatched confirmation (422)', async () => {
      const weak = await http.post('/api/auth/register/talent').send({ ...talentBody, email: 'w@example.com', password: 'weak', confirmPassword: 'weak' });
      expect(weak.status).toBe(422);
      expect(weak.body.errors.password).toBeDefined();
      const mismatch = await http.post('/api/auth/register/talent').send({ ...talentBody, email: 'm@example.com', confirmPassword: 'Different1!' });
      expect(mismatch.status).toBe(422);
      expect(mismatch.body.errors.confirmPassword).toBeDefined();
    });
    it('rejects unknown fields (mass assignment protection)', async () => {
      const res = await http.post('/api/auth/register/talent').send({ ...talentBody, email: 'x@example.com', role: 'ADMIN' });
      expect(res.status).toBe(422);
    });
    it('registers a promoter with licence details; licence starts as NOT_SUBMITTED', async () => {
      const res = await http.post('/api/auth/register/promoter').send({ firstName: 'Omar', lastName: 'Said', email: 'omar@agency.test', phone: '+971 50 123 4567', password: 'Str0ngPass!', confirmPassword: 'Str0ngPass!', agencyName: 'Sahara Nights', licenceNumber: 'AE-2026-7781' });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('PROMOTER');
      expect(res.body.user.promoter.licenceStatus).toBe('NOT_SUBMITTED');
    });
    it('logs in, rejects bad credentials, exposes /auth/me', async () => {
      const ok = await login('alex.rivera@talentconnect.dev');
      expect(ok.status).toBe(200);
      expect((await get('/api/auth/me', ok.token)).body.email).toBe('alex.rivera@talentconnect.dev');
      const bad = await login('alex.rivera@talentconnect.dev', 'WrongPass1!');
      expect(bad.status).toBe(401);
      expect((await login('nobody@example.com')).status).toBe(401);
    });
    it('logout invalidates the token server-side', async () => {
      const { token } = await login('priya.sharma@talentconnect.dev');
      expect((await get('/api/auth/me', token)).status).toBe(200);
      expect((await post('/api/auth/logout', token)).status).toBe(200);
      expect((await get('/api/auth/me', token)).status).toBe(401);
    });
  });

  // ───────────────────────── authorization ─────────────────────────
  describe('role-based authorization', () => {
    it('blocks talents and promoters from admin endpoints (403)', async () => {
      expect((await get('/api/admin/stats', alex)).status).toBe(403);
      expect((await get('/api/admin/users', jordan)).status).toBe(403);
      expect((await patch('/api/admin/promoters/x/verify', alex, { approved: true })).status).toBe(403);
    });
    it('blocks cross-role endpoints (403)', async () => {
      expect((await post('/api/events', alex, {})).status).toBe(403);
      expect((await get('/api/talents/me', jordan)).status).toBe(403);
      expect((await get('/api/talents', alex)).status).toBe(403);
      expect((await post('/api/ai/chat', jordan, { message: 'hello there' })).status).toBe(403);
      expect((await get('/api/payments', alex)).status).toBe(403);
    });
    it('rejects a forged token (401)', async () => {
      expect((await get('/api/auth/me', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad')).status).toBe(401);
    });
  });

  // ───────────────────────── talent profile & dashboard ─────────────────────────
  describe('talent profile & dashboard', () => {
    it('returns dashboard data from the database', async () => {
      const res = await get('/api/talents/me/dashboard', alex);
      expect(res.status).toBe(200);
      expect(res.body.rating.average).toBe(4.7);
      expect(res.body.rating.count).toBe(24);
      expect(res.body.contracts.active).toBeGreaterThanOrEqual(1);
      expect(res.body.completion.percent).toBeGreaterThan(50);
    });
    it('updates the profile with validation and sanitisation', async () => {
      const ok = await patch('/api/talents/me', alex, { bio: '<script>alert(1)</script>Editorial & live-event photographer based in NYC with a decade of experience.', skills: ['Retouching', 'Lighting', 'Art direction', 'Retouching'] });
      expect(ok.status).toBe(200);
      expect(ok.body.bio).not.toContain('<script>');
      expect(ok.body.bio).toContain('Editorial & live-event');
      expect(ok.body.skills).toEqual(['Retouching', 'Lighting', 'Art direction']);
      expect((await patch('/api/talents/me', alex, { website: 'not a url' })).status).toBe(422);
    });
  });

  // ───────────────────────── portfolio ─────────────────────────
  describe('portfolio CRUD, uploads and ownership', () => {
    let itemId: string;
    it('uploads an image and lists it', async () => {
      const res = await http.post('/api/portfolios').set(auth(alex)).field('title', 'Test Shot').field('description', 'A test').attach('file', PNG, { filename: 'shot.png', contentType: 'image/png' });
      expect(res.status).toBe(201);
      expect(res.body.mediaType).toBe('IMAGE');
      expect(res.body.mediaUrl).toMatch(/^\/uploads\/portfolio\//);
      itemId = res.body.id;
      const file = await http.get(res.body.mediaUrl);
      expect(file.status).toBe(200);
      const mine = await get('/api/portfolios/mine?type=IMAGE', alex);
      expect(mine.body.items.some((i: any) => i.id === itemId)).toBe(true);
    });
    it('rejects invalid files', async () => {
      const exe = await http.post('/api/portfolios').set(auth(alex)).field('title', 'Bad').attach('file', Buffer.from('MZ fake executable content here'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });
      expect(exe.status).toBe(415);
      const spoof = await http.post('/api/portfolios').set(auth(alex)).field('title', 'Spoof').attach('file', Buffer.from('this is not really a png image file'), { filename: 'fake.png', contentType: 'image/png' });
      expect(spoof.status).toBe(415);
      const big = Buffer.concat([PNG, Buffer.alloc(11 * 1024 * 1024)]);
      const oversize = await http.post('/api/portfolios').set(auth(alex)).field('title', 'Huge').attach('file', big, { filename: 'big.png', contentType: 'image/png' });
      expect(oversize.status).toBe(413);
      const none = await http.post('/api/portfolios').set(auth(alex)).field('title', 'No file');
      expect(none.status).toBe(400);
    });
    it('edits the item and toggles publishing', async () => {
      const res = await http.patch(`/api/portfolios/${itemId}`).set(auth(alex)).field('title', 'Renamed Shot').field('isPublished', 'false');
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Renamed Shot');
      expect(res.body.isPublished).toBe(false);
    });
    it("prevents another talent from editing or deleting someone else's item (403)", async () => {
      expect((await http.patch(`/api/portfolios/${itemId}`).set(auth(liam)).field('title', 'Hacked')).status).toBe(403);
      expect((await http.delete(`/api/portfolios/${itemId}`).set(auth(liam))).status).toBe(403);
    });
    it('hides unpublished items from promoters and deletes the item', async () => {
      const talentId = (await get('/api/talents/me', alex)).body.id;
      const pub = await get(`/api/portfolios/talent/${talentId}`, jordan);
      expect(pub.body.some((i: any) => i.id === itemId)).toBe(false);
      expect((await get(`/api/portfolios/${itemId}`, jordan)).status).toBe(404);
      expect((await http.delete(`/api/portfolios/${itemId}`).set(auth(alex))).status).toBe(200);
      expect((await get(`/api/portfolios/${itemId}`, alex)).status).toBe(404);
    });
  });

  // ───────────────────────── events & enrollment ─────────────────────────
  describe('events and enrollment', () => {
    let eventId: string;
    let draftId: string;
    const body = { title: 'Rooftop Jazz Evening', location: 'Skyline Terrace, Chicago', description: 'An open-air evening of live jazz with three bands and a DJ closing set.', category: 'Music', talentNeeded: 'Musician', eventDate: future(20) };

    it('lets a verified promoter create and publish an event', async () => {
      const draft = await post('/api/events', jordan, body);
      expect(draft.status).toBe(201);
      expect(draft.body.status).toBe('DRAFT');
      draftId = draft.body.id;
      const pub = await post(`/api/events/${draftId}/publish`, jordan);
      expect(pub.status).toBe(201);
      expect(pub.body.status).toBe('PUBLISHED');
      eventId = draftId;
    });
    it('validates event input and the future-date rule', async () => {
      expect((await post('/api/events', jordan, { ...body, title: 'x' })).status).toBe(422);
      expect((await post('/api/events', jordan, { ...body, eventDate: future(-2) })).status).toBe(400);
    });
    it('blocks unverified promoters from publishing (403)', async () => {
      const created = await post('/api/events', elena, body);
      expect(created.status).toBe(201);
      expect((await post(`/api/events/${created.body.id}/publish`, elena)).status).toBe(403);
      expect((await post('/api/events', elena, { ...body, publish: true })).status).toBe(403);
    });
    it('shows only published events to talents', async () => {
      const list = await get('/api/events?pageSize=100', alex);
      expect(list.status).toBe(200);
      expect(list.body.items.every((e: any) => e.status === 'PUBLISHED')).toBe(true);
      expect(list.body.items.some((e: any) => e.id === eventId)).toBe(true);
      const hiddenDraft = await post('/api/events', jordan, body);
      expect((await get(`/api/events/${hiddenDraft.body.id}`, alex)).status).toBe(404);
      const search = await get('/api/events?q=jazz', alex);
      expect(search.body.items.every((e: any) => /jazz/i.test(e.title + e.description))).toBe(true);
    });
    it("prevents a promoter from modifying another promoter's event (403)", async () => {
      expect((await patch(`/api/events/${eventId}`, nadia, { title: 'Stolen event' })).status).toBe(403);
      expect((await http.delete(`/api/events/${eventId}`).set(auth(nadia))).status).toBe(403);
      expect((await post(`/api/events/${eventId}/cancel`, nadia)).status).toBe(403);
      expect((await patch(`/api/events/${eventId}`, jordan, { title: 'Rooftop Jazz Evening – Late Edition' })).status).toBe(200);
    });
    it('enrolls a talent once and rejects duplicates (409)', async () => {
      const first = await post(`/api/events/${eventId}/enroll`, alex, {});
      expect(first.status).toBe(201);
      const dup = await post(`/api/events/${eventId}/enroll`, alex, {});
      expect(dup.status).toBe(409);
      const mine = await get('/api/events/enrolled/mine', alex);
      expect(mine.body.items.some((e: any) => e.id === eventId)).toBe(true);
      const detail = await get(`/api/events/${eventId}`, alex);
      expect(detail.body.enrolled).toBe(true);
      // promoter + talent both notified
      const promoterNotifs = await get('/api/notifications', jordan);
      expect(promoterNotifs.body.items.some((n: any) => /enrolled/i.test(n.message))).toBe(true);
    });
    it('lists enrollments only for the owning promoter', async () => {
      const ok = await get(`/api/events/${eventId}/enrollments`, jordan);
      expect(ok.status).toBe(200);
      expect(ok.body).toHaveLength(1);
      expect((await get(`/api/events/${eventId}/enrollments`, nadia)).status).toBe(403);
    });
    it('cannot unpublish with enrollments; status transitions are validated; draft deletion works', async () => {
      expect((await post(`/api/events/${eventId}/unpublish`, jordan)).status).toBe(409);
      expect((await patch(`/api/events/${eventId}/status`, jordan, { status: 'COMPLETED' })).status).toBe(409);
      const other = await post('/api/events', jordan, body);
      expect((await http.delete(`/api/events/${other.body.id}`).set(auth(jordan))).status).toBe(200);
    });
    it('withdraws from an event and re-enrolls', async () => {
      expect((await http.delete(`/api/events/${eventId}/enroll`).set(auth(alex))).status).toBe(200);
      expect((await http.delete(`/api/events/${eventId}/enroll`).set(auth(alex))).status).toBe(404);
      expect((await post(`/api/events/${eventId}/enroll`, alex, {})).status).toBe(201);
    });
    it('cancelling an event notifies enrolled talents and closes contracts', async () => {
      const cancelled = await post(`/api/events/${eventId}/cancel`, jordan);
      expect(cancelled.body.status).toBe('CANCELLED');
      const notifs = await get('/api/notifications?pageSize=5', alex);
      expect(notifs.body.items.some((n: any) => /cancelled/i.test(n.title))).toBe(true);
      expect((await post(`/api/events/${eventId}/enroll`, liam, {})).status).toBe(404);
    });
  });

  // ───────────────────────── talent search ─────────────────────────
  describe('talent discovery', () => {
    it('searches and filters talents', async () => {
      const res = await get('/api/talents?q=photographer', jordan);
      expect(res.status).toBe(200);
      expect(res.body.items[0].specialization).toBe('Photographer');
      expect(res.body.items[0].email).toBeUndefined();
      const rated = await get('/api/talents?minRating=4.7', jordan);
      expect(rated.body.items.every((t: any) => t.ratingAvg >= 4.7)).toBe(true);
      const profile = await get(`/api/talents/${res.body.items[0].id}`, jordan);
      expect(profile.body.portfolio.length).toBeGreaterThan(0);
      expect(profile.body.rating.count).toBeGreaterThan(0);
    });
  });

  // ───────────────────────── contracts ─────────────────────────
  describe('contracts', () => {
    let contractId: string;
    let talentId: string;
    let eventId: string;
    it('prepares an event', async () => {
      talentId = (await get('/api/talents/me', alex)).body.id;
      const ev = await post('/api/events', jordan, { title: 'Contract Test Gala', location: 'Hall A, Boston', description: 'A test gala for contract workflow verification purposes.', eventDate: future(40), publish: true });
      expect(ev.status).toBe(201);
      eventId = ev.body.id;
    });
    it('promoter creates a contract; talent is notified', async () => {
      const res = await post('/api/contracts', jordan, { talentId, eventId, terms: 'Photography coverage for six hours with 100 retouched images delivered in 72 hours.', amount: 1500, currency: 'USD' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
      contractId = res.body.id;
      const n = await get('/api/notifications?pageSize=3', alex);
      expect(n.body.items.some((x: any) => /contract/i.test(x.title))).toBe(true);
      expect((await post('/api/contracts', jordan, { talentId, eventId, terms: 'Duplicate contract attempt for the same event.' })).status).toBe(409);
    });
    it('enforces who may create contracts', async () => {
      expect((await post('/api/contracts', alex, { talentId, eventId, terms: 'x'.repeat(30) })).status).toBe(403);
      expect((await post('/api/contracts', nadia, { talentId, eventId, terms: 'Trying to contract on another promoter’s event.' })).status).toBe(403);
      expect((await post('/api/contracts', elena, { talentId, eventId, terms: 'Unverified promoter trying to create a contract.' })).status).toBe(403);
    });
    it('enforces contract visibility (ownership)', async () => {
      expect((await get(`/api/contracts/${contractId}`, alex)).status).toBe(200);
      expect((await get(`/api/contracts/${contractId}`, jordan)).status).toBe(200);
      expect((await get(`/api/contracts/${contractId}`, liam)).status).toBe(403);
      expect((await get(`/api/contracts/${contractId}`, nadia)).status).toBe(403);
      expect((await get(`/api/contracts/${contractId}`, admin)).status).toBe(200);
      const aList = await get('/api/contracts?pageSize=100', alex);
      expect(aList.body.items.every((c: any) => c.talent.id === talentId)).toBe(true);
      const lList = await get('/api/contracts?pageSize=100', liam);
      expect(lList.body.items.some((c: any) => c.id === contractId)).toBe(false);
    });
    it('talent cannot edit promoter-owned fields', async () => {
      expect((await patch(`/api/contracts/${contractId}`, alex, { terms: 'Altered terms by the talent, which must not work.' })).status).toBe(403);
      expect((await patch(`/api/contracts/${contractId}/status`, alex, { status: 'COMPLETED' })).status).toBe(403);
    });
    it('talent accepts; later material edits return the contract to PENDING', async () => {
      expect((await post(`/api/contracts/${contractId}/respond`, liam, { decision: 'ACCEPT' })).status).toBe(403);
      const accepted = await post(`/api/contracts/${contractId}/respond`, alex, { decision: 'ACCEPT', note: 'Confirmed.' });
      expect(accepted.body.status).toBe('ACTIVE');
      expect((await post(`/api/contracts/${contractId}/respond`, alex, { decision: 'ACCEPT' })).status).toBe(409);
      const edited = await patch(`/api/contracts/${contractId}`, jordan, { amount: 1800 });
      expect(edited.body.status).toBe('PENDING');
      await post(`/api/contracts/${contractId}/respond`, alex, { decision: 'ACCEPT' });
    });
    it('uploads a contract document (PDF only)', async () => {
      const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
      const ok = await http.post(`/api/contracts/${contractId}/document`).set(auth(jordan)).attach('file', pdf, { filename: 'agreement.pdf', contentType: 'application/pdf' });
      expect(ok.status).toBe(201);
      expect(ok.body.documentUrl).toMatch(/^\/uploads\/contracts\//);
      const bad = await http.post(`/api/contracts/${contractId}/document`).set(auth(jordan)).attach('file', PNG, { filename: 'image.png', contentType: 'image/png' });
      expect(bad.status).toBe(415);
      expect((await http.post(`/api/contracts/${contractId}/document`).set(auth(nadia)).attach('file', pdf, { filename: 'a.pdf', contentType: 'application/pdf' })).status).toBe(403);
    });
    it('promoter completes the contract and rates the talent once', async () => {
      expect((await post('/api/ratings', jordan, { contractId, score: 4 })).status).toBe(400); // not completed yet
      const done = await patch(`/api/contracts/${contractId}/status`, jordan, { status: 'COMPLETED' });
      expect(done.body.status).toBe('COMPLETED');
      expect((await post('/api/ratings', nadia, { contractId, score: 5 })).status).toBe(403);
      expect((await post('/api/ratings', jordan, { contractId, score: 9 })).status).toBe(422);
      const rated = await post('/api/ratings', jordan, { contractId, score: 5, comment: 'Excellent work and communication.' });
      expect(rated.status).toBe(201);
      expect((await post('/api/ratings', jordan, { contractId, score: 5 })).status).toBe(409);
      const mine = await get('/api/ratings/me', alex);
      expect(mine.body.summary.count).toBe(25);
      expect(mine.body.summary.distribution['5']).toBeGreaterThan(18);
      expect((await get('/api/ratings/me', jordan)).status).toBe(403);
    });
  });

  // ───────────────────────── licence, payment & verification ─────────────────────────
  describe('licence, payments and admin verification', () => {
    let promoterToken: string;
    let promoterId: string;
    let paymentId: string;
    const licence = { licenceNumber: 'AE-2026-7781', licenceAuthority: 'Dubai Tourism Authority', licenceExpiry: future(300), licenceInfo: 'Annual event promotion licence' };

    it('new promoter saves licence info but stays NOT_SUBMITTED until the fee is paid', async () => {
      promoterToken = (await login('omar@agency.test', 'Str0ngPass!')).token;
      const res = await http.post('/api/promoters/me/licence').set(auth(promoterToken)).field('licenceNumber', licence.licenceNumber).field('licenceAuthority', licence.licenceAuthority).field('licenceExpiry', licence.licenceExpiry).field('licenceInfo', licence.licenceInfo);
      expect(res.status).toBe(201);
      expect(res.body.licenceStatus).toBe('NOT_SUBMITTED');
      promoterId = res.body.id;
    });
    it('exposes sandbox config and creates a checkout', async () => {
      const cfg = await get('/api/payments/config', promoterToken);
      expect(cfg.body.sandbox).toBe(true);
      expect(cfg.body.testCards.length).toBeGreaterThan(1);
      const co = await post('/api/payments/checkout', promoterToken, {});
      expect(co.status).toBe(201);
      expect(co.body.payment.status).toBe('PENDING');
      paymentId = co.body.payment.id;
    });
    it('rejects invalid cards (422) and records declines as FAILED', async () => {
      const invalid = await post(`/api/payments/${paymentId}/pay`, promoterToken, { cardholderName: 'Omar Said', cardNumber: '1234 5678 9012 3456', expMonth: 12, expYear: new Date().getFullYear() + 2, cvc: '123' });
      expect(invalid.status).toBe(422);
      const expired = await post(`/api/payments/${paymentId}/pay`, promoterToken, { cardholderName: 'Omar Said', cardNumber: '4242424242424242', expMonth: 1, expYear: new Date().getFullYear() - 1, cvc: '123' });
      expect(expired.status).toBe(422);
      const declined = await post(`/api/payments/${paymentId}/pay`, promoterToken, { cardholderName: 'Omar Said', cardNumber: '4000 0000 0000 0002', expMonth: 12, expYear: new Date().getFullYear() + 2, cvc: '123' });
      expect(declined.status).toBe(201);
      expect(declined.body.payment.status).toBe('FAILED');
      expect(declined.body.payment.failureReason).toMatch(/declined/i);
      expect(JSON.stringify(declined.body)).not.toContain('4000000000000002');
    });
    it("another promoter cannot pay someone else's payment (403)", async () => {
      const res = await post(`/api/payments/${paymentId}/pay`, jordan, { cardholderName: 'Jordan Blake', cardNumber: '4242424242424242', expMonth: 12, expYear: new Date().getFullYear() + 2, cvc: '123' });
      expect(res.status).toBe(403);
    });
    it('successful payment completes the licence submission (PENDING) and notifies', async () => {
      const ok = await post(`/api/payments/${paymentId}/pay`, promoterToken, { cardholderName: 'Omar Said', cardNumber: '4242 4242 4242 4242', expMonth: 12, expYear: new Date().getFullYear() + 2, cvc: '123' });
      expect(ok.body.payment.status).toBe('SUCCESS');
      expect(ok.body.payment.cardLast4).toBe('4242');
      expect(ok.body.licence.licenceStatus).toBe('PENDING');
      expect((await post(`/api/payments/${paymentId}/pay`, promoterToken, { cardholderName: 'Omar Said', cardNumber: '4242424242424242', expMonth: 12, expYear: new Date().getFullYear() + 2, cvc: '123' })).status).toBe(409);
      expect((await post('/api/payments/checkout', promoterToken, {})).status).toBe(409);
      const history = await get('/api/payments', promoterToken);
      expect(history.body.items[0].status).toBe('SUCCESS');
      const notes = await get('/api/notifications', promoterToken);
      expect(notes.body.items.some((n: any) => n.type === 'PAYMENT')).toBe(true);
    });
    it('admin sees the pending application, must give a reason to reject, and can approve', async () => {
      const pending = await get('/api/admin/promoters?status=PENDING', admin);
      expect(pending.body.items.some((p: any) => p.id === promoterId)).toBe(true);
      const detail = await get(`/api/admin/promoters/${promoterId}`, admin);
      expect(detail.body.history.length).toBeGreaterThan(0);
      expect((await patch(`/api/admin/promoters/${promoterId}/verify`, admin, { approved: false })).status).toBe(400);
      const approved = await patch(`/api/admin/promoters/${promoterId}/verify`, admin, { approved: true });
      expect(approved.body.licenceStatus).toBe('VERIFIED');
      expect((await patch(`/api/admin/promoters/${promoterId}/verify`, admin, { approved: true })).status).toBe(409);
      const notes = await get('/api/notifications', promoterToken);
      expect(notes.body.items.some((n: any) => n.type === 'LICENCE' && /verified/i.test(n.title))).toBe(true);
      // now verified -> can publish
      const ev = await post('/api/events', promoterToken, { title: 'Sahara Nights Opening', location: 'Dubai Marina', description: 'Opening night of a new desert-themed club series in Dubai.', eventDate: future(30), publish: true });
      expect(ev.status).toBe(201);
    });
    it('cannot approve a promoter who has not paid, and Grace (unpaid) cannot submit for review', async () => {
      const g = await get('/api/promoters/me', grace);
      expect(g.body.licenceFeePaid).toBe(false);
      expect(g.body.licenceStatus).toBe('NOT_SUBMITTED');
      expect((await patch(`/api/admin/promoters/${g.body.id}/verify`, admin, { approved: true })).status).toBe(409);
    });
    it('admin rejects with reason; promoter receives it', async () => {
      const victor = await login('victor.alves@talentconnect.dev');
      const v = await get('/api/promoters/me', victor.token);
      const res = await patch(`/api/admin/promoters/${v.body.id}/verify`, admin, { approved: false, reason: 'Licence document is expired.' });
      expect(res.body.licenceStatus).toBe('REJECTED');
      const after = await get('/api/promoters/me', victor.token);
      expect(after.body.licenceRejectionReason).toMatch(/expired/);
      const resubmit = await http.post('/api/promoters/me/licence').set(auth(victor.token)).field('licenceNumber', 'PT-ENT-556121').field('licenceAuthority', 'Turismo de Portugal').field('licenceExpiry', future(200));
      expect(resubmit.body.licenceStatus).toBe('PENDING');
    });
  });

  // ───────────────────────── messaging & notifications ─────────────────────────
  describe('messaging and notifications', () => {
    it('talent and promoter exchange messages with unread tracking', async () => {
      const before = (await get('/api/messages/unread-count', liam)).body.count;
      const sent = await post('/api/messages', jordan, { recipientId: liamUser.id, content: 'Hi Liam – can you extend the set by 15 minutes?' });
      expect(sent.status).toBe(201);
      expect((await get('/api/messages/unread-count', liam)).body.count).toBe(before + 1);
      const convs = await get('/api/messages/conversations', liam);
      const c = convs.body.find((x: any) => x.user.id === jordanUser.id);
      expect(c.unread).toBeGreaterThan(0);
      const thread = await get(`/api/messages/conversations/${jordanUser.id}`, liam);
      expect(thread.body.at(-1).content).toMatch(/extend the set/);
      await http.patch(`/api/messages/conversations/${jordanUser.id}/read`).set(auth(liam));
      expect((await get('/api/messages/unread-count', liam)).body.count).toBe(0);
      const notes = await get('/api/notifications?pageSize=3', liam);
      expect(notes.body.items.some((n: any) => n.type === 'MESSAGE')).toBe(true);
    });
    it('blocks invalid messaging', async () => {
      const liamTalent = liamUser.id;
      expect((await post('/api/messages', alex, { recipientId: liamTalent, content: 'talent to talent' })).status).toBe(403);
      expect((await post('/api/messages', alex, { recipientId: alexUser.id, content: 'to myself' })).status).toBe(400);
      expect((await post('/api/messages', alex, { recipientId: jordanUser.id, content: '   ' })).status).toBe(422);
      expect((await get('/api/messages/conversations', admin)).status).toBe(403);
    });
    it('marks notifications read individually and all at once', async () => {
      const list = await get('/api/notifications?unread=true', alex);
      expect(list.body.items.length).toBeGreaterThan(0);
      const one = await http.patch(`/api/notifications/${list.body.items[0].id}/read`).set(auth(alex));
      expect(one.body.isRead).toBe(true);
      expect((await http.patch(`/api/notifications/${list.body.items[0].id}/read`).set(auth(liam))).status).toBe(404);
      await http.patch('/api/notifications/read-all').set(auth(alex));
      expect((await get('/api/notifications/unread-count', alex)).body.count).toBe(0);
    });
  });

  // ───────────────────────── AI ─────────────────────────
  describe('AI assistant', () => {
    it('reports status and answers through the provider abstraction', async () => {
      const status = await get('/api/ai/status', alex);
      expect(status.body.mode).toBe('offline');
      const res = await post('/api/ai/chat', alex, { message: 'Please improve my bio', task: 'IMPROVE_BIO' });
      expect(res.status).toBe(200);
      expect(res.body.reply).toContain('Alex Rivera');
      const faq = await post('/api/ai/chat', alex, { message: 'How do contracts work?' });
      expect(faq.body.reply).toMatch(/accept/i);
      const history = await get('/api/ai/history', alex);
      expect(history.body.length).toBeGreaterThanOrEqual(4);
      expect((await post('/api/ai/chat', alex, { message: 'x' })).status).toBe(422);
      expect((await http.delete('/api/ai/history').set(auth(alex))).status).toBe(200);
    });
    it('never exposes API keys', async () => {
      const res = await get('/api/ai/status', alex);
      expect(JSON.stringify(res.body)).not.toMatch(/key|secret/i);
    });
  });

  // ───────────────────────── admin ─────────────────────────
  describe('admin operations', () => {
    it('returns overview statistics and monitoring data', async () => {
      const stats = await get('/api/admin/stats', admin);
      expect(stats.body.users.total).toBeGreaterThan(10);
      expect(stats.body.pendingVerification).toBeGreaterThanOrEqual(1);
      const mon = await get('/api/admin/monitoring', admin);
      expect(mon.body.series).toHaveLength(14);
      expect(mon.body.system.status).toBe('operational');
    });
    it('suspends a user: login and existing tokens stop working; reactivation restores access', async () => {
      const users = await get('/api/admin/users?q=daniel', admin);
      const daniel = users.body.items[0];
      const token = (await login('daniel.otieno@talentconnect.dev')).token;
      const sus = await patch(`/api/admin/users/${daniel.id}/status`, admin, { status: 'SUSPENDED', reason: 'Policy violation' });
      expect(sus.body.status).toBe('SUSPENDED');
      expect((await get('/api/auth/me', token)).status).toBe(401);
      const denied = await login('daniel.otieno@talentconnect.dev');
      expect(denied.status).toBe(403);
      await patch(`/api/admin/users/${daniel.id}/status`, admin, { status: 'ACTIVE' });
      expect((await login('daniel.otieno@talentconnect.dev')).status).toBe(200);
    });
    it('protects admin accounts from status changes', async () => {
      const me = await get('/api/auth/me', admin);
      expect((await patch(`/api/admin/users/${me.body.id}/status`, admin, { status: 'SUSPENDED' })).status).toBe(403);
    });
    it('flags, removes and restores portfolio content, notifying the talent', async () => {
      const list = await get('/api/admin/portfolios?q=Emerald', admin);
      const item = list.body.items[0];
      expect((await patch(`/api/admin/portfolios/${item.id}/moderate`, admin, { action: 'FLAG' })).status).toBe(400);
      const flagged = await patch(`/api/admin/portfolios/${item.id}/moderate`, admin, { action: 'FLAG', note: 'Needs licence proof for the model.' });
      expect(flagged.body.moderationStatus).toBe('FLAGGED');
      const talentId = (await get('/api/talents/me', alex)).body.id;
      const publicItems = await get(`/api/portfolios/talent/${talentId}`, jordan);
      expect(publicItems.body.some((i: any) => i.id === item.id)).toBe(false);
      const mine = await get('/api/portfolios/mine', alex);
      expect(mine.body.items.find((i: any) => i.id === item.id).moderationStatus).toBe('FLAGGED');
      await patch(`/api/admin/portfolios/${item.id}/moderate`, admin, { action: 'REMOVE', note: 'Removed after review.' });
      expect((await http.patch(`/api/portfolios/${item.id}`).set(auth(alex)).field('isPublished', 'true')).status).toBe(403);
      const restored = await patch(`/api/admin/portfolios/${item.id}/moderate`, admin, { action: 'RESTORE' });
      expect(restored.body.moderationStatus).toBe('ACTIVE');
    });
    it('refunds a successful payment', async () => {
      const pays = await get('/api/admin/payments?status=SUCCESS', admin);
      const target = pays.body.items.find((p: any) => p.promoter.agencyName === 'Sahara Nights');
      const res = await http.post(`/api/admin/payments/${target.id}/refund`).set(auth(admin));
      expect(res.body.status).toBe('REFUNDED');
      expect((await http.post(`/api/admin/payments/${target.id}/refund`).set(auth(admin))).status).toBe(409);
    });
    it('generates JSON and CSV reports', async () => {
      const json = await get('/api/admin/reports/users', admin);
      expect(json.body.rows.length).toBeGreaterThan(10);
      const csv = await get('/api/admin/reports/payments?format=csv', admin);
      expect(csv.headers['content-type']).toMatch(/text\/csv/);
      expect(csv.text.split('\n')[0]).toContain('promoter,purpose,amount');
      expect((await get('/api/admin/reports/nope', admin)).status).toBe(404);
      expect((await get('/api/admin/reports/users', alex)).status).toBe(403);
    });
  });

  // ───────────────────────── error format ─────────────────────────
  describe('error handling', () => {
    it('returns a consistent JSON envelope without stack traces', async () => {
      const res = await get('/api/events/does-not-exist', alex);
      expect(res.status).toBe(404);
      expect(res.body).toEqual(expect.objectContaining({ statusCode: 404, message: expect.any(String), path: expect.any(String), timestamp: expect.any(String) }));
      expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts|node_modules/);
      const malformed = await http.post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json');
      expect(malformed.status).toBe(400);
    });
  });
});
