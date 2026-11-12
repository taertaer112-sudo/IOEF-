/**
 * International Online Esports Federation (IOEF) - Core Database Types & Storage
 */

export type GeminiModelAlias =
  | 'gemini-4-hydrogen'
  | 'gemini-4-argon'
  | 'gemini-4-carbon'
  | 'gemini-3.1-flash-lite';

export interface AIConfig {
  activeModel: GeminiModelAlias;
  enableSquadVision: boolean;
  enableResultVision: boolean;
  enableCentralAssistant: boolean;
}

export interface SocialChannels {
  whatsappChannelName: string;
  whatsappChannelUrl: string;
  tiktokHandle: string;
  tiktokUrl: string;
  facebookPageName: string;
  facebookUrl: string;
}

export interface MembershipSettings {
  freeFirstSeason: boolean;
  renewalFee: number; // Symbolic fee set by President starting next season
  currency: string; // e.g. 'USD' | 'EGP' | 'SAR'
  feeEffectiveSeason: string; // e.g. '2027/2028'
  feeEffectiveDate: string; // ISO date
  membershipDurationDays: number; // default 365
  gracePeriodDays: number; // default 30
  renewalsEnabled: boolean;
  vodafoneCashNumber: string;
  instaPayAddress: string;
  visaGatewayConfigured: boolean;
}

export interface SystemSettings {
  firstDivisionMinRating: number; // e.g. 3220
  secondDivisionMinRating: number; // e.g. 3150
  allowRegistration: boolean;
  whatsappApiEnabled: boolean;
  whatsappWebhookUrl: string;
  federationOfficialPhone: string;
  federationOfficialEmail: string;
  maintenanceMode: boolean;
  aiConfig: AIConfig;
  socialChannels: SocialChannels;
  membershipSettings?: MembershipSettings;
}

export interface Division {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  country: string;
  flag: string;
  description: string;
}

export type TournamentCategory =
  | 'first_division'
  | 'second_division'
  | 'division_cup'
  | 'division_super_cup'
  | 'champions_league'
  | 'europa_league'
  | 'international_super_cup';

export interface ScoringRules {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
}

export interface Tournament {
  id: string;
  divisionId?: string; // undefined for international
  nameAr: string;
  nameEn: string;
  category: TournamentCategory;
  season: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  teamsCount: number;
  banner?: string;
  trophyName: string;
  rulesSummary: string;
  scoringRules?: ScoringRules;
  championsHistory?: Array<{
    season: string;
    championName: string;
    runnerUpName?: string;
  }>;
}

export interface RosterPlayer {
  id: string;
  name: string;
  position: string;
  rating: number;
}

export interface TeamSeasonRecord {
  season: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  rank?: number;
}

export interface Team {
  id: string;
  clubCode?: string; // e.g. IOEF-C-000001
  divisionId: string;
  tournamentId?: string;
  realClubId?: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
  secondaryColor?: string;
  playerId: string; // manager / player id
  managerName?: string;
  registrationStatus?: 'available' | 'pending' | 'approved';
  divisionTier: 1 | 2;
  rating: number; // squad rating
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  roster?: RosterPlayer[];
  season?: string;
  seasonHistory?: TeamSeasonRecord[];
}

export interface PlayerSeasonHistory {
  season: string;
  teamId?: string;
  teamName: string;
  divisionId: string;
  divisionTier: 1 | 2;
  tournamentName?: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  awards: string[];
}

export interface PlayerTransferRecord {
  id: string;
  playerId: string;
  playerCode: string;
  fromTeamId: string;
  fromTeamName: string;
  toTeamId: string;
  toTeamName: string;
  fromDivisionId: string;
  toDivisionId: string;
  fromTier: 1 | 2;
  toTier: 1 | 2;
  season: string;
  transferredAt: string;
  approvedBy: string;
  notes?: string;
}

export type MembershipStatus =
  | 'free'
  | 'active'
  | 'pending_payment'
  | 'pending_review'
  | 'expired'
  | 'suspended';

export interface MembershipRecord {
  id: string;
  membershipNumber: string; // e.g. IOEF-M-2026-000001
  playerId: string;
  playerCode: string; // Permanent immutable ID: IOEF-P-000001
  divisionId: string;
  teamName: string;
  divisionTier: 1 | 2;
  season: string;
  status: MembershipStatus;
  isFirstSeasonFree: boolean;
  issuedAt: string;
  expiresAt: string;
  graceEndsAt?: string;
  qrVerificationToken: string; // Opaque cryptographic verification token (no PII in QR payload)
  cardVersion: number;
  cardStatus: 'active' | 'revoked';
  revokedAt?: string;
  revokedReason?: string;
  updatedAt: string;
}

export type SubscriptionPaymentMethod = 'vodafone_cash' | 'instapay' | 'visa';

