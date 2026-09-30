/** Shapes returned by the Talent Connect REST API. */
export type Role = 'TALENT' | 'PROMOTER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type LicenceStatus = 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ContractStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
export type ModerationStatus = 'ACTIVE' | 'FLAGGED' | 'REMOVED';
export type NotificationType = string;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Completion {
  percent: number;
  items: { key: string; label: string; done: boolean }[];
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  talent: { id: string; specialization: string; gender: string; bio: string | null; location: string | null; skills: string[]; experienceYears: number; website: string | null; ratingAvg: number; ratingCount: number } | null;
  promoter: { id: string; agencyName: string; licenceStatus: LicenceStatus } | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface PublicMeta {
  specializations: string[];
  genders: string[];
  eventCategories: string[];
  licenceFee: number;
  currency: string;
}

export interface TalentProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  specialization: string;
  gender: string;
  bio: string | null;
  location: string | null;
  skills: string[];
  experienceYears: number;
  website: string | null;
  ratingAvg: number;
  ratingCount: number;
  memberSince: string;
  email?: string;
  phone?: string | null;
  completion?: Completion;
}

export interface RatingSummary {
  average: number;
  count: number;
  distribution: Record<string, number>;
}

export interface Review {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  author: { name: string; avatarUrl: string | null; agencyName: string | null };
  event: { id: string; title: string } | null;
}

export interface TalentCard extends TalentProfile {
  portfolioCount: number;
  portfolioPreview: PortfolioItem[];
}

export interface TalentDetail extends TalentProfile {
  portfolio: PortfolioItem[];
  rating: RatingSummary;
  reviews: Review[];
  contractsWithYou: { id: string; status: ContractStatus; eventTitle?: string; event?: { title: string } }[];
}

export interface PortfolioItem {
  id: string;
  talentId: string;
  title: string;
  description: string | null;
  mediaType: MediaType;
  mediaUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  isPublished: boolean;
  moderationStatus: ModerationStatus;
  moderationNote: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioList extends Paginated<PortfolioItem> {
  stats: { total: number; published: number; flagged: number; byType: Record<string, number> };
}

export interface PromoterPublic {
  id: string;
  userId: string;
  agencyName: string;
  description: string | null;
  website: string | null;
  location: string | null;
  verified: boolean;
  contactName: string;
  avatarUrl: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  location: string;
  description: string;
  category: string | null;
  talentNeeded: string | null;
  budget: string | null;
  eventDate: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  enrollmentCount: number;
  contractCount: number;
  promoter: PromoterPublic;
  enrolled?: boolean;
  enrolledAt?: string | null;
  myContract?: { id: string; status: ContractStatus } | null;
  isOwner?: boolean;
}

export interface Enrollment {
  id: string;
  enrolledAt: string;
  note: string | null;
  talent: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    specialization: string;
    location: string | null;
    skills: string[];
    ratingAvg: number;
    ratingCount: number;
  };
  contract: { id: string; status: ContractStatus } | null;
}

export interface Contract {
  id: string;
  status: ContractStatus;
  contractDate: string;
  terms: string;
  amount: number | null;
  currency: string;
  documentUrl: string | null;
  documentName: string | null;
  reviewNotes: string | null;
  talentResponseNote: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  talent: { id: string; userId: string; firstName: string; lastName: string; avatarUrl: string | null; specialization: string };
  promoter: { id: string; userId: string; agencyName: string; verified: boolean; contactName: string };
  event: { id: string; title: string; location: string; eventDate: string; status: EventStatus };
  rating: { id: string; score: number; comment: string | null } | null;
}

export interface ContractList extends Paginated<Contract> {
  counts: Partial<Record<ContractStatus, number>>;
}

export interface PaymentConfig {
  provider: string;
  sandbox: boolean;
  currency: string;
  licenceFee: number;
  testCards: { number: string; brand: string; outcome: string }[];
}

export interface Payment {
  id: string;
  promoterId: string;
  purpose: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerRef: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  failureReason: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  promoter?: { id: string; agencyName: string };
}

export interface PaymentList extends Paginated<Payment> {
  totalPaid: number;
  licence: { licenceFeePaid: boolean; licenceStatus: LicenceStatus };
  config: PaymentConfig;
}

export interface PromoterProfile {
  id: string;
  userId: string;
  agencyName: string;
  agencyDescription: string | null;
  website: string | null;
  location: string | null;
  licenceNumber: string | null;
  licenceAuthority: string | null;
  licenceExpiry: string | null;
  licenceInfo: string | null;
  licenceDocumentUrl: string | null;
  licenceStatus: LicenceStatus;
  licenceFeePaid: boolean;
  licenceSubmittedAt: string | null;
  licenceReviewedAt: string | null;
  licenceRejectionReason: string | null;
  createdAt: string;
  user: { id: string; email: string; firstName: string; lastName: string; phone: string | null; avatarUrl: string | null; createdAt: string };
  licenceHistory: { id: string; action: string; reason: string | null; createdAt: string; admin: string | null }[];
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  isRead: boolean;
  sentAt: string;
}

