export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

const DAY = 24 * 60 * 60 * 1000;

export function daysBetween(a: Date | string, b: Date | string): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.floor((d2 - d1) / DAY);
}

export interface BabyAge {
  months: number;
  days: number;
  totalDays: number;
  /** "3 meses e 12 dias" */
  label: string;
  /** "3m" — para chips e espaços apertados */
  short: string;
}

export function babyAge(birthDate: string, now: Date = new Date()): BabyAge {
  const birth = new Date(birthDate);
  const totalDays = Math.max(0, daysBetween(birth, now));

  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);

  const anchor = new Date(birth);
  anchor.setMonth(anchor.getMonth() + months);
  const days = Math.max(0, daysBetween(anchor, now));

  const mLabel = months === 1 ? '1 mês' : `${months} meses`;
  const dLabel = days === 1 ? '1 dia' : `${days} dias`;

  let label: string;
  if (months === 0) label = dLabel;
  else if (days === 0) label = mLabel;
  else label = `${mLabel} e ${dLabel}`;

  return {
    months,
    days,
    totalDays,
    label,
    short: months === 0 ? `${totalDays}d` : `${months}m`,
  };
}

/** Semana de acompanhamento (1-based) contada a partir do início do tratamento. */
export function weekNumberFor(startedAt: string, takenAt: string | Date): number {
  return Math.floor(daysBetween(startedAt, takenAt) / 7) + 1;
}

/** Dias até a próxima foto semanal. Negativo = atrasada. */
export function daysUntilNextPhoto(lastPhotoAt: string | null, startedAt: string): number {
  const anchor = lastPhotoAt ?? startedAt;
  const next = new Date(anchor);
  next.setDate(next.getDate() + 7);
  return daysBetween(new Date(), next);
}

/** Semanas consecutivas com registro, contando de trás para frente. */
export function currentStreak(weekNumbers: number[]): number {
  if (weekNumbers.length === 0) return 0;
  const weeks = [...new Set(weekNumbers)].sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i - 1] - weeks[i] === 1) streak++;
    else break;
  }
  return streak;
}

export function formatDateBR(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export const WEEKDAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;