export interface SubscriptionPayment {
  id: string;
  receiptNumber: string;
  playerId: string;
  playerCode: string;
  playerName: string;
  membershipId: string;
  season: string;
  amount: number;
  currency: string;
  paymentMethod: SubscriptionPaymentMethod;
  providerType: 'manual_proof' | 'gateway_api';
  senderReference: string; // Wallet phone / InstaPay IPA / last 4 Visa ref
  transactionRef: string; // Must be unique across platform
  proofImageUrl?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  fraudFlags: string[];
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface Player {
  id: string;
  playerCode?: string; // e.g. IOEF-P-000001 (permanent across seasons and transfers)
  membershipId?: string;
  fullName: string;
  gamerTag: string;
  whatsapp: string;
  email: string;
  country: string;
  divisionId: string;
  divisionTier: 1 | 2;
  teamName: string;
  teamLogo?: string;
  photoUrl?: string;
  squadRating: number;
  squadFormation: string;
  squadImageUrl: string;
  proofImageUrl?: string;
  squadEditCount: number; // player can edit only once (max 1 unless unlocked)
  squadEditLocked: boolean; // if true, cannot edit without admin approval
  status: 'active' | 'suspended' | 'pending';
  joinedAt: string;
  season?: string;
  bio?: string;
  roster?: RosterPlayer[];
  awards?: string[];
  seasonHistory?: PlayerSeasonHistory[];
}

export interface SquadEditRecord {
  id: string;
  playerId: string;
  changedAt: string;
  previousRating: number;
  newRating: number;
  previousImageUrl: string;
  newImageUrl: string;
  approvedBy?: string;
  notes?: string;
}

export interface SocialVerificationProof {
  whatsappFollowed: boolean;
  tiktokFollowed: boolean;
  facebookFollowed: boolean;
  confirmedAt: string;
  method: 'self_attested_with_proof' | 'self_attested';
}

export interface RegistrationApplication {
  id: string;
  fullName: string;
  gamerTag: string;
  whatsapp: string;
  country: string;
  divisionId: string;
  requestedTier: 1 | 2;
  realClubId?: string;
  teamName: string;
  squadImageUrl: string;
  proofImageUrl?: string;
  photoUrl?: string;
  termsAccepted: boolean;
  socialVerification?: SocialVerificationProof;
  extractedRoster?: RosterPlayer[];
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  aiAnalysis?: {
    squadRating: number;
    formation?: string;
    identifiedPlayers?: string[];
    extractedRoster?: RosterPlayer[];
    recommendedTier: 1 | 2;
    passedRequirements: boolean;
    needsHumanReview?: boolean;
    reasoning: string;
    analyzedAt: string;
  };
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface MatchStats {
  homePossession?: number;
  awayPossession?: number;
  homeShots?: number;
  awayShots?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
}

export interface MatchFixture {
  id: string;
  tournamentId: string;
  divisionId?: string;
  season?: string;
  roundName: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'disputed';
  matchDate: string; // ISO date
  matchTime: string; // e.g. "20:00"
  assignedReferee?: string;
  streamUrl?: string;
  resultScreenshotUrl?: string;
  stats?: MatchStats;
  aiResultAudit?: {
    extractedHomeScore: number;
    extractedAwayScore: number;
    teamsMatched: boolean;
    confidence: number;
    remarks: string;
  };
  events?: {
    minute: number;
    type: 'goal' | 'yellow_card' | 'red_card';
    team: 'home' | 'away';
    player: string;
  }[];
}

export interface DisciplinaryAction {
  id: string;
  playerId: string;
  teamId?: string;
  divisionId?: string;
  violationType: 'fair_play' | 'match_absence' | 'illegal_squad' | 'toxic_behavior' | 'connection_tampering';
  severity: 'warning' | 'fine' | 'points_deduction' | 'suspension' | 'permanent_ban';
  pointsDeducted?: number;
  suspensionMatches?: number;
  description: string;
  issuedBy: string;
  issuedAt: string;
  status: 'active' | 'resolved' | 'appealed';
}

export interface NewsItem {
  id: string;
  divisionId?: string; // undefined = global IOEF news
  title: string;
  summary: string;
  content: string;
  category: 'announcement' | 'tournament' | 'disciplinary' | 'press_release' | 'technical';
  imageUrl: string;
  publishedAt: string;
  author: string;
  isImportant: boolean;
}

export interface RegulationArticle {
  id: string;
  chapterNumber: string;
  titleAr: string;
  subtitleAr: string;
  category: 'technical' | 'registration' | 'matches' | 'discipline' | 'promotion';
  content: string;
  updatedAt: string;
}

export interface StoreProduct {
  id: string;
  titleAr: string;
  category: 'apparel' | 'hardware' | 'digital_pass' | 'services';
  price: number;
  currency: string;
  imageUrl: string;
  description: string;
  features: string[];
  stock: number;
  isOfficial: boolean;
  verifiedBroker?: {
    name: string;
    verified: boolean;
    contactWhatsApp: string;
  };
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  productId: string;
  productTitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  totalPrice: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'apple_pay' | 'stc_pay' | 'direct_broker';
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  recipientId?: string; // null for public announcement
  divisionId?: string;
  type:
    | 'registration_status'
    | 'match_fixture'
    | 'result_update'
    | 'penalty'
    | 'squad_unlock'
    | 'membership_issued'
    | 'card_updated'
    | 'renewal_reminder'
    | 'payment_status'
    | 'membership_status'
    | 'transfer_approved'
    | 'system';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

export interface AdminPermissions {
  manageRegistrations: boolean;
  manageSquadLocks: boolean;
  manageMatchesAndResults: boolean;
  manageTournamentsAndRules: boolean;
  manageDiscipline: boolean;
  manageNewsAndStore: boolean;
  manageSettingsAndAI: boolean;
  manageBackups: boolean;
  manageAdmins: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: 'president' | 'director' | 'organizer';
  email: string;
  active: boolean;
  assignedDivisionId?: string; // optional federation scope for organizer
  permissions: AdminPermissions;
}

export interface AuditLog {
  id: string;
  adminName: string;
  action: string;
  target: string;
  timestamp: string;
  details: string;
}

export interface SupportTicket {
  id: string;
  senderName: string;
  senderContact: string;
  divisionId?: string;
  ticketSubject: 'match_dispute' | 'registration_inquiry' | 'squad_appeal' | 'general';
  ticketDetails: string;
  status: 'open' | 'investigating' | 'resolved';
  createdAt: string;
  resolutionNotes?: string;
  resolvedBy?: string;
}
