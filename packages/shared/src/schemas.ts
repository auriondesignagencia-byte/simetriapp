import { z } from 'zod';

export const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const referencePointsSchema = z.object({
  frenteEsq: pointSchema,
  frenteDir: pointSchema,
  trasEsq: pointSchema,
  trasDir: pointSchema,
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Como podemos te chamar?'),
  email: z.string().trim().email('Confira o e-mail, parece que falta algo.'),
  password: z
    .string()
    .min(8, 'Use pelo menos 8 caracteres — é o que protege as fotos do seu bebê.'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Confira o e-mail.'),
  password: z.string().min(1, 'Digite sua senha.'),
});

export const babySchema = z.object({
  name: z.string().trim().min(1, 'Qual o nome do bebê?'),
  sexo: z.enum(['menino', 'menina', 'nao_informar']),
  birthDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Data inválida.')
    .refine((v) => new Date(v) <= new Date(), 'A data de nascimento não pode ser no futuro.')
    .refine(
      (v) => new Date(v) >= new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 5),
      'Esta data parece muito antiga — confira.',
    ),
  birthWeightG: z
    .number()
    .int()
    .min(300, 'Peso parece baixo demais — confira.')
    .max(7000, 'Peso parece alto demais — confira.')
    .nullable(),
  premature: z.boolean(),
  multiplePregnancy: z.boolean(),
  diagnosis: z.enum(['plagiocefalia', 'braquicefalia', 'sem_diagnostico']),
  profilePhotoUrl: z.string().nullable().optional(),
});

export const consentSchema = z.object({
  // Literal(true): não existe "consentimento falso" válido. O tipo carrega a
  // regra da LGPD, então o backend não depende do front ter lembrado de checar.
  accepted: z.literal(true, {
    errorMap: () => ({ message: 'Precisamos do seu aceite para guardar as fotos com segurança.' }),
  }),
  acceptedAt: z.string(),
});

export const photoEntrySchema = z.object({
  babyId: z.string(),
  takenAt: z.string(),
  referencePoints: referencePointsSchema,
  note: z.string().max(280).nullable().optional(),
});

export const notificationPrefsSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido.'),
  pushEnabled: z.boolean(),
  emailEnabled: z.boolean(),
});

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, 'O código tem 6 caracteres, entre letras e números.');

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BabyInput = z.infer<typeof babySchema>;
export type PhotoEntryInput = z.infer<typeof photoEntrySchema>;
export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;
