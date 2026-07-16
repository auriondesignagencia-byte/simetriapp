import { motion } from 'framer-motion';
import {
  Bell,
  BookOpen,
  Camera,
  ChevronRight,
  Minus,
  Moon,
  Sun,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { babyAge, DIAGNOSTICO_LABELS, daysBetween } from '@simetriapp/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { SymmetryChart, toChartPoints } from '@/components/SymmetryChart';
import { EmptyCurveArt } from '@/components/Illustration';
import { StreakThread } from '@/components/StreakThread';
import { IntroVideo } from '@/components/IntroVideo';
import { useApp } from '@/store/app';
import { useTheme } from '@/store/theme';
import { cn } from '@/lib/cn';

export function Home() {
  const navigate = useNavigate();
  const { state, derived } = useApp();
  const { theme, toggle } = useTheme();

  const baby = state.baby;
  if (!baby || !state.treatmentStart) return null;

  const age = babyAge(baby.birthDate);
  const daysTracking = Math.max(0, daysBetween(state.treatmentStart, new Date()));
  const { trend, latest, entries } = { ...derived, entries: state.entries };

  const trendIcon =
    trend.direction === 'melhora' ? (
      <TrendingDown size={18} />
    ) : trend.direction === 'atencao' ? (
      <TrendingUp size={18} />
    ) : (
      <Minus size={18} />
    );

  const trendTone =
    trend.direction === 'melhora'
      ? 'sage'
      : trend.direction === 'atencao'
        ? 'terra'
        : 'sky';

  const recommended = derived.availableContent.find(
    (c) => !state.progress.some((p) => p.contentItemId === c.id),
  );

  return (
    <div className="px-5 pt-4 space-y-5">
      <header className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-pill overflow-hidden bg-raised shrink-0 ring-1 ring-line">
          {baby.profilePhotoUrl ? (
            <img src={baby.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="grid place-items-center w-full h-full font-display text-20 text-muted">
              {baby.name[0]}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-20 truncate">{baby.name}</h1>
          <p className="text-12 text-muted">
            {age.label} · {daysTracking} dia{daysTracking === 1 ? '' : 's'} de acompanhamento
          </p>
        </div>

        <button
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          className="p-2 rounded-pill text-muted hover:bg-raised hover:text-ink transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Link
          to="/notificacoes"
          aria-label="Notificações"
          className="relative p-2 rounded-pill text-muted hover:bg-raised hover:text-ink transition-colors"
        >
          <Bell size={18} />
          {derived.unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-pill bg-amber ring-2 ring-canvas" />
          )}
        </Link>
      </header>

      {/* Vídeo do ortopedista: a apresentação do método, no início da jornada. */}
      <IntroVideo />

      {/* Card principal: a única ação que importa nesta tela. */}
      {derived.isPhotoDay ? (
        <Card tone="amber" elevation="lift" className="relative overflow-hidden">
          <motion.span
            className="absolute -right-8 -top-8 w-32 h-32 rounded-pill bg-amber/10"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative">
            <CardLabel className="text-amber-ink/70">Hoje é dia</CardLabel>
            <h2 className="text-24 text-amber-ink mt-1.5 mb-1">
              Vamos registrar a semana {(latest?.weekNumber ?? 0) + 1}?
            </h2>
            <p className="text-14 text-amber-ink/80 leading-relaxed mb-4">
              Leva cerca de um minuto. Se der, escolha um momento em que {baby.name} esteja
              tranquilo.
            </p>
            <Button
              size="lg"
              fullWidth
              onClick={() => navigate(derived.hasAccess ? '/captura' : '/paywall?from=captura')}
            >
              <Camera size={18} />
              Tirar foto de hoje
            </Button>
          </div>
        </Card>
      ) : (
        <Card elevation="lift">
          <CardLabel>Próxima foto</CardLabel>
          <div className="flex items-end gap-2 mt-1.5">
            <span className="font-display text-40 leading-none text-ink tabular-nums">
              {derived.daysUntilPhoto}
            </span>
            <span className="text-16 text-muted pb-1">
              dia{derived.daysUntilPhoto === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-14 text-muted mt-2 leading-relaxed">
            Você está em dia. A próxima foto do {baby.name} entra na semana{' '}
            {(latest?.weekNumber ?? 0) + 1}.
          </p>
        </Card>
      )}

      {/* Tendência: o "número grande" da tela, com o disclaimer colado nele. */}
      {entries.length >= 2 ? (
        <Card tone={trendTone as 'sage' | 'terra' | 'sky'}>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'grid place-items-center w-10 h-10 rounded-pill shrink-0',
                trendTone === 'sage' && 'bg-sage/20 text-sage-ink',
                trendTone === 'terra' && 'bg-terra/20 text-terra-ink',
                trendTone === 'sky' && 'bg-sky/25 text-sky-ink',
              )}
            >
              {trendIcon}
            </span>
            <div className="flex-1 min-w-0">
              <h2
                className={cn(
                  'text-20',
                  trendTone === 'sage' && 'text-sage-ink',
                  trendTone === 'terra' && 'text-terra-ink',
                  trendTone === 'sky' && 'text-sky-ink',
                )}
              >
                {trend.headline}
              </h2>
              <p
                className={cn(
                  'text-14 leading-relaxed mt-1',
                  trendTone === 'sage' && 'text-sage-ink/80',
                  trendTone === 'terra' && 'text-terra-ink/80',
                  trendTone === 'sky' && 'text-sky-ink/80',
                )}
              >
                {trend.detail}
              </p>
            </div>
          </div>
          <Disclaimer className="mt-4" />
        </Card>
      ) : (
        <Card>
          <CardLabel>Sua curva</CardLabel>
          <div className="my-2">
            <EmptyCurveArt />
          </div>
          <p className="text-14 text-muted leading-relaxed text-center">
            {entries.length === 0
              ? 'A primeira foto marca o ponto de partida. A curva aparece a partir da segunda.'
              : 'Um ponto registrado. Na próxima foto, a linha começa a se formar.'}
          </p>
        </Card>
      )}

      {/* Mini gráfico → expande para a tela de evolução. */}
      {entries.length >= 2 && (
        <Card interactive onClick={() => navigate('/evolucao')} className="!p-0 overflow-hidden">
          <div className="p-5 pb-0 flex items-center justify-between">
            <div>
              <CardLabel>Evolução</CardLabel>
              <p className="text-14 text-ink mt-0.5">
                {entries.length} registros · semana {latest?.weekNumber}
              </p>
            </div>
            <Badge tone={derived.hasAccess ? 'neutral' : 'amber'}>
              {derived.hasAccess ? 'Ver tudo' : 'Premium'}
            </Badge>
          </div>
          <div className="px-3 pb-3 pt-2">
            <SymmetryChart
              points={toChartPoints(entries)}
              variant="mini"
              locked={!derived.hasAccess}
            />
          </div>
        </Card>
      )}

      <StreakThread streak={derived.streak} total={entries.length} />

      {recommended && (
        <Card
          interactive
          onClick={() => navigate(`/biblioteca/${recommended.id}`)}
          className="flex items-center gap-4"
        >
          <span className="grid place-items-center w-11 h-11 rounded-lg bg-sky-soft text-sky-ink shrink-0">
            <BookOpen size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <CardLabel>Para esta semana</CardLabel>
            <p className="text-14 font-medium text-ink mt-0.5 line-clamp-2 leading-snug">
              {recommended.title}
            </p>
          </div>
          <ChevronRight size={18} className="text-muted shrink-0" />
        </Card>
      )}

      <p className="text-12 text-muted text-center pt-2 pb-1">
        {DIAGNOSTICO_LABELS[baby.diagnosis]}
        {state.professional ? ` · acompanhado por ${state.professional.name}` : ''}
      </p>
    </div>
  );
}
