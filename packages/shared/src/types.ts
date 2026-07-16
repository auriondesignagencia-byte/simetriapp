import type { ReferencePoints, SymmetryBand } from './symmetry.js';

export type Sexo = 'menino' | 'menina' | 'nao_informar';

export type Diagnostico = 'plagiocefalia' | 'braquicefalia' | 'sem_diagnostico';

export const DIAGNOSTICO_LABELS: Record<Diagnostico, string> = {
  plagiocefalia: 'Plagiocefalia',
  braquicefalia: 'Braquicefalia',
  sem_diagnostico: 'Ainda sem diagnóstico',
};

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  notificationPreferences: NotificationPreferences;
}

export interface NotificationPreferences {
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  /** "HH:mm" */
  time: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export interface Baby {
  id: string;
  userId: string;
  name: string;
  sexo: Sexo;
  birthDate: string;
  /** gramas ao nascer */
  birthWeightG: number | null;
  premature: boolean;
  multiplePregnancy: boolean;
  diagnosis: Diagnostico;
  profilePhotoUrl: string | null;
  createdAt: string;
}

export interface Professional {
  id: string;
  name: string;
  email: string;
  inviteCode: string;
  clinicName: string;
}

export interface PhotoEntry {
  id: string;
  babyId: string;
  /** URL assinada e temporária. Nunca um caminho público de storage. */
  imageUrl: string;
  takenAt: string;
  referencePoints: ReferencePoints;
  asymmetryIndex: number;
  widthLengthRatio: number;
  band: SymmetryBand;
  weekNumber: number;
  note: string | null;
  /**
   * Fotos de OUTROS ângulos (perfil, frente, nuca, diagonais), anexadas à mesma
   * semana. São REGISTRO VISUAL, não medição: só a foto de cima (imageUrl +
   * referencePoints) produz o índice das diagonais. Fingir calcular um índice a
   * partir de um perfil seria inventar medida — e o app não faz isso.
   */
  angles?: AnglePhoto[];
}

/**
 * Os ângulos complementares. A foto de cima é a única que MEDE; estes documentam
 * o formato da cabeça de todos os lados — úteis para o antes/depois e para o
 * profissional enxergar o que a vista superior não mostra (a nuca achatada da
 * braquicefalia, por exemplo).
 */
export type AngleKey =
  | 'lateral_esq'
  | 'lateral_dir'
  | 'frontal'
  | 'posterior'
  | 'diagonal_esq'
  | 'diagonal_dir';

export interface AnglePhoto {
  angle: AngleKey;
  imageUrl: string;
  takenAt: string;
}

export const ANGLE_LABELS: Record<AngleKey, string> = {
  lateral_esq: 'Perfil esquerdo',
  lateral_dir: 'Perfil direito',
  frontal: 'De frente',
  posterior: 'Nuca (por trás)',
  diagonal_esq: 'Diagonal esquerda',
  diagonal_dir: 'Diagonal direita',
};

/** Ordem de exibição — do mais útil (perfis, que mostram a braquicefalia) ao resto. */
export const ANGLE_ORDER: AngleKey[] = [
  'lateral_esq',
  'lateral_dir',
  'posterior',
  'frontal',
  'diagonal_esq',
  'diagonal_dir',
];

/** Dica de enquadramento por ângulo, escrita para um pai leigo. */
export const ANGLE_HINTS: Record<AngleKey, string> = {
  lateral_esq: 'De lado, mostrando a orelha esquerda e o perfil inteiro da cabeça.',
  lateral_dir: 'De lado, mostrando a orelha direita e o perfil inteiro da cabeça.',
  frontal: 'De frente, na altura dos olhos do bebê.',
  posterior: 'Por trás, mostrando a nuca e as duas orelhas ao mesmo tempo.',
  diagonal_esq: 'Um pouco à frente e à esquerda, entre a frente e o perfil esquerdo.',
  diagonal_dir: 'Um pouco à frente e à direita, entre a frente e o perfil direito.',
};

export type ContentType = 'video' | 'article';
export type ContentTag = 'pode_fazer' | 'so_profissional';

export interface ContentItem {
  id: string;
  title: string;
  summary: string;
  type: ContentType;
  /** faixa etária em meses */
  ageRangeMin: number;
  ageRangeMax: number;
  tag: ContentTag;
  mediaUrl: string | null;
  durationSec: number | null;
  transcript: string;
  body: string | null;
  accent: string;
}

export interface ContentProgress {
  contentItemId: string;
  viewedAt: string;
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'free';

export interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  plan: 'free' | 'premium';
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  /** preenchido quando o pagamento falha: fim dos 3 dias de cortesia */
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface AppNotification {
  id: string;
  type: 'lembrete_semanal' | 'saudade' | 'marco' | 'sistema';
  title: string;
  body: string;
  sentAt: string;
  readAt: string | null;
}

/** Eventos de produto. Ficam no banco; nenhuma ferramenta de terceiro no MVP. */
export type AnalyticsEvent =
  | 'cadastro_completo'
  | 'primeira_foto'
  | 'foto_semanal'
  | 'conteudo_assistido'
  | 'trial_expirado'
  | 'assinatura_iniciada'
  | 'assinatura_cancelada'
  | 'relatorio_exportado'
  | 'paywall_visto';

/** Paciente como o profissional o enxerga. Sem e-mail nem dado do responsável
 *  além do nome — o painel não é um banco de leads. */
export interface PatientSummary {
  babyId: string;
  babyName: string;
  guardianName: string;
  ageMonths: number;
  diagnosis: Diagnostico;
  entries: { weekNumber: number; asymmetryIndex: number; takenAt: string }[];
  latestIndex: number | null;
  lastActivityAt: string | null;
  daysInactive: number | null;
  adherence: number;
}
