import { useState } from 'react';
import {
  ChevronRight,
  Crown,
  FileText,
  Moon,
  RotateCcw,
  Stethoscope,
  Sun,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  babyAge,
  DIAGNOSTICO_LABELS,
  formatDateBR,
  WEEKDAYS,
  type SubscriptionStatus,
} from '@simetriapp/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { DEMO_MODE, useApp } from '@/store/app';
import { useTheme } from '@/store/theme';
import { cn } from '@/lib/cn';

const STATUS_COPY: Record<SubscriptionStatus, { label: string; tone: 'sage' | 'amber' | 'terra' | 'neutral' }> = {
  trialing: { label: 'Período de teste', tone: 'amber' },
  active: { label: 'Premium ativo', tone: 'sage' },
  past_due: { label: 'Pagamento pendente', tone: 'terra' },
  canceled: { label: 'Cancelado', tone: 'neutral' },
  expired: { label: 'Teste encerrado', tone: 'terra' },
  free: { label: 'Gratuito', tone: 'neutral' },
};

export function Profile() {
  const navigate = useNavigate();
  const { state, derived, updateNotificationPrefs, setSubscription, resetToDemo, wipeEverything, simulateTrialExpiry } =
    useApp();
  const { theme, toggle } = useTheme();

  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { user, baby, professional, subscription } = state;
  if (!user || !baby) return null;

  const age = babyAge(baby.birthDate);
  const prefs = user.notificationPreferences;
  const status = subscription?.status ?? 'free';
  const statusCopy = STATUS_COPY[status];

  return (
    <div className="px-5 pt-6 space-y-5">
      <h1 className="text-24">Perfil</h1>

      <Card elevation="lift" className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-pill overflow-hidden bg-raised shrink-0 ring-1 ring-line">
          {baby.profilePhotoUrl ? (
            <img src={baby.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="grid place-items-center w-full h-full font-display text-24 text-muted">
              {baby.name[0]}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-20 truncate">{baby.name}</h2>
          <p className="text-12 text-muted mt-0.5">
            {age.label} · nasceu em {formatDateBR(baby.birthDate)}
          </p>
          <Badge tone="sky" className="mt-2">
            {DIAGNOSTICO_LABELS[baby.diagnosis]}
          </Badge>
        </div>
      </Card>

      {/* Assinatura ------------------------------------------------------- */}
      <Card tone={derived.hasAccess ? 'plain' : 'amber'}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardLabel>Assinatura</CardLabel>
            <p className="text-16 font-medium text-ink mt-1">{statusCopy.label}</p>
          </div>
          <Badge tone={statusCopy.tone}>
            <Crown size={12} />
            {subscription?.plan === 'premium' ? 'Premium' : 'Free'}
          </Badge>
        </div>

        {status === 'trialing' && derived.trialDaysLeft !== null && (
          <p className="text-14 text-muted mt-2 leading-relaxed">
            {derived.trialDaysLeft === 0
              ? 'Seu teste termina hoje. Nenhuma cobrança acontece sem você autorizar.'
              : `Faltam ${derived.trialDaysLeft} dia${derived.trialDaysLeft === 1 ? '' : 's'} de teste. Não pedimos cartão para começar.`}
          </p>
        )}

        {status === 'active' && subscription?.currentPeriodEnd && (
          <p className="text-14 text-muted mt-2 leading-relaxed">
            {subscription.cancelAtPeriodEnd
              ? `Acesso garantido até ${formatDateBR(subscription.currentPeriodEnd)}. Depois disso, a assinatura não renova.`
              : `Próxima renovação em ${formatDateBR(subscription.currentPeriodEnd)}.`}
          </p>
        )}

        {!derived.hasAccess && (
          <p className="text-14 text-amber-ink/80 mt-2 leading-relaxed">
            Suas fotos e sua curva continuam salvas. Reative quando quiser.
          </p>
        )}

        <div className="flex gap-2 mt-4">
          {derived.hasAccess ? (
            subscription?.cancelAtPeriodEnd ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSubscription({ cancelAtPeriodEnd: false })}
              >
                Voltar a renovar
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
                Cancelar assinatura
              </Button>
            )
          ) : (
            <Button size="sm" onClick={() => navigate('/paywall?from=perfil')}>
              Ver o Premium
            </Button>
          )}
        </div>
      </Card>

      {/* Profissional ----------------------------------------------------- */}
      <Card>
        <CardLabel>Profissional</CardLabel>
        {professional ? (
          <div className="flex items-center gap-3 mt-3">
            <span className="grid place-items-center w-10 h-10 rounded-pill bg-sage-soft text-sage-ink shrink-0">
              <Stethoscope size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-14 font-medium text-ink truncate">{professional.name}</p>
              <p className="text-12 text-muted truncate">{professional.clinicName}</p>
            </div>
          </div>
        ) : (
          <p className="text-14 text-muted mt-2 leading-relaxed">
            Nenhum profissional vinculado. Peça o código de convite na sua próxima consulta.
          </p>
        )}
        <p className="text-12 text-muted leading-relaxed mt-3">
          {professional
            ? `${professional.name} vê a evolução do índice e as datas das fotos. Suas anotações pessoais e seus dados de conta não aparecem no painel dela.`
            : 'Sem vínculo, ninguém além de você acessa os registros do bebê.'}
        </p>
      </Card>

      {/* Lembretes -------------------------------------------------------- */}
      <Card className="space-y-4">
        <div>
          <CardLabel>Lembrete semanal</CardLabel>
          <p className="text-12 text-muted mt-1 leading-relaxed">
            Um toque por semana, no dia que funciona para você. Não mandamos mais que isso.
          </p>
        </div>

        <div>
          <div className="flex gap-1.5" role="group" aria-label="Dia da semana">
            {WEEKDAYS.map((day, i) => {
              const active = prefs.weekday === i;
              return (
                <button
                  key={day}
                  onClick={() => updateNotificationPrefs({ weekday: i })}
                  aria-pressed={active}
                  aria-label={day}
                  className={cn(
                    'flex-1 h-10 rounded-lg text-12 font-medium transition-colors duration-200',
                    active
                      ? 'bg-amber text-white shadow-rest'
                      : 'bg-raised text-muted hover:text-ink',
                  )}
                >
                  {day[0]}
                </button>
              );
            })}
          </div>
          <p className="text-12 text-muted mt-2">
            Toda {WEEKDAYS[prefs.weekday].toLowerCase()}, às{' '}
            <input
              type="time"
              value={prefs.time}
              onChange={(e) => updateNotificationPrefs({ time: e.target.value })}
              aria-label="Horário do lembrete"
              className="bg-raised rounded-lg px-2 py-1 text-12 text-ink border border-line/70 tabular-nums"
            />
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <Switch
            checked={prefs.pushEnabled}
            onChange={(v) => updateNotificationPrefs({ pushEnabled: v })}
            label="Notificação no celular"
          />
          <Switch
            checked={prefs.emailEnabled}
            onChange={(v) => updateNotificationPrefs({ emailEnabled: v })}
            label="E-mail"
            description={user.email}
          />
        </div>
      </Card>

      {/* Atalhos ---------------------------------------------------------- */}
      <div className="space-y-2">
        <Card
          interactive
          onClick={() => navigate(derived.hasAccess ? '/relatorio' : '/paywall?from=relatorio')}
          className="flex items-center gap-3 !py-4"
        >
          <FileText size={17} className="text-muted shrink-0" />
          <span className="flex-1 text-14 text-ink">Relatório para o profissional</span>
          <ChevronRight size={17} className="text-muted shrink-0" />
        </Card>

        <Card interactive onClick={toggle} className="flex items-center gap-3 !py-4">
          {theme === 'dark' ? (
            <Sun size={17} className="text-muted shrink-0" />
          ) : (
            <Moon size={17} className="text-muted shrink-0" />
          )}
          <span className="flex-1 text-14 text-ink">
            Tema {theme === 'dark' ? 'claro' : 'escuro'}
          </span>
          <ChevronRight size={17} className="text-muted shrink-0" />
        </Card>

        <Card
          interactive
          onClick={() => navigate('/profissional')}
          className="flex items-center gap-3 !py-4"
        >
          <Stethoscope size={17} className="text-muted shrink-0" />
          <span className="flex-1 text-14 text-ink">Sou profissional — abrir painel</span>
          <ChevronRight size={17} className="text-muted shrink-0" />
        </Card>
      </div>

      {/* Dados ------------------------------------------------------------ */}
      <Card>
        <CardLabel>Seus dados</CardLabel>
        <p className="text-14 text-muted leading-relaxed mt-2">
          As fotos do seu bebê são suas. Apagar a conta remove tudo de verdade — fotos, curva e
          anotações — inclusive do painel do profissional. Não é reversível e não guardamos cópia.
        </p>
        <Button variant="danger" size="sm" className="mt-4" onClick={() => setConfirmWipe(true)}>
          <Trash2 size={15} />
          Apagar meus dados
        </Button>
      </Card>

      {/* Controles de demo. Existem para a apresentação do produto, e é por isso
          que ficam atrás da flag — em produção esta seção não é renderizada. */}
      {DEMO_MODE && (
        <Card className="border-dashed">
          <CardLabel>Demonstração</CardLabel>
          <p className="text-12 text-muted leading-relaxed mt-1.5 mb-3">
            Atalhos para mostrar o produto. Não aparecem na versão real.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={resetToDemo}>
              <RotateCcw size={14} />
              Restaurar demo
            </Button>
            <Button variant="secondary" size="sm" onClick={simulateTrialExpiry}>
              <TriangleAlert size={14} />
              Expirar o teste
            </Button>
          </div>
        </Card>
      )}

      <p className="text-12 text-muted text-center pt-1 pb-2">Simetriapp · versão 0.1.0</p>

      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancelar assinatura?">
        <div className="space-y-4 pb-3">
          <p className="text-14 text-muted leading-relaxed">
            Você continua com acesso completo até o fim do período já pago — não cortamos nada no
            meio. Depois disso, suas fotos e sua curva ficam guardadas, só o acesso a elas pausa.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setConfirmCancel(false)}>
              Manter
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                setSubscription({ cancelAtPeriodEnd: true });
                setConfirmCancel(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={confirmWipe} onClose={() => setConfirmWipe(false)} title="Apagar tudo?">
        <div className="space-y-4 pb-3">
          <p className="text-14 text-muted leading-relaxed">
            Isto apaga <strong className="text-ink font-medium">todas as fotos do {baby.name}</strong>,
            a curva de {state.entries.length} registro{state.entries.length === 1 ? '' : 's'} e suas
            anotações. Não dá para desfazer.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setConfirmWipe(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                wipeEverything();
                setConfirmWipe(false);
                navigate('/onboarding', { replace: true });
              }}
            >
              <Trash2 size={15} />
              Apagar
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