export interface Conversation {
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null; role: Role; headline: string | null };
  lastMessage: { id: string; content: string; sentAt: string; fromMe: boolean };
  unread: number;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  sentAt: string;
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: Role;
  headline: string | null;
  talentId: string | null;
  promoterId: string | null;
}

export interface AiStatus {
  provider: string;
  live: boolean;
  model: string;
  mode: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  task: string | null;
  createdAt: string;
}

export interface AiReply {
  reply: string;
  task: string;
  provider: string;
  live: boolean;
  model: string;
  mode: string;
}

/* ─────────────── Dashboards ─────────────── */
export interface TalentDashboard {
  profile: { firstName: string; specialization: string; avatarUrl: string | null };
  completion: Completion;
  rating: { average: number; count: number };
  portfolio: { total: number; published: number };
  upcomingEventsCount: number;
  upcomingEvents: { id: string; title: string; location: string; eventDate: string; status: EventStatus; agencyName: string }[];
  contracts: { active: number; pending: number; completed: number; total: number };
  pendingContracts: { id: string; eventTitle: string; eventDate: string; agencyName: string; createdAt: string }[];
  unreadMessages: number;
  unreadNotifications: number;
  recentNotifications: AppNotification[];
}

export interface PromoterDashboard {
  agency: { name: string; licenceStatus: LicenceStatus; licenceFeePaid: boolean; rejectionReason: string | null };
  events: { total: number; byStatus: Partial<Record<EventStatus, number>> };
  contracts: { active: number; pending: number; completed: number; total: number };
  talentsOnPlatform: number;
  talentsInMyEvents: number;
  payments: { totalPaid: number; count: number; last: Payment | null };
  upcomingEvents: { id: string; title: string; location: string; eventDate: string; status: EventStatus; enrollmentCount: number }[];
  recentEnrollments: { id: string; enrolledAt: string; event: { id: string; title: string }; talent: { id: string; name: string; specialization: string; avatarUrl: string | null } }[];
  pendingContracts: { id: string; eventTitle: string; talentName: string; createdAt: string }[];
  unreadMessages: number;
  unreadNotifications: number;
  recentNotifications: AppNotification[];
}

export interface AdminStats {
  users: { total: number; talents: number; promoters: number; admins: number; active7d: number; new7d: number; byStatus: Record<string, number> };
  pendingVerification: number;
  events: { total: number; byStatus: Partial<Record<EventStatus, number>> };
  contracts: { total: number; active: number; byStatus: Partial<Record<ContractStatus, number>> };
  payments: { revenue: number; byStatus: Partial<Record<PaymentStatus, { count: number; amount: number }>> };
  portfolios: { flagged: number; removed: number };
  pendingPromoters: { id: string; agencyName: string; owner: string; submittedAt: string }[];
  recentUsers: { id: string; firstName: string; lastName: string; role: Role; createdAt: string; status: UserStatus }[];
}

export interface AdminMonitoring {
  series: { date: string; talents: number; promoters: number; contracts: number; events: number; revenue: number }[];
  licencePipeline: Record<LicenceStatus, number>;
  moderation: Record<ModerationStatus, number>;
  activity: { kind: string; text: string; at: string }[];
  system: {
    status: string;
    uptimeSeconds: number;
    startedAt: string;
    node: string;
    platform: string;
    memoryMb: number;
    dbLatencyMs: number;
    records: { users: number; events: number; contracts: number; payments: number };
  };
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  talent: { id: string; specialization: string } | null;
  promoter: { id: string; agencyName: string; licenceStatus: LicenceStatus } | null;
}

export interface AdminPromoterRow {
  id: string;
  userId: string;
  agencyName: string;
  location: string | null;
  licenceNumber: string | null;
  licenceStatus: LicenceStatus;
  licenceFeePaid: boolean;
  licenceSubmittedAt: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; status: UserStatus };
  _count: { events: number; contracts: number };
}

export interface AdminPromoterDetail extends Omit<PromoterProfile, 'user' | 'licenceHistory'> {
  user: { id: string; firstName: string; lastName: string; email: string; phone: string | null; status: UserStatus; createdAt: string; lastLoginAt: string | null };
  payments: Payment[];
  events: { id: string; title: string; status: EventStatus; eventDate: string }[];
  _count: { events: number; contracts: number };
  history: { id: string; action: string; reason: string | null; createdAt: string; admin?: string | null }[];
}

export interface AdminPortfolioRow extends PortfolioItem {
  talent: { id: string; specialization: string; user: { firstName: string; lastName: string; email?: string } };
}

export interface AdminEventRow {
  id: string;
  title: string;
  location: string;
  category: string | null;
  eventDate: string;
  status: EventStatus;
  promoter: { id: string; agencyName: string };
  _count: { enrollments: number; contracts: number };
}

export interface ReportResult {
  type: string;
  title: string;
  generatedAt: string;
  total: number;
  columns: string[];
  rows: Record<string, string | number | null>[];
}
