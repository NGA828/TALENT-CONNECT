/* Talent Connect – development seed.
 * Run with: npm run prisma:seed   (idempotent – wipes and recreates demo data)
 */
import 'dotenv/config';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { ContractStatus, EventStatus, LicenceStatus, MediaType, ModerationStatus, NotificationType, PaymentMethod, PaymentStatus, PrismaClient, ReviewAction, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient({ adapter: new PrismaLibSQL({ url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db' }) });

export const DEMO_PASSWORD = 'Password123!';
export const ADMIN_EMAIL = 'admin@talentconnect.dev';
export const ADMIN_PASSWORD = 'Admin@12345';

/** Promoter licences in Cameroon are issued by the Ministry of Arts and Culture; these are demo values. */
const LICENCE_AUTHORITY = 'Ministère des Arts et de la Culture (MINAC) — demo data, not an official licence';
/** Transaction IDs as they appear in the MTN MoMo / Orange Money SMS receipts (demo values). */
const mtnRef = (n: number) => `MP2509.${String(1000 + n).slice(-4)}.A0${1000 + n}`;
const orangeRef = (n: number) => `PP2509.${String(4000 + n).slice(-4)}.C2${4000 + n}`;

const HOUR = 36e5;
const DAY = 864e5;
const at = (days: number, hour = 12) => {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(hour - 1, 0, 0, 0);
  return d;
};
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * HOUR);

async function copyAssets() {
  const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
  const target = path.join(uploadRoot, 'seed');
  await fs.mkdir(target, { recursive: true });
  const src = path.resolve('seed-assets');
  const files = await fs.readdir(src);
  const meta: Record<string, { url: string; size: number }> = {};
  for (const f of files) {
    await fs.copyFile(path.join(src, f), path.join(target, f));
    meta[f] = { url: `/uploads/seed/${f}`, size: (await fs.stat(path.join(src, f))).size };
  }
  return meta;
}

async function wipe() {
  await prisma.aiMessage.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.talentEvent.deleteMany();
  await prisma.eventImage.deleteMany();
  await prisma.event.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.licenceReview.deleteMany();
  await prisma.talent.deleteMany();
  await prisma.promoter.deleteMany();
  await prisma.user.deleteMany();
}

const MIME: Record<string, string> = { jpg: 'image/jpeg', pdf: 'application/pdf', wav: 'audio/wav' };

async function main() {
  console.log('Seeding Talent Connect…');
  await wipe();
  const assets = await copyAssets();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // ───────────────────────── Admin ─────────────────────────
  const admin = await prisma.user.create({
    data: { email: ADMIN_EMAIL, passwordHash: adminHash, firstName: 'Helena', lastName: 'Okafor', phone: '+237 6 70 00 00 01', role: Role.ADMIN, createdAt: ago(120), lastLoginAt: ago(0, 2) },
  });

  // ───────────────────────── Talents ─────────────────────────
  const talentDefs = [
    { key: 'alex', email: 'alex.rivera@talentconnect.dev', first: 'Alex', last: 'Rivera', phone: '+237 6 70 00 00 02', gender: 'NON_BINARY', spec: 'Photographer', loc: 'Douala, Cameroon', exp: 9, skills: ['Editorial photography', 'Live event coverage', 'Retouching', 'Studio lighting', 'Art direction'], bio: 'Editorial and live-event photographer based in Douala with nine years of experience shooting fashion campaigns, music festivals and corporate galas. I work fast, light discreetly and deliver retouched selects within 48 hours.', joined: 140, login: 0 },
    { key: 'liam', email: 'liam.carter@talentconnect.dev', first: 'Liam', last: 'Carter', phone: '+237 6 70 00 00 03', gender: 'MALE', spec: 'DJ', loc: 'Buea, Cameroon', exp: 7, skills: ['House', 'Afrobeats', 'Open format', 'Live remixing'], bio: 'Resident DJ turned festival headliner. I read the room, blend house and afrobeats and keep dance floors full from first track to last call. Own PA and lighting available on request.', joined: 75, login: 1 },
    { key: 'sofia', email: 'sofia.martinez@talentconnect.dev', first: 'Sofia', last: 'Martinez', phone: '+237 6 70 00 00 04', gender: 'FEMALE', spec: 'Dancer', loc: 'Bamenda, Cameroon', exp: 11, skills: ['Contemporary', 'Choreography', 'Stage performance', 'Workshops'], bio: 'Contemporary dancer and choreographer trained at the a local performing arts school. I create site-specific performances for brand launches, theatres and festivals and lead workshops for corporate teams.', joined: 62, login: 3 },
    { key: 'kwame', email: 'kwame.mensah@talentconnect.dev', first: 'Kwame', last: 'Mensah', phone: '+237 6 70 00 00 05', gender: 'MALE', spec: 'Musician', loc: 'Kribi, Cameroon', exp: 13, skills: ['Guitar', 'Highlife', 'Band leading', 'Session work', 'Songwriting'], bio: 'Guitarist and bandleader blending highlife, jazz and modern pop. My five-piece band has played festivals across Cameroon and is available for concerts, weddings and corporate receptions.', joined: 48, login: 2 },
    { key: 'yuki', email: 'yuki.tanaka@talentconnect.dev', first: 'Yuki', last: 'Tanaka', phone: '+237 6 70 00 00 06', gender: 'FEMALE', spec: 'Videographer', loc: 'Limbe, Cameroon', exp: 8, skills: ['Cinematography', 'Drone footage', 'Colour grading', 'Aftermovies'], bio: 'Cinematographer specialising in festival aftermovies, brand films and live concert capture. Full 6K kit, drone licence and a colour-grading suite ready for fast turnarounds.', joined: 40, login: 4 },
    { key: 'chloe', email: 'chloe.dubois@talentconnect.dev', first: 'Chloe', last: 'Dubois', phone: '+237 6 70 00 00 07', gender: 'FEMALE', spec: 'Makeup Artist', loc: 'Yaoundé, Cameroon', exp: 6, skills: ['Editorial makeup', 'Bridal', 'Special effects', 'Runway'], bio: 'Yaoundé-based makeup artist working backstage at fashion weeks and on editorial sets. I build looks that photograph beautifully and last through long shoot days.', joined: 28, login: 6 },
    { key: 'daniel', email: 'daniel.otieno@talentconnect.dev', first: 'Daniel', last: 'Otieno', phone: '+237 6 70 00 00 08', gender: 'MALE', spec: 'MC / Host', loc: 'Garoua, Cameroon', exp: 10, skills: ['Live hosting', 'Bilingual English/French', 'Panel moderation', 'Crowd work'], bio: 'Bilingual master of ceremonies with a decade of hosting galas, conferences and concerts. Warm, well-prepared and always on schedule.', joined: 20, login: 3 },
    { key: 'priya', email: 'priya.sharma@talentconnect.dev', first: 'Priya', last: 'Sharma', phone: '+237 6 70 00 00 09', gender: 'FEMALE', spec: 'Lighting Designer', loc: 'Bafoussam, Cameroon', exp: 12, skills: ['grandMA programming', 'Concert lighting', 'LED design', 'Stage design'], bio: 'Lighting designer for concerts, fashion shows and corporate stages. I design, program and operate the show so the artist always looks their best.', joined: 12, login: 5 },
  ];

  const talents: Record<string, { userId: string; talentId: string }> = {};
  for (const t of talentDefs) {
    const u = await prisma.user.create({
      data: {
        email: t.email, passwordHash: hash, firstName: t.first, lastName: t.last, phone: t.phone, role: Role.TALENT, createdAt: ago(t.joined), lastLoginAt: ago(t.login),
        talent: { create: { gender: t.gender, specialization: t.spec, bio: t.bio, location: t.loc, skills: t.skills.join(','), experienceYears: t.exp, website: t.key === 'alex' ? 'https://alexrivera.photo' : null, createdAt: ago(t.joined) } },
      },
      include: { talent: true },
    });
    talents[t.key] = { userId: u.id, talentId: u.talent!.id };
  }

  // ───────────────────────── Licence-fee settings (managed by administrators) ─────────────────────────
  // The fee, the Mobile Money wallets that collect it and the wording promoters see are all
  // editable in Admin → Licence fees. The demo wallets must be replaced before any real use.
  await prisma.setting.createMany({ data: [
    { key: 'licenceFee.amount', value: '30000' },
    { key: 'licenceFee.currency', value: 'XAF' },
    { key: 'licenceFee.payeeName', value: 'Talent Connect Cameroun SARL' },
    { key: 'licenceFee.mtnNumber', value: '+237677123456' },
    { key: 'licenceFee.orangeNumber', value: '+237699123456' },
    { key: 'licenceFee.mtnEnabled', value: 'true' },
    { key: 'licenceFee.orangeEnabled', value: 'true' },
    { key: 'licenceFee.instructions', value: 'Dial *126# (MTN MoMo) or #150# (Orange Money), choose Transfer, send the exact fee to the platform wallet below and keep the SMS receipt: the transaction ID is what confirms your payment.' },
  ] });

  // ───────────────────────── Promoters ─────────────────────────
  const promoterDefs = [
    { key: 'jordan', email: 'jordan.blake@talentconnect.dev', first: 'Jordan', last: 'Blake', phone: '+237 6 70 00 00 10', agency: 'Halcyon Live Entertainment', desc: 'Full-service live entertainment agency producing rooftop series, charity galas and brand activations across Cameroon.', web: 'https://halcyonlive.example.com', loc: 'Douala, Cameroon', lic: 'LIC-MINAC-DEMO-2021-044871', auth: LICENCE_AUTHORITY, status: LicenceStatus.VERIFIED, paid: true, joined: 130 },
    { key: 'nadia', email: 'nadia.haddad@talentconnect.dev', first: 'Nadia', last: 'Haddad', phone: '+237 6 70 00 00 11', agency: 'Meridian Events Group', desc: 'Boutique events group for fashion houses and luxury brands in Yaoundé, Douala and Bamenda.', web: 'https://meridianevents.example.com', loc: 'Yaoundé, Cameroon', lic: 'LIC-MINAC-DEMO-2022-077301', auth: LICENCE_AUTHORITY, status: LicenceStatus.VERIFIED, paid: true, joined: 110 },
    { key: 'marcus', email: 'marcus.webb@talentconnect.dev', first: 'Marcus', last: 'Webb', phone: '+237 6 70 00 00 12', agency: 'Afterglow Festivals', desc: 'Organisers of the Afterglow Festival series celebrating Cameroonian music, street culture and film.', web: 'https://afterglowfest.example.com', loc: 'Kribi, Cameroon', lic: 'LIC-MINAC-DEMO-2019-000912', auth: LICENCE_AUTHORITY, status: LicenceStatus.VERIFIED, paid: true, joined: 95 },
    { key: 'elena', email: 'elena.petrova@talentconnect.dev', first: 'Elena', last: 'Petrova', phone: '+237 6 70 00 00 13', agency: 'Northlight Productions', desc: 'Bertoua production company for concerts, club nights and live broadcast events.', web: 'https://northlight.example.com', loc: 'Bertoua, Cameroon', lic: 'LIC-MINAC-DEMO-2024-118822', auth: LICENCE_AUTHORITY, status: LicenceStatus.PENDING, paid: true, joined: 11 },
    { key: 'victor', email: 'victor.alves@talentconnect.dev', first: 'Victor', last: 'Alves', phone: '+237 6 70 00 00 14', agency: 'Orbit Entertainment', desc: 'Limbe-based agency programming beach clubs, weddings and private celebrations.', web: 'https://orbitent.example.com', loc: 'Limbe, Cameroon', lic: 'LIC-MINAC-DEMO-2023-055612', auth: LICENCE_AUTHORITY, status: LicenceStatus.PENDING, paid: true, joined: 9 },
    { key: 'tom', email: 'tom.fischer@talentconnect.dev', first: 'Tom', last: 'Fischer', phone: '+237 6 70 00 00 15', agency: 'Brightside Promotions', desc: 'Douala promotions company focused on nightlife and pop-up events.', web: null, loc: 'Douala, Cameroon', lic: 'LIC-MINAC-DEMO-2024-000099', auth: LICENCE_AUTHORITY, status: LicenceStatus.REJECTED, paid: true, joined: 25 },
    { key: 'grace', email: 'grace.lin@talentconnect.dev', first: 'Grace', last: 'Lin', phone: '+237 6 70 00 00 16', agency: 'Lantern Collective', desc: null, web: null, loc: 'Maroua, Cameroon', lic: 'LIC-MINAC-DEMO-2026-003321', auth: null, status: LicenceStatus.NOT_SUBMITTED, paid: false, joined: 2 },
  ];
  const promoters: Record<string, { userId: string; promoterId: string }> = {};
  for (const p of promoterDefs) {
    const u = await prisma.user.create({
      data: {
        email: p.email, passwordHash: hash, firstName: p.first, lastName: p.last, phone: p.phone, role: Role.PROMOTER, createdAt: ago(p.joined), lastLoginAt: ago(p.key === 'jordan' ? 0 : 2),
        promoter: {
          create: {
            agencyName: p.agency, agencyDescription: p.desc, website: p.web, location: p.loc, licenceNumber: p.lic, licenceAuthority: p.auth,
            licenceExpiry: p.auth ? at(400) : null, licenceInfo: p.auth ? 'Annual licence to promote shows and events (licence d’entrepreneur de spectacle).' : null,
            licenceStatus: p.status, licenceFeePaid: p.paid,
            licenceSubmittedAt: p.status === LicenceStatus.NOT_SUBMITTED ? null : ago(p.joined - 1),
            licenceReviewedAt: p.status === LicenceStatus.VERIFIED || p.status === LicenceStatus.REJECTED ? ago(p.joined - 3) : null,
            licenceRejectionReason: p.status === LicenceStatus.REJECTED ? 'The licence document is illegible and the listed authority could not be confirmed. Please upload a clear copy.' : null,
            createdAt: ago(p.joined),
          },
        },
      },
      include: { promoter: true },
    });
    promoters[p.key] = { userId: u.id, promoterId: u.promoter!.id };
    // licence review history & payments
    if (p.status !== LicenceStatus.NOT_SUBMITTED) {
      await prisma.licenceReview.create({ data: { promoterId: u.promoter!.id, action: ReviewAction.SUBMITTED, createdAt: ago(p.joined - 1) } });
      if (p.status === LicenceStatus.VERIFIED) await prisma.licenceReview.create({ data: { promoterId: u.promoter!.id, adminId: admin.id, action: ReviewAction.APPROVED, reason: 'Licence confirmed with the issuing authority.', createdAt: ago(p.joined - 3) } });
      if (p.status === LicenceStatus.REJECTED) await prisma.licenceReview.create({ data: { promoterId: u.promoter!.id, adminId: admin.id, action: ReviewAction.REJECTED, reason: u.promoter!.licenceRejectionReason, createdAt: ago(p.joined - 3) } });
    }
    // Licence fee (30,000 FCFA) paid with MTN Mobile Money (*126#) or Orange Money (#150#) and
    // confirmed by the administrator who holds the merchant wallet.
    const wallet = p.key === 'marcus' || p.key === 'victor'
      ? { method: PaymentMethod.ORANGE_MONEY, label: 'Orange Money', ref: orangeRef(p.joined) }
      : { method: PaymentMethod.MTN_MOMO, label: 'MTN MoMo', ref: mtnRef(p.joined) };
    const payerPhone = wallet.method === PaymentMethod.ORANGE_MONEY ? `+2376990000${String(p.joined).padStart(2, '0')}` : p.phone.replace(/\s/g, '');
    if (p.paid) {
      if (p.key === 'nadia' || p.key === 'tom') {
        await prisma.payment.create({ data: {
          promoterId: u.promoter!.id, amount: 30000, currency: 'XAF', status: PaymentStatus.FAILED,
          method: wallet.method, provider: 'manual', providerRef: `TC-LIC-${p.key.slice(0, 3).toUpperCase()}0001`,
          transactionRef: `${wallet.ref.slice(0, -1)}9`, payerName: `${p.first} ${p.last}`, payerPhone,
          failureReason: `No ${wallet.label} transfer with this transaction ID was received on the platform wallet.`,
          reviewNote: 'Transaction ID not found on the merchant account: asked the promoter to check the SMS receipt.',
          reviewedById: admin.id, description: `Licence fee – ${p.agency}`,
          submittedAt: ago(p.joined - 1, 2), createdAt: ago(p.joined - 1, 2),
        } });
      }
      await prisma.payment.create({ data: {
        promoterId: u.promoter!.id, amount: 30000, currency: 'XAF', status: PaymentStatus.SUCCESS,
        method: wallet.method, provider: 'manual', providerRef: `TC-LIC-${p.key.slice(0, 3).toUpperCase()}7F3A`,
        transactionRef: wallet.ref, payerName: `${p.first} ${p.last}`, payerPhone,
        description: `Licence fee – ${p.agency}`, submittedAt: ago(p.joined - 1), confirmedAt: ago(p.joined - 2),
        reviewedById: admin.id, reviewNote: `${wallet.label} transfer received on the platform merchant wallet.`,
        createdAt: ago(p.joined - 1),
      } });
    }
    if (p.key === 'grace') {
      // Declared but not yet confirmed: this is the queue in Admin → Licence fees.
      await prisma.payment.create({ data: {
        promoterId: u.promoter!.id, amount: 30000, currency: 'XAF', status: PaymentStatus.PENDING,
        method: PaymentMethod.MTN_MOMO, provider: 'manual', providerRef: 'TC-LIC-GRA7F3A',
        transactionRef: mtnRef(2), payerName: `${p.first} ${p.last}`, payerPhone: p.phone.replace(/\s/g, ''),
        description: `Licence fee – ${p.agency}`, submittedAt: ago(0, 20), createdAt: ago(0, 20),
      } });
    }
  }

  // ───────────────────────── Portfolio ─────────────────────────
  const item = async (who: string, title: string, description: string, file: string, opts: { published?: boolean; status?: ModerationStatus; note?: string; ago?: number } = {}) => {
    const ext = file.split('.').pop()!;
    const a = assets[file];
    await prisma.portfolio.create({
      data: {
        talentId: talents[who].talentId, title, description, fileName: file, mimeType: MIME[ext], fileSize: a.size, mediaUrl: a.url,
        mediaType: ext === 'jpg' ? MediaType.IMAGE : ext === 'wav' ? MediaType.AUDIO : MediaType.DOCUMENT,
        isPublished: opts.published ?? true, moderationStatus: opts.status ?? ModerationStatus.ACTIVE, moderationNote: opts.note, moderatedAt: opts.note ? ago(3) : null,
        createdAt: ago(opts.ago ?? 20), updatedAt: ago(opts.ago ?? 20),
      },
    });
  };
  await item('alex', 'Emerald Coat – Editorial Series', 'Six-look editorial for an autumn outerwear campaign, shot on location in a converted Brooklyn studio with natural window light.', 'fashion-editorial.jpg', { ago: 40 });
  await item('alex', 'Neon Rain – Street Series', 'Night street photography from a rainy week in Lower Manhattan. Shot handheld on a 35mm prime.', 'street-night.jpg', { ago: 32 });
  await item('alex', 'Maison Verde Beauty Campaign', 'Beauty campaign for Maison Verde, in collaboration with makeup artist Chloe Dubois. Art direction and retouching by me.', 'makeup-editorial.jpg', { ago: 25 });
  await item('alex', 'Photography Rate Card 2026', 'Half-day, full-day and live-event rates with usage terms.', 'photography-rate-card.pdf', { ago: 18 });
  await item('alex', 'Model Release Template (draft)', 'Working copy of the model release I use on set – not yet published.', 'sample-contract.pdf', { published: false, ago: 6 });
  await item('liam', 'Club Residency – Friday Sessions', 'A typical Friday peak hour: three decks, live remixing and a full room.', 'dj-club-set.jpg', { ago: 30 });
  await item('liam', 'Deep House Mix Sample', 'A short sample from my latest deep house mix.', 'demo-mix-sample.wav', { ago: 22 });
  await item('liam', 'Festival Crowd at Dusk', 'Closing set at a summer festival – the crowd at golden hour.', 'festival-crowd.jpg', { status: ModerationStatus.FLAGGED, note: 'Crowd photo may show identifiable minors. Please confirm consent or replace the image.', ago: 14 });
  await item('sofia', 'Lumen – Solo Contemporary Piece', 'Excerpt from a 20-minute solo created for the Bamenda Dance Biennale.', 'dancer-contemporary.jpg', { ago: 27 });
  await item('kwame', 'Golden Hour Live – Kribi Jazz Fest', 'Kwame Mensah Band headlining the main stage at Kribi Jazz Fest.', 'band-live-stage.jpg', { ago: 35 });
  await item('yuki', 'Rooftop Sunset – Brand Film Still', 'Still from a cinematic brand film shot on a 6K cinema camera with anamorphic lenses.', 'film-cinematic.jpg', { ago: 24 });
  await item('chloe', 'Editorial Makeup – Coral & Gold', 'Editorial beauty look for a spring campaign, photographed by Alex Rivera.', 'makeup-editorial.jpg', { ago: 21 });
  await item('daniel', 'Hosting the Garoua Fashion Gala', 'Hosting a 600-guest gala dinner in English and Swahili.', 'mc-gala.jpg', { ago: 19 });
  await item('priya', 'Lighting Design – Monsoon Tour', 'Lighting design and programming for a 12-city concert tour.', 'lighting-stage.jpg', { ago: 16 });
  await item('priya', 'Lighting Technical Rider', 'Minimum rig, control and crew requirements for my standard shows.', 'lighting-technical-rider.pdf', { ago: 15 });
  await item('priya', 'Crowd Atmosphere Test (removed)', 'Test upload that contained copyrighted artwork.', 'festival-crowd.jpg', { published: false, status: ModerationStatus.REMOVED, note: 'Image uses copyrighted material the talent does not own.', ago: 10 });

  // ───────────────────────── Events ─────────────────────────
  const ev = async (who: string, e: { title: string; location: string; description: string; category: string; needed: string; budget: string; date: Date; status: EventStatus; created: number }) =>
    prisma.event.create({ data: { promoterId: promoters[who].promoterId, title: e.title, location: e.location, description: e.description, category: e.category, talentNeeded: e.needed, budget: e.budget, eventDate: e.date, status: e.status, createdAt: ago(e.created) } });

  const E1 = await ev('jordan', { title: 'Halcyon Summer Sessions – Closing Night', location: 'Bonanjo Rooftop (demo), Douala', category: 'Music', needed: 'DJ', budget: '300,000 – 600,000 FCFA', date: at(21, 19), status: EventStatus.PUBLISHED, created: 30, description: 'The closing night of our rooftop series with skyline views for 1,200 guests. We are booking two DJs for a four-hour programme and a lighting designer to work with our in-house rig. Load-in begins at 3 pm; sound check at 5 pm.' });
  const E2 = await ev('jordan', { title: 'Harbour Lights Charity Gala', location: 'Akwa Event Hall (demo), Douala', category: 'Corporate', needed: 'MC / Host', budget: '500,000 – 1,000,000 FCFA', date: at(35, 18), status: EventStatus.PUBLISHED, created: 28, description: 'Annual fundraising dinner for the Harbour Lights Foundation with 450 guests, a live auction and a short stage programme. We need an experienced host and a photographer for arrivals, speeches and the auction.' });
  const E3 = await ev('jordan', { title: 'Neon Rain Fashion Showcase', location: 'Bonapriso Hall (demo), Douala', category: 'Fashion', needed: 'Photographer', budget: '600,000 – 900,000 FCFA', date: at(50, 20), status: EventStatus.PUBLISHED, created: 12, description: 'Runway showcase of eight emerging designers. We are looking for a photographer comfortable with low light and fast pace, delivering a selects gallery within 48 hours.' });
  const E4 = await ev('jordan', { title: 'Spring Jazz Residency', location: 'Bonanjo Jazz Club (demo), Douala', category: 'Music', needed: 'Musician', budget: '250,000 – 450,000 FCFA', date: at(-40, 20), status: EventStatus.COMPLETED, created: 90, description: 'A six-week jazz residency at Bonanjo Jazz Club (demo) featuring rotating bands and a documentary crew.' });
  const E5 = await ev('jordan', { title: 'Winter Lights Market Opening', location: 'Bonanjo Market Square (demo), Douala', category: 'Festival', needed: 'Musician', budget: 'To be confirmed', date: at(90, 17), status: EventStatus.DRAFT, created: 3, description: 'Opening ceremony of the Winter Lights Market with live music, a light installation and a tree-lighting moment. Details are still being finalised.' });

  const E6 = await ev('nadia', { title: 'Maison Verde Brand Launch', location: 'Bastos Event Hall (demo), Yaoundé', category: 'Fashion', needed: 'Makeup Artist', budget: '600,000 – 1,100,000 FCFA', date: at(28, 18), status: EventStatus.PUBLISHED, created: 20, description: 'Launch evening for the Maison Verde autumn collection with 300 guests, a short runway and a beauty installation. We need backstage makeup artists and a photographer for campaign-quality images.' });
  const E7 = await ev('nadia', { title: 'Bamenda Contemporary Dance Night', location: 'Cultural Hall (demo), Bamenda', category: 'Theatre & Dance', needed: 'Dancer', budget: '450,000 – 700,000 FCFA', date: at(45, 21), status: EventStatus.PUBLISHED, created: 15, description: 'An evening of new contemporary works in the main performance hall. We are commissioning two choreographers/performers for 15-minute pieces.' });
  const E8 = await ev('nadia', { title: 'Yaoundé Corporate Summit Afterparty', location: 'Conference Hall (demo), Yaoundé', category: 'Corporate', needed: 'Photographer', budget: '500,000 – 750,000 FCFA', date: at(-20, 22), status: EventStatus.COMPLETED, created: 60, description: 'Closing reception for a Cameroonian technology summit with live music and photography.' });

  const E9 = await ev('marcus', { title: 'Afterglow Festival 2026 – Main Stage', location: 'Kribi Beach, Kribi', category: 'Festival', needed: 'Musician', budget: '500,000 – 1,500,000 FCFA', date: at(60, 16), status: EventStatus.PUBLISHED, created: 35, description: 'Three-day music festival on Kribi Beach with 15,000 attendees per day. We are booking bands, DJs and lighting designers for the main and sunset stages.' });
  const E10 = await ev('marcus', { title: 'Afterglow Warm-Up – Live Sound Night', location: 'Beach Music Lounge (demo), Kribi', category: 'Music', needed: 'Musician', budget: '150,000 – 300,000 FCFA', date: at(0, 20), status: EventStatus.ONGOING, created: 25, description: 'Intimate warm-up night for the festival featuring three live acts and a listening session with the sound team.' });
  const E11 = await ev('marcus', { title: 'Douala Street Culture Weekend', location: 'Community Arts Space (demo), Douala', category: 'Festival', needed: 'Videographer', budget: '450,000 – 800,000 FCFA', date: at(75, 12), status: EventStatus.PUBLISHED, created: 10, description: 'Weekend celebration of street art, fashion and music. We need a video team to capture an aftermovie and daily highlights.' });
  const E12 = await ev('marcus', { title: 'Garoua Gala Night', location: 'Event Hall (demo), Garoua', category: 'Corporate', needed: 'MC / Host', budget: '400,000 – 700,000 FCFA', date: at(18, 19), status: EventStatus.PUBLISHED, created: 14, description: 'Black-tie gala dinner for 500 guests celebrating Cameroonian entrepreneurs. Bilingual English/French host preferred.' });
  const E13 = await ev('marcus', { title: 'Riverside Open-Air Cinema', location: 'Riverside Gardens (demo), Kribi', category: 'Film & Media', needed: 'Videographer', budget: '200,000 – 350,000 FCFA', date: at(30, 19), status: EventStatus.CANCELLED, created: 22, description: 'Open-air film screenings along the river. Cancelled due to venue permit changes.' });

  // ───────────────────────── Event photos (first = cover) ─────────────────────────
  const photos = async (event: { id: string }, files: string[]) => {
    for (const [position, file] of files.entries()) {
      const a = assets[file];
      await prisma.eventImage.create({ data: { eventId: event.id, url: a.url, fileName: file, mimeType: 'image/jpeg', fileSize: a.size, position } });
    }
  };
  await photos(E1, ['event-rooftop-douala.jpg', 'dj-club-set.jpg', 'lighting-stage.jpg']);
  await photos(E2, ['event-charity-gala.jpg', 'mc-gala.jpg']);
  await photos(E3, ['event-fashion-runway.jpg', 'fashion-editorial.jpg', 'street-night.jpg']);
  await photos(E4, ['event-jazz-club.jpg', 'band-live-stage.jpg']);
  await photos(E5, ['event-night-market-lights.jpg']);
  await photos(E6, ['makeup-editorial.jpg', 'fashion-editorial.jpg']);
  await photos(E7, ['event-dance-night.jpg', 'dancer-contemporary.jpg']);
  await photos(E8, ['event-corporate-reception.jpg']);
  await photos(E9, ['event-kribi-beach-festival.jpg', 'festival-crowd.jpg', 'lighting-stage.jpg']);
  await photos(E10, ['band-live-stage.jpg', 'event-jazz-club.jpg']);
  await photos(E11, ['event-street-culture.jpg', 'street-night.jpg']);
  await photos(E12, ['mc-gala.jpg', 'event-charity-gala.jpg']);
  await photos(E13, ['event-open-air-cinema.jpg', 'film-cinematic.jpg']);

  // ───────────────────────── Enrollments ─────────────────────────
  const enroll = async (who: string, event: { id: string }, days: number, note?: string) =>
    prisma.talentEvent.create({ data: { talentId: talents[who].talentId, eventId: event.id, enrolledAt: ago(days), note } });
  await enroll('alex', E2, 9, 'I photographed last year’s gala and would love to return.');
  await enroll('alex', E3, 8);
  await enroll('alex', E6, 5, 'Available to travel to Yaoundé.');
  await enroll('alex', E8, 55);
  await enroll('alex', E4, 85);
  await enroll('liam', E1, 10); await enroll('liam', E9, 7); await enroll('liam', E10, 12);
  await enroll('sofia', E7, 6); await enroll('sofia', E6, 4);
  await enroll('kwame', E9, 8); await enroll('kwame', E10, 14); await enroll('kwame', E4, 80);
  await enroll('yuki', E4, 82); await enroll('yuki', E2, 3);
  await enroll('chloe', E6, 6);
  await enroll('daniel', E2, 2); await enroll('daniel', E12, 7);
  await enroll('priya', E9, 5); await enroll('priya', E1, 4);

  // ───────────────────────── Contracts ─────────────────────────
  const contract = (promoter: string, talent: string, event: { id: string }, status: ContractStatus, terms: string, amount: number, currency: string, extra: Record<string, unknown> = {}, created = 10) =>
    prisma.contract.create({ data: { promoterId: promoters[promoter].promoterId, talentId: talents[talent].talentId, eventId: event.id, status, terms, amount, currency, contractDate: ago(created), createdAt: ago(created), ...extra } });

  const C1 = await contract('jordan', 'alex', E2, ContractStatus.ACTIVE, 'Services: event photography for the Harbour Lights Charity Gala – arrivals, speeches, auction and group portraits (approx. 6 hours).\nDeliverables: 120 retouched images within 72 hours via private gallery.\nFee: 700,000 FCFA payable within 14 days of delivery. Usage: editorial and promotional use by the Harbour Lights Foundation for 24 months.\nCancellation: 14 days’ notice; a 50% fee applies for later cancellations.', 700000, 'XAF', { documentUrl: assets['sample-contract.pdf'].url, documentName: 'Performance Services Agreement.pdf', reviewNotes: 'Load-in via the east service entrance. Please bring two camera bodies and a fast zoom.', respondedAt: ago(6), talentResponseNote: 'Confirmed, thank you Jordan.' }, 8);
  await contract('nadia', 'alex', E6, ContractStatus.PENDING, 'Services: campaign and backstage photography for the Maison Verde brand launch in Yaoundé.\nDeliverables: 60 retouched campaign images and a 20-image backstage story within 5 working days.\nFee: 900,000 FCFA plus two nights’ accommodation; flights reimbursed up to 350,000 FCFA against receipts.\nUsage: brand website and social channels for 12 months.', 900000, 'XAF', { reviewNotes: 'Please review the usage terms and confirm availability for the 28th by the end of the week.' }, 2);
  const C3 = await contract('nadia', 'alex', E8, ContractStatus.COMPLETED, 'Services: photography of the Yaoundé summit closing reception (4 hours).\nDeliverables: 80 retouched images in 48 hours.\nFee: 600,000 FCFA.', 600000, 'XAF', { respondedAt: ago(50), talentResponseNote: 'Happy to accept.' }, 58);
  const C4 = await contract('jordan', 'alex', E4, ContractStatus.COMPLETED, 'Services: documentary photography of the Spring Jazz Residency opening night.\nDeliverables: 50 retouched images.\nFee: 450,000 FCFA.', 450000, 'XAF', { respondedAt: ago(82) }, 84);
  await contract('jordan', 'alex', E3, ContractStatus.REJECTED, 'Services: runway photography for the Neon Rain Fashion Showcase.\nFee: 350,000 FCFA for a full evening shoot with same-night selects.', 350000, 'XAF', { respondedAt: ago(4), talentResponseNote: 'The fee is below my evening-event minimum. Happy to reconsider at 600,000 FCFA.' }, 6);
  await contract('jordan', 'liam', E1, ContractStatus.ACTIVE, 'Services: a 90-minute headline DJ set at the Halcyon Summer Sessions closing night.\nFee: 400,000 FCFA payable on the night. Sound check at 5 pm; rider and PA provided by the venue.', 400000, 'XAF', { respondedAt: ago(7) }, 9);
  await contract('marcus', 'kwame', E9, ContractStatus.PENDING, 'Services: a 60-minute main-stage set by the Kwame Mensah Band (five musicians) at Afterglow Festival.\nFee: 750,000 FCFA inclusive of band; backline and sound provided.\nTravel: accommodation for two nights in Kribi.', 750000, 'XAF', {}, 1);
  await contract('nadia', 'sofia', E7, ContractStatus.ACTIVE, 'Services: a 15-minute solo contemporary piece at the Bamenda Contemporary Dance Night.\nFee: 550,000 FCFA; rehearsal day included; costumes by the artist.', 550000, 'XAF', { respondedAt: ago(3) }, 5);
  await contract('marcus', 'daniel', E12, ContractStatus.ACTIVE, 'Services: bilingual master of ceremonies for the Garoua Gala Night (approx. 4 hours).\nFee: 550,000 FCFA; script supplied one week before the event.', 550000, 'XAF', { respondedAt: ago(4) }, 6);
  const C10 = await contract('jordan', 'yuki', E4, ContractStatus.COMPLETED, 'Services: cinematography of the Spring Jazz Residency for a 3-minute aftermovie.\nFee: 425,000 FCFA.', 425000, 'XAF', { respondedAt: ago(80) }, 85);
  await contract('marcus', 'priya', E9, ContractStatus.CANCELLED, 'Services: lighting design for the festival sunset stage.\nFee: 1,000,000 FCFA.', 1000000, 'XAF', {}, 12);
  await contract('nadia', 'chloe', E6, ContractStatus.PENDING, 'Services: lead backstage makeup artist for the Maison Verde launch.\nFee: 700,000 FCFA including kit; team of two assistants at your own cost.', 700000, 'XAF', {}, 3);

  // ───────────────────────── Ratings ─────────────────────────
  const authors = [promoters.jordan.userId, promoters.nadia.userId, promoters.marcus.userId];
  const comments = [
    'Exceptional professional. Arrived early, worked discreetly and delivered the gallery a day ahead of schedule.',
    'Great eye for light and composition – the images exceeded the brief.',
    'Easy to work with and very responsive. We will rebook.',
    'Reliable and calm under pressure, even with last-minute changes to the programme.',
    'Fantastic energy and communication from the first message to the final delivery.',
    'Strong work and on time. Retouching could have been a little more consistent on the group portraits.',
    'Understood our brand immediately. The team loved the results.',
    'Polite, punctual and talented. Highly recommended for fast-paced events.',
    'Brought great ideas to the shoot and handled talent beautifully.',
    'Solid delivery overall; communication on logistics could be quicker.',
    'Stunning images and a pleasure to have on set.',
    'Professional from start to finish.',
  ];
  const alexScores = [5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 3, 5, 5, 4, 5, 5, 5, 4, 5, 5, 4, 5, 5]; // 18×5, 5×4, 1×3 => 4.7
  for (let i = 0; i < alexScores.length; i++) {
    const linked = i === 0 ? C3.id : i === 1 ? C4.id : null;
    await prisma.rating.create({ data: { talentId: talents.alex.talentId, authorId: authors[i % 3], contractId: linked, score: alexScores[i], comment: i % 4 === 3 ? null : comments[i % comments.length], createdAt: ago(3 + i * 7 + (i % 3)) } });
  }
  const otherRatings: Record<string, number[]> = {
    liam: [5, 4, 5, 4, 5, 4, 4, 5, 5, 4, 5, 4],
    sofia: [5, 5, 4, 5, 5, 4, 5, 5, 5],
    kwame: [5, 5, 4, 5, 5, 5, 4, 5, 4, 5, 5, 5, 4, 5],
    yuki: [5, 5, 5, 4, 5, 5, 5],
    chloe: [5, 5, 5, 5, 4, 5, 5, 5, 5, 5],
    daniel: [4, 5, 4, 4, 5, 4, 5, 4],
    priya: [5, 5, 4, 5, 5, 4],
  };
  for (const [k, scores] of Object.entries(otherRatings)) {
    for (let i = 0; i < scores.length; i++) {
      const linked = k === 'yuki' && i === 0 ? C10.id : null;
      await prisma.rating.create({ data: { talentId: talents[k].talentId, authorId: authors[(i + 1) % 3], contractId: linked, score: scores[i], comment: i % 3 === 2 ? null : comments[(i * 5 + 2) % comments.length], createdAt: ago(5 + i * 9) } });
    }
  }
  for (const t of Object.values(talents)) {
    const agg = await prisma.rating.aggregate({ where: { talentId: t.talentId }, _avg: { score: true }, _count: { _all: true } });
    await prisma.talent.update({ where: { id: t.talentId }, data: { ratingAvg: Math.round((agg._avg.score ?? 0) * 10) / 10, ratingCount: agg._count._all } });
  }

  // ───────────────────────── Messages ─────────────────────────
  const msg = (from: string, to: string, content: string, hoursAgo: number, read: boolean) =>
    prisma.message.create({ data: { senderId: from, recipientId: to, content, sentAt: ago(0, hoursAgo), isRead: read, readAt: read ? ago(0, hoursAgo - 1) : null } });
  const A = talents.alex.userId, J = promoters.jordan.userId, N = promoters.nadia.userId, L = talents.liam.userId, M = promoters.marcus.userId, K = talents.kwame.userId;
  await msg(J, A, 'Hi Alex – we loved your work at the Spring Jazz Residency. Are you free to cover the Harbour Lights Gala in Boston next month?', 240, true);
  await msg(A, J, 'Hi Jordan, thank you! I am free that evening. Could you share the run of show and expected guest count?', 238, true);
  await msg(J, A, 'About 450 guests, doors at 6 pm, speeches start at 7:30. I will send you a contract today.', 236, true);
  await msg(A, J, 'Perfect, I just enrolled in the event as well. Looking forward to it.', 230, true);
  await msg(J, A, 'Contract is live in your dashboard. One note: please bring a second body for the auction portraits.', 52, false);
  await msg(J, A, 'Also – parking for the loading dock is available from 3 pm. Let me know if you need a pass.', 51, false);
  await msg(N, A, 'Bonjour Alex! We would like you for the Maison Verde launch in Yaoundé on the 28th. I have just sent over a contract.', 30, false);
  await msg(A, N, 'Bonjour Nadia, that sounds wonderful. I will review the usage terms this evening.', 28, true);
  await msg(L, J, 'Hi Jordan, is there a hard stop time for the closing night set? I want to plan the last 20 minutes.', 100, true);
  await msg(J, L, 'Hard stop at 11:30 pm. You can go up to the full 90 minutes from 9:45.', 98, true);
  await msg(M, K, 'Kwame, your main stage contract is in. Please confirm the five-piece line-up and backline needs.', 20, false);

  // ───────────────────────── Notifications ─────────────────────────
  const notif = (userId: string, type: NotificationType, title: string, message: string, hoursAgo: number, isRead: boolean, link?: string) =>
    prisma.notification.create({ data: { userId, type, title, message, link, isRead, sentAt: ago(0, hoursAgo) } });
  await notif(A, NotificationType.CONTRACT, 'New contract to review', 'Meridian Events Group sent you a contract for "Maison Verde Brand Launch".', 30, false, `/talent/contracts`);
  await notif(A, NotificationType.MESSAGE, 'New message from Jordan Blake', 'Contract is live in your dashboard. One note: please bring a second body…', 52, false, '/talent/messages');
  await notif(A, NotificationType.RATING, 'You received a new rating', 'A promoter rated your work 5/5.', 120, false, '/talent/ratings');
  await notif(A, NotificationType.EVENT, 'Enrollment confirmed', 'You are enrolled in "Harbour Lights Charity Gala". The organiser has been notified.', 216, true, '/talent/events');
  await notif(A, NotificationType.CONTRACT, 'Contract accepted', 'You accepted the contract for "Harbour Lights Charity Gala".', 144, true, '/talent/contracts');
  await notif(A, NotificationType.ADMIN, 'Welcome to Talent Connect', 'Complete your profile and publish your first portfolio item.', 3360, true, '/talent/profile');
  await notif(J, NotificationType.EVENT, 'New talent enrollment', 'Alex Rivera enrolled in "Harbour Lights Charity Gala".', 216, true, '/promoter/events');
  await notif(J, NotificationType.EVENT, 'New talent enrollment', 'Priya Sharma enrolled in "Halcyon Summer Sessions – Closing Night".', 96, false, '/promoter/events');
  await notif(J, NotificationType.CONTRACT, 'Contract declined', 'Alex Rivera declined the contract for "Neon Rain Fashion Showcase".', 96, false, '/promoter/contracts');
  await notif(J, NotificationType.LICENCE, 'Your agency is verified', 'You can now publish events and create contracts.', 3000, true, '/promoter/licence');
  await notif(J, NotificationType.PAYMENT, 'Licence fee confirmed', 'Your MTN MoMo transfer of 30,000 FCFA was confirmed.', 3100, true, '/promoter/payments');
  await notif(admin.id, NotificationType.ADMIN, 'Promoter licence awaiting review', 'Northlight Productions submitted a licence for verification.', 250, false, `/admin/promoters/${promoters.elena.promoterId}`);
  await notif(admin.id, NotificationType.ADMIN, 'Promoter licence awaiting review', 'Orbit Entertainment submitted a licence for verification.', 200, false, `/admin/promoters/${promoters.victor.promoterId}`);
  await notif(promoters.tom.userId, NotificationType.LICENCE, 'Licence verification rejected', 'Your licence was rejected. Update your details and resubmit.', 500, true, '/promoter/licence');
  await notif(promoters.grace.userId, NotificationType.LICENCE, 'Next step: verify your agency', 'Submit your licence details so an administrator can verify your agency.', 48, false, '/promoter/licence');
  await notif(promoters.grace.userId, NotificationType.PAYMENT, 'Transfer submitted', `We received your MTN MoMo transaction ${mtnRef(2)}. An administrator confirms it before your licence goes for review.`, 20, false, '/promoter/payments');
  await notif(admin.id, NotificationType.ADMIN, 'Licence fee to confirm', `Grace Lin transferred 30,000 FCFA with MTN MoMo (transaction ${mtnRef(2)}).`, 20, false, '/admin/licence-fees');

  console.log('✔ Seed complete');
  console.log(`  Admin     ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Talent    alex.rivera@talentconnect.dev / ${DEMO_PASSWORD}`);
  console.log(`  Promoter  jordan.blake@talentconnect.dev / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
