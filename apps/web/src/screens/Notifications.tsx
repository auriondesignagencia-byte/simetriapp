import { ArrowLeft, Award, Bell, BellOff, Camera, Heart, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDateBR, type AppNotification } from '@simetriapp/shared';
import { Card } from '@/components/ui/Card';
import { useApp } from '@/store/app';
import { cn } from '@/lib/cn';

const ICONS: Record<AppNotification['type'], typeof Bell> = {
  lembrete_semanal: Camera,
  saudade: Heart,
  marco: Award,
  sistema: Info,
};

const TONES: Record<AppNotification['type'], 'amber' | 'terra' | 'sage' | 'sky'> = {
  lembrete_semanal: 'amber',
  saudade: 'terra',
  marco: 'sage',
  sistema: 'sky',
};

/** "há 2 dias" — o horário exato de uma notificação nunca importou para ninguém. */
function relative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `Há ${days} dias`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `Há ${w} semana${w === 1 ? '' : 's'}`;
  }
  return formatDateBR(iso);
}

export function Notifications() {
  const navigate = useNavigate();
  const { state, markNotificationRead } = useApp();

  const notifications = [...state.notifications].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );

  return (
    <div className="px-5 pt-4 space-y-5">
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="p-2 -ml-2 rounded-pill text-muted hover:bg-raised hover:text-ink transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-20">Notificações</h1>
      </header>

      {notifications.length === 0 ? (
        <Card className="text-center py-10">
          <span className="grid place-items-center w-12 h-12 rounded-pill bg-raised text-muted mx-auto mb-4">
            <BellOff size={18} />
          </span>
          <p className="text-14 text-muted leading-relaxed max-w-[26ch] mx-auto">
            Nada por aqui. O lembrete semanal chega no dia e horário que você escolheu.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const Icon = ICONS[n.type];
            const tone = TONES[n.type];
            const unread = !n.readAt;

            return (
              <li key={n.id}>
                <Card
                  interactive
                  onClick={() => {
                    markNotificationRead(n.id);
                    if (n.type === 'lembrete_semanal' || n.type === 'saudade') navigate('/captura');
                  }}
                  tone={unread ? tone : 'plain'}
                  className="flex items-start gap-3"
                >
                  <span
                    className={cn(
                      'grid place-items-center w-9 h-9 rounded-pill shrink-0',
                      tone === 'amber' && 'bg-amber/20 text-amber-ink',
                      tone === 'sage' && 'bg-sage/20 text-sage-ink',
                      tone === 'terra' && 'bg-terra/20 text-terra-ink',
                      tone === 'sky' && 'bg-sky/25 text-sky-ink',
                      !unread && 'bg-raised text-muted',
                    )}
                  >
                    <Icon size={16} />
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className={cn(
                          'text-14 leading-snug',
                          unread ? 'font-medium text-ink' : 'text-muted',
                        )}
                      >
                        {n.title}
                      </p>
                      {unread && (
                        <span className="w-2 h-2 rounded-pill bg-amber shrink-0 mt-1.5" aria-label="Não lida" />
                      )}
                    </div>
                    <p className="text-14 text-muted leading-relaxed mt-1">{n.body}</p>
                    <p className="text-12 text-muted/80 mt-2">{relative(n.sentAt)}</p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
