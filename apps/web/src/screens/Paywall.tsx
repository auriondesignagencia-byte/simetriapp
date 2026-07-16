import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, FileText, Sparkles, Stethoscope, TrendingDown, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { useApp } from '@/store/app';
import { cn } from '@/lib/cn';

type Plan = 'mensal' | 'anual';

const PRICES = {
  mensal: { price: 'R$ 29,90', period: '/mês', note: 'Cancele quando quiser.' },
  anual: { price: 'R$ 249', period: '/ano', note: 'Equivale a R$ 20,75 por mês.' },
} as const;

const BENEFITS = [
  {
    icon: Camera,
    title: 'Foto semanal com os pontos de referência',
    body: 'O ghost da semana anterior aparece na captura, para o ângulo não mudar entre as fotos.',
  },
  {
    icon: TrendingDown,
    title: 'Curva completa e leitura de tendência',
    body: 'Todo o histórico, sem corte nas últimas semanas.',
  },
  {
    icon: FileText,
    title: 'Relatório para levar na consulta',
    body: 'Uma página com a curva e as datas, pronta para imprimir ou mostrar na tela.',
  },
  {
    icon: Stethoscope,
    title: 'Vínculo com o profissional',
    body: 'A fisioterapeuta acompanha a evolução entre uma consulta e outra.',
  },
];

/** De onde o usuário veio muda a primeira frase. Um paywall que ignora o
 *  contexto é um paywall que interrompe; este responde ao que a pessoa tentou. */
const FROM_COPY: Record<string, string> = {
  captura: 'A foto desta semana continua esperando por você.',
  evolucao: 'Sua curva tem todo o histórico guardado — ela só está esperando.',
  relatorio: 'O relatório da consulta sai em um toque, assim que o acesso voltar.',
  biblioteca: 'O conteúdo desta semana está pronto para você.',
  perfil: '',
};

export function Paywall() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state, derived, setSubscription, track } = useApp();

  const [plan, setPlan] = useState<Plan>('anual');
  const [loading, setLoading] = useState(false);

  const from = params.get('from') ?? 'perfil';
  const baby = state.baby;
  const expired = state.subscription?.status === 'expired';

  useEffect(() => {
    track('paywall_visto', { from });
  }, [track, from]);

  const subscribe = () => {
    setLoading(true);
    // Sem gateway no MVP: a assinatura é ativada localmente para a demo rodar
    // ponta a ponta. O ponto de troca por Stripe/Pagar.me é exatamente aqui.
    setTimeout(() => {
      const end = new Date();
      end.setDate(end.getDate() + (plan === 'anual' ? 365 : 30));

      setSubscription({
        status: 'active',
        plan: 'premium',
        currentPeriodEnd: end.toISOString(),
        trialEndsAt: null,
        graceEndsAt: null,
        cancelAtPeriodEnd: false,
      });
      track('assinatura_iniciada', { plan });
      setLoading(false);
      navigate(from === 'perfil' ? '/perfil' : `/${from}`, { replace: true });
    }, 900);
  };

  return (
    <div className="min-h-dvh bg-canvas px-5 pt-4 pb-8 flex flex-col">
      <header className="flex justify-end">
        <button
          onClick={() => navigate('/', { replace: true })}
          aria-label="Fechar"
          className="p-2 -mr-2 rounded-pill text-muted hover:bg-raised hover:text-ink transition-colors"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 flex flex-col justify-center py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Badge tone="amber" icon={<Sparkles size={12} />} className="mb-4">
            {expired ? 'Seu teste terminou' : 'Premium'}
          </Badge>

          <h1 className="text-32 leading-tight mb-3">
            {expired
              ? `Continue acompanhando ${baby?.name ?? 'seu bebê'}`
              : `Acompanhe ${baby?.name ?? 'seu bebê'} sem interrupção`}
          </h1>

          <p className="text-16 text-muted leading-relaxed mb-2">
            {expired
              ? `Nada foi apagado. Os ${state.entries.length} registros e a curva continuam guardados, esperando você voltar.`
              : 'Uma foto por semana, do seu jeito, e a evolução aparece sozinha.'}
          </p>

          {FROM_COPY[from] && (
            <p className="text-14 text-amber-ink leading-relaxed mb-6">{FROM_COPY[from]}</p>
          )}

          <ul className="space-y-4 mt-8 mb-8">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.li
                  key={b.title}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                  className="flex items-start gap-3"
                >
                  <span className="grid place-items-center w-9 h-9 rounded-pill bg-amber-soft text-amber-ink shrink-0">
                    <Icon size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-14 font-medium text-ink leading-snug">{b.title}</p>
                    <p className="text-12 text-muted leading-relaxed mt-0.5">{b.body}</p>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {(['anual', 'mensal'] as Plan[]).map((p) => {
              const active = plan === p;
              return (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  aria-pressed={active}
                  className={cn(
                    'relative rounded-card border p-4 text-left transition-all duration-200',
                    active
                      ? 'border-amber bg-amber-soft shadow-lift'
                      : 'border-line bg-surface hover:bg-raised',
                  )}
                >
                  {p === 'anual' && (
                    <span className="absolute -top-2 right-3 rounded-pill bg-sage px-2 py-0.5 text-[10px] font-medium text-white">
                      -30%
                    </span>
                  )}
                  {/* O marcador ocupa o mesmo espaço nos dois estados: trocar de
                      plano não pode mexer no layout do card. */}
                  <p
                    className={cn(
                      'flex items-center gap-2 text-12 font-medium capitalize',
                      active ? 'text-amber-ink' : 'text-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'grid place-items-center w-4 h-4 rounded-pill shrink-0 transition-colors',
                        active ? 'bg-amber text-white' : 'border border-line',
                      )}
                    >
                      {active && <Check size={10} strokeWidth={3} />}
                    </span>
                    {p}
                  </p>
                  <p className="mt-1">
                    <span
                      className={cn(
                        'font-display text-24 tabular-nums',
                        active ? 'text-amber-ink' : 'text-ink',
                      )}
                    >
                      {PRICES[p].price}
                    </span>
                    <span className={cn('text-12', active ? 'text-amber-ink/70' : 'text-muted')}>
                      {PRICES[p].period}
                    </span>
                  </p>
                </button>
              );
            })}
          </div>

          <Button size="lg" fullWidth loading={loading} onClick={subscribe}>
            {loading ? 'Ativando…' : expired ? 'Reativar acesso' : 'Assinar o Premium'}
          </Button>

          <p className="text-12 text-muted text-center mt-3">
            {PRICES[plan].note}
            {derived.trialDaysLeft !== null && derived.trialDaysLeft > 0 && (
              <> Seu teste ainda tem {derived.trialDaysLeft} dia{derived.trialDaysLeft === 1 ? '' : 's'}.</>
            )}
          </p>

          <Disclaimer className="mt-6 justify-center text-center" />
        </motion.div>
      </div>
    </div>
  );
}
