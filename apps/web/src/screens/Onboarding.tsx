import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  babySchema,
  signupSchema,
  WEEKDAYS,
  type Diagnostico,
  type Professional,
  type Sexo,
} from '@simetriapp/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceGroup, Field, Switch } from '@/components/ui/Field';
import { DatePicker } from '@/components/ui/DatePicker';
import { ProgressBar } from '@/components/ui/Badge';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { SymmetryChart } from '@/components/SymmetryChart';
import { HowItWorksArt, WelcomeArt } from '@/components/Illustration';
import { DEMO_PROFESSIONAL } from '@/lib/seed';
import { useApp } from '@/store/app';
import { cn } from '@/lib/cn';

type Step =
  | 'welcome'
  | 'how'
  | 'consent'
  | 'guardian'
  | 'baby'
  | 'diagnosis'
  | 'invite'
  | 'reminder'
  | 'journey';

const STEPS: Step[] = [
  'welcome',
  'how',
  'consent',
  'guardian',
  'baby',
  'diagnosis',
  'invite',
  'reminder',
  'journey',
];

export function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState<Step>('welcome');
  const [dir, setDir] = useState<1 | -1>(1);

  const [consent, setConsent] = useState(false);
  const [guardian, setGuardian] = useState({ name: '', email: '', password: '' });
  const [baby, setBaby] = useState({
    name: '',
    sexo: null as Sexo | null,
    birthDate: null as string | null,
    birthWeightG: '' as string,
    premature: false,
    multiplePregnancy: false,
  });
  const [diagnosis, setDiagnosis] = useState<Diagnostico | null>(null);
  const [invite, setInvite] = useState('');
  const [linked, setLinked] = useState<Professional | null>(null);
  const [checking, setChecking] = useState(false);
  const [reminder, setReminder] = useState({ weekday: 0, time: '10:00' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const index = STEPS.indexOf(step);

  const go = (next: Step, direction: 1 | -1 = 1) => {
    setDir(direction);
    setErrors({});
    setStep(next);
  };

  const back = () => {
    if (index === 0) return;
    go(STEPS[index - 1], -1);
  };

  const validateAndAdvance = () => {
    const next = STEPS[index + 1];

    if (step === 'guardian') {
      const r = signupSchema.safeParse(guardian);
      if (!r.success) {
        const e: Record<string, string> = {};
        r.error.issues.forEach((i) => (e[String(i.path[0])] = i.message));
        setErrors(e);
        return;
      }
    }

    if (step === 'baby') {
      const r = babySchema
        .omit({ diagnosis: true })
        .safeParse({
          ...baby,
          birthWeightG: baby.birthWeightG ? Number(baby.birthWeightG) : null,
          sexo: baby.sexo ?? undefined,
          birthDate: baby.birthDate ?? '',
        });
      if (!r.success) {
        const e: Record<string, string> = {};
        r.error.issues.forEach((i) => (e[String(i.path[0])] = i.message));
        setErrors(e);
        return;
      }
    }

    if (step === 'diagnosis' && !diagnosis) {
      setErrors({ diagnosis: 'Escolha uma opção — "ainda sem diagnóstico" também vale.' });
      return;
    }

    go(next);
  };

  // Validação do código em "tempo real": 6 caracteres → consulta.
  const checkInvite = async (code: string) => {
    setInvite(code);
    setLinked(null);
    if (code.trim().length !== 6) return;

    setChecking(true);
    await new Promise((r) => setTimeout(r, 550));
    setChecking(false);

    if (code.trim().toUpperCase() === DEMO_PROFESSIONAL.inviteCode) {
      setLinked(DEMO_PROFESSIONAL);
      setErrors({});
    } else {
      setErrors({ invite: 'Não encontramos esse código. Confira com seu profissional.' });
    }
  };

  const finish = () => {
    completeOnboarding({
      user: { name: guardian.name, email: guardian.email },
      baby: {
        name: baby.name,
        sexo: baby.sexo!,
        birthDate: baby.birthDate!,
        birthWeightG: baby.birthWeightG ? Number(baby.birthWeightG) : null,
        premature: baby.premature,
        multiplePregnancy: baby.multiplePregnancy,
        diagnosis: diagnosis!,
        profilePhotoUrl: null,
      },
      professional: linked,
      weekday: reminder.weekday,
      time: reminder.time,
    });
    navigate('/', { replace: true });
  };

  const canAdvance = useMemo(() => {
    if (step === 'consent') return consent;
    if (step === 'baby') return !!baby.name && !!baby.sexo && !!baby.birthDate;
    if (step === 'diagnosis') return !!diagnosis;
    return true;
  }, [step, consent, baby, diagnosis]);

  return (
    <div className="min-h-dvh flex flex-col bg-canvas">
      <header className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-3 h-9">
          {index > 0 && (
            <button
              onClick={back}
              aria-label="Voltar"
              className="p-1.5 -ml-1.5 rounded-pill text-muted hover:bg-raised hover:text-ink transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <ProgressBar value={index + 1} max={STEPS.length} className="flex-1" />
          <span className="text-12 text-muted tabular-nums shrink-0">
            {index + 1}/{STEPS.length}
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col px-5 pb-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -24 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col"
          >
            {step === 'welcome' && (
              <StepShell
                art={<WelcomeArt />}
                title="O acompanhamento da cabecinha do seu bebê ficou muito mais simples"
                subtitle="Uma foto por semana. A gente cuida de organizar a evolução e deixar tudo pronto para você mostrar ao profissional."
              >
                <Disclaimer
                  level="strong"
                  text="O SimetriApp é uma ferramenta de acompanhamento visual complementar. Ele não faz diagnóstico e não substitui a avaliação do profissional que acompanha o seu bebê."
                />
              </StepShell>
            )}

            {step === 'how' && (
              <StepShell
                art={<HowItWorksArt />}
                title="Funciona em três passos"
                subtitle="Toda semana, no dia que você escolher."
              >
                <div className="space-y-3">
                  <HowRow n={1} title="Você tira a foto" body="Uma foto do alto da cabeça, com um guia na tela ajudando no enquadramento." />
                  <HowRow n={2} title="Você confere os pontos" body="O app sugere onde ficam os 4 pontos de referência. Você arrasta e ajusta — é o seu olho que decide, não o do app." />
                  <HowRow n={3} title="A curva se desenha" body="A partir da segunda foto, você começa a ver a evolução tomando forma." />
                </div>
              </StepShell>
            )}

            {step === 'consent' && (
              <StepShell
                title="Sobre as fotos do seu bebê"
                subtitle="Sem juridiquês. Só o que importa."
              >
                <div className="space-y-3">
                  <ConsentRow
                    title="Onde as fotos ficam"
                    body="Guardadas criptografadas, num servidor privado. Elas nunca ficam com endereço público e não aparecem em busca do Google — nem por acidente."
                  />
                  <ConsentRow
                    title="Quem consegue ver"
                    body="Você. E o profissional, se você usar o código de convite dele. Mais ninguém."
                  />
                  <ConsentRow
                    title="Por quanto tempo"
                    body="Enquanto você quiser. Se apagar a conta, tudo vai junto de verdade — fotos, medidas, histórico. Não fica cópia."
                  />
                  <ConsentRow
                    title="Para que usamos"
                    body="Só para montar a sua linha do tempo. Não vendemos, não compartilhamos e não treinamos nada com as fotos do seu bebê."
                  />
                </div>

                <label
                  className={cn(
                    'mt-5 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                    consent
                      ? 'border-sage/50 bg-sage-soft'
                      : 'border-line bg-surface hover:bg-raised',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 grid place-items-center w-5 h-5 rounded-[6px] border-2 shrink-0 transition-colors',
                      consent ? 'bg-sage border-sage' : 'border-line bg-surface',
                    )}
                  >
                    <AnimatePresence>
                      {consent && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Check size={13} className="text-white" strokeWidth={3.5} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  {/* Nunca pré-marcado. É a diferença entre consentimento e
                      formalidade — e a LGPD sabe a diferença. */}
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-14 text-ink leading-relaxed">
                    Li e concordo. Autorizo o SimetriApp a guardar as fotos e os dados do meu bebê
                    para montar o acompanhamento.
                  </span>
                </label>
              </StepShell>
            )}

            {step === 'guardian' && (
              <StepShell title="Primeiro, sobre você" subtitle="Para guardar o acompanhamento com segurança.">
                <div className="space-y-4">
                  <Field
                    label="Seu nome"
                    placeholder="Como podemos te chamar?"
                    value={guardian.name}
                    onChange={(e) => setGuardian({ ...guardian, name: e.target.value })}
                    error={errors.name}
                    autoComplete="name"
                  />
                  <Field
                    label="E-mail"
                    type="email"
                    placeholder="voce@email.com"
                    value={guardian.email}
                    onChange={(e) => setGuardian({ ...guardian, email: e.target.value })}
                    error={errors.email}
                    autoComplete="email"
                  />
                  <Field
                    label="Senha"
                    type="password"
                    placeholder="Pelo menos 8 caracteres"
                    value={guardian.password}
                    onChange={(e) => setGuardian({ ...guardian, password: e.target.value })}
                    error={errors.password}
                    autoComplete="new-password"
                  />

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-line" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-canvas px-3 text-12 text-muted">ou</span>
                    </div>
                  </div>

                  <Button variant="secondary" fullWidth size="lg" type="button">
                    <GoogleMark />
                    Continuar com Google
                  </Button>
                </div>
              </StepShell>
            )}

            {step === 'baby' && (
              <StepShell title="Agora, sobre o bebê" subtitle="Isso ajuda a liberar o conteúdo certo para a fase dele.">
                <div className="space-y-4">
                  <Field
                    label="Nome do bebê"
                    placeholder="Como você chama?"
                    value={baby.name}
                    onChange={(e) => setBaby({ ...baby, name: e.target.value })}
                    error={errors.name}
                  />

                  <ChoiceGroup
                    label="Sexo"
                    value={baby.sexo}
                    onChange={(v) => setBaby({ ...baby, sexo: v })}
                    columns={3}
                    options={[
                      { value: 'menino' as const, label: 'Menino' },
                      { value: 'menina' as const, label: 'Menina' },
                      { value: 'nao_informar' as const, label: 'Prefiro não dizer' },
                    ]}
                  />

                  <DatePicker
                    label="Data de nascimento"
                    value={baby.birthDate}
                    onChange={(iso) => setBaby({ ...baby, birthDate: iso })}
                    error={errors.birthDate}
                  />

                  <Field
                    label="Peso ao nascer"
                    type="number"
                    inputMode="numeric"
                    placeholder="3200"
                    hint="Em gramas. Se não lembrar, pode pular."
                    value={baby.birthWeightG}
                    onChange={(e) => setBaby({ ...baby, birthWeightG: e.target.value })}
                    error={errors.birthWeightG}
                    suffix={<span className="text-14 text-muted">g</span>}
                  />

                  <div className="card p-4 space-y-4">
                    <Switch
                      label="Nasceu prematuro"
                      description="Antes de 37 semanas de gestação."
                      checked={baby.premature}
                      onChange={(v) => setBaby({ ...baby, premature: v })}
                    />
                    <div className="h-px bg-line" />
                    <Switch
                      label="Gestação múltipla"
                      description="Gêmeos, trigêmeos."
                      checked={baby.multiplePregnancy}
                      onChange={(v) => setBaby({ ...baby, multiplePregnancy: v })}
                    />
                  </div>
                </div>
              </StepShell>
            )}

            {step === 'diagnosis' && (
              <StepShell
                title="O profissional já falou em algum nome?"
                subtitle="Se ainda não, tudo bem — muita gente chega aqui antes da primeira consulta."
              >
                <ChoiceGroup
                  label=""
                  value={diagnosis}
                  onChange={setDiagnosis}
                  columns={1}
                  options={[
                    {
                      value: 'plagiocefalia' as const,
                      label: 'Plagiocefalia',
                      description: 'Achatamento de um dos lados, cabeça assimétrica.',
                    },
                    {
                      value: 'braquicefalia' as const,
                      label: 'Braquicefalia',
                      description: 'Achatamento na parte de trás, cabeça mais larga.',
                    },
                    {
                      value: 'sem_diagnostico' as const,
                      label: 'Ainda sem diagnóstico',
                      description: 'Estou acompanhando por conta ou aguardando avaliação.',
                    },
                  ]}
                />
                {errors.diagnosis && (
                  <p className="mt-2 text-12 text-terra-ink">{errors.diagnosis}</p>
                )}

                <Disclaimer
                  className="mt-5"
                  level="block"
                  text="Isto é só para personalizar o conteúdo que você vai ver. O app não confirma, não descarta e não altera nenhum diagnóstico — quem faz isso é o profissional."
                />
              </StepShell>
            )}

            {step === 'invite' && (
              <StepShell
                title="Você tem um código do profissional?"
                subtitle="Com ele, quem acompanha o seu bebê vê a evolução das fotos direto no painel dela. É opcional."
              >
                <Field
                  label="Código de convite"
                  placeholder="Ex.: P2S001"
                  value={invite}
                  onChange={(e) => checkInvite(e.target.value.toUpperCase().slice(0, 6))}
                  error={linked ? null : errors.invite}
                  valid={!!linked}
                  maxLength={6}
                  className="uppercase tracking-[0.2em] font-medium"
                  suffix={checking ? <Loader2 size={16} className="animate-spin text-muted" /> : undefined}
                  hint="No modo demo, use P2S001."
                />

                <AnimatePresence>
                  {linked && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-4"
                    >
                      <Card tone="sage" className="flex items-center gap-3">
                        <span className="grid place-items-center w-10 h-10 rounded-pill bg-sage/20 shrink-0">
                          <ShieldCheck size={18} className="text-sage-ink" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-14 font-medium text-sage-ink">
                            Vinculado a {linked.name}
                          </p>
                          <p className="text-12 text-sage-ink/75 truncate">{linked.clinicName}</p>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </StepShell>
            )}

            {step === 'reminder' && (
              <StepShell
                title="Quando devo te lembrar?"
                subtitle="Um toque por semana, no dia e horário que funcionar para vocês. Dá para mudar depois."
              >
                <div className="space-y-5">
                  <div>
                    <p className="text-14 font-medium text-ink mb-2">Dia da semana</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEKDAYS.map((d, i) => (
                        <motion.button
                          key={d}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setReminder({ ...reminder, weekday: i })}
                          aria-pressed={reminder.weekday === i}
                          aria-label={d}
                          className={cn(
                            'aspect-square rounded-lg text-14 font-medium transition-colors duration-200',
                            reminder.weekday === i
                              ? 'bg-amber text-white shadow-rest'
                              : 'bg-surface border border-line text-muted hover:bg-raised',
                          )}
                        >
                          {d[0]}
                        </motion.button>
                      ))}
                    </div>
                    <p className="mt-2 text-12 text-muted">
                      Escolhido: {WEEKDAYS[reminder.weekday]}
                    </p>
                  </div>

                  <Field
                    label="Horário"
                    type="time"
                    value={reminder.time}
                    onChange={(e) => setReminder({ ...reminder, time: e.target.value })}
                    hint="Escolha um horário em que o bebê costuma estar acordado e calmo."
                  />
                </div>
              </StepShell>
            )}

            {step === 'journey' && (
              <StepShell
                title={`A jornada de ${baby.name || 'vocês'} começa aqui`}
                subtitle="É mais ou menos assim que a curva vai se formar, uma foto por semana. Esta é uma prévia ilustrativa — a sua vai ser a de verdade."
              >
                <Card elevation="lift" className="overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-amber" />
                    <p className="text-12 font-medium uppercase tracking-[0.08em] text-muted">
                      Prévia ilustrativa
                    </p>
                  </div>
                  <SymmetryChart
                    points={PREVIEW.map((v, i) => ({
                      weekNumber: i + 1,
                      asymmetryIndex: v,
                      takenAt: new Date().toISOString(),
                    }))}
                  />
                </Card>

                <Disclaimer className="mt-4" level="block" />
              </StepShell>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="pt-6">
          {step === 'journey' ? (
            <Button size="lg" fullWidth onClick={finish}>
              Começar o acompanhamento
              <ArrowRight size={18} />
            </Button>
          ) : (
            <>
              <Button size="lg" fullWidth disabled={!canAdvance} onClick={validateAndAdvance}>
                {step === 'welcome' ? 'Começar' : 'Continuar'}
                <ArrowRight size={18} />
              </Button>
              {step === 'invite' && (
                <button
                  onClick={() => go('reminder')}
                  className="w-full mt-3 py-2 text-14 text-muted hover:text-ink transition-colors"
                >
                  Não tenho código, pular
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Curva da prévia: cai, mas com um solavanco. Prometer linha reta é mentira. */
const PREVIEW = [9.2, 8.5, 7.9, 7.4, 7.6, 6.5, 5.8, 5.4, 4.6, 4.2, 3.9, 3.4];

function StepShell({
  art,
  title,
  subtitle,
  children,
}: {
  art?: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col">
      {art && <div className="max-w-[240px] w-full mx-auto mb-6 mt-2">{art}</div>}
      <h1 className="text-32 mb-2.5 text-balance">{title}</h1>
      {subtitle && <p className="text-16 text-muted leading-relaxed mb-6">{subtitle}</p>}
      <div className="flex-1">{children}</div>
    </div>
  );
}

function HowRow({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-3.5">
      <span className="grid place-items-center w-7 h-7 shrink-0 rounded-pill bg-amber-soft text-12 font-medium text-amber-ink">
        {n}
      </span>
      <div>
        <p className="text-14 font-medium text-ink">{title}</p>
        <p className="text-14 text-muted leading-relaxed mt-0.5">{body}</p>
      </div>
    </div>
  );
}

function ConsentRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg bg-surface border border-line/70 p-4">
      <p className="text-14 font-medium text-ink mb-1">{title}</p>
      <p className="text-14 text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.6-.2-2.3H12v4.5h6c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.4-5 3.4-8.4z" />
      <path fill="#34A853" d="M12 23c3.1 0 5.7-1 7.6-2.8l-3.7-2.8c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3c1.9 3.7 5.7 6.2 10.2 6.2z" />
      <path fill="#FBBC05" d="M5.6 13.8c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2v-3H1.8C1 8 .6 9.7.6 11.6s.4 3.6 1.2 5.2l3.8-3z" />
      <path fill="#EA4335" d="M12 4.7c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.5 0 3.7 2.5 1.8 6.2l3.8 3c.9-2.7 3.4-4.5 6.4-4.5z" />
    </svg>
  );
}
