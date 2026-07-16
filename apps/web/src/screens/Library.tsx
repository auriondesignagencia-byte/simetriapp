import { useEffect } from 'react';
import { BookOpen, Check, Clock, Lock, Play, ShieldAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { babyAge, type ContentItem } from '@simetriapp/shared';
import { Card, CardLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Sheet } from '@/components/ui/Sheet';
import { useApp } from '@/store/app';
import { cn } from '@/lib/cn';

const ACCENT: Record<string, 'sage' | 'sky' | 'amber' | 'terra'> = {
  sage: 'sage',
  sky: 'sky',
  amber: 'amber',
  terra: 'terra',
};

function durationLabel(sec: number | null): string {
  if (!sec) return 'Leitura de 2 min';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Library() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state, derived, markContentViewed } = useApp();

  const baby = state.baby;
  const age = baby ? babyAge(baby.birthDate) : null;

  const open = id ? state.content.find((c) => c.id === id) ?? null : null;

  // Marcar como visto ao ABRIR, não ao chegar no fim: o app não tem como saber
  // se a mãe leu até o final, e fingir que sabe estragaria a métrica.
  useEffect(() => {
    if (open && derived.hasAccess) markContentViewed(open.id);
  }, [open, derived.hasAccess, markContentViewed]);

  const isViewed = (c: ContentItem) => state.progress.some((p) => p.contentItemId === c.id);
  const isUnlockedByAge = (c: ContentItem) =>
    !age || (age.months >= c.ageRangeMin && age.months <= c.ageRangeMax);

  const openItem = (c: ContentItem) => {
    if (!derived.hasAccess) {
      navigate('/paywall?from=biblioteca');
      return;
    }
    navigate(`/biblioteca/${c.id}`);
  };

  const available = state.content.filter(isUnlockedByAge);
  const upcoming = state.content.filter((c) => !isUnlockedByAge(c));
  const viewedCount = available.filter(isViewed).length;

  return (
    <div className="px-5 pt-6 space-y-5">
      <header>
        <h1 className="text-24">Conteúdo</h1>
        <p className="text-12 text-muted mt-0.5">
          {age ? `Selecionado para ${age.label}` : 'Selecionado para a idade do bebê'} ·{' '}
          {viewedCount}/{available.length} visto{viewedCount === 1 ? '' : 's'}
        </p>
      </header>

      <ul className="space-y-3">
        {available.map((c) => {
          const tone = ACCENT[c.accent] ?? 'sky';
          const viewed = isViewed(c);

          return (
            <li key={c.id}>
              <Card interactive onClick={() => openItem(c)} className="flex items-start gap-4">
                <span
                  className={cn(
                    'grid place-items-center w-11 h-11 rounded-lg shrink-0',
                    tone === 'sage' && 'bg-sage-soft text-sage-ink',
                    tone === 'sky' && 'bg-sky-soft text-sky-ink',
                    tone === 'amber' && 'bg-amber-soft text-amber-ink',
                    tone === 'terra' && 'bg-terra-soft text-terra-ink',
                  )}
                >
                  {!derived.hasAccess ? (
                    <Lock size={17} />
                  ) : c.type === 'video' ? (
                    <Play size={17} />
                  ) : (
                    <BookOpen size={17} />
                  )}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-12 text-muted inline-flex items-center gap-1">
                      <Clock size={11} />
                      {durationLabel(c.durationSec)}
                    </span>
                    {viewed && (
                      <span className="text-12 text-sage-ink inline-flex items-center gap-1">
                        <Check size={12} />
                        Visto
                      </span>
                    )}
                  </div>

                  <h2 className="text-16 font-display font-medium text-ink leading-snug">
                    {c.title}
                  </h2>
                  <p className="text-14 text-muted leading-relaxed mt-1.5">{c.summary}</p>

                  {/* A tag "só profissional" existe para impedir que um conteúdo
                      de identificação vire tutorial de tratamento caseiro. */}
                  {c.tag === 'so_profissional' && (
                    <Badge tone="terra" icon={<ShieldAlert size={12} />} className="mt-3">
                      Converse com o profissional
                    </Badge>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {upcoming.length > 0 && (
        <section className="space-y-2 pt-2">
          <CardLabel className="px-1">Libera mais para frente</CardLabel>
          <ul className="space-y-2">
            {upcoming.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-card border border-line/60 bg-raised/50 px-4 py-3"
              >
                <Lock size={15} className="text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-14 text-muted leading-snug line-clamp-1">{c.title}</p>
                  <p className="text-12 text-muted/80 mt-0.5">
                    A partir dos {c.ageRangeMin} {c.ageRangeMin === 1 ? 'mês' : 'meses'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Disclaimer
        level="block"
        text="O conteúdo aqui é educativo e vale para acompanhamento posicional em geral. Ele não substitui o plano que o profissional montou para o seu bebê."
      />

      <Sheet open={!!open} onClose={() => navigate('/biblioteca')} title={open?.title}>
        {open && (
          <article className="space-y-4 pb-4">
            <div className="flex items-center gap-2">
              <Badge tone="neutral" icon={open.type === 'video' ? <Play size={12} /> : <BookOpen size={12} />}>
                {open.type === 'video' ? 'Vídeo' : 'Artigo'}
              </Badge>
              <Badge tone="neutral" icon={<Clock size={12} />}>
                {durationLabel(open.durationSec)}
              </Badge>
              {open.tag === 'so_profissional' && (
                <Badge tone="terra" icon={<ShieldAlert size={12} />}>
                  Só com profissional
                </Badge>
              )}
            </div>

            <p className="text-16 text-muted leading-relaxed">{open.summary}</p>

            {open.type === 'video' && (
              <>
                {/* Sem arquivo de vídeo no MVP. Em vez de um player quebrado, o
                    app entrega a TRANSCRIÇÃO — que é acessível, funciona sem
                    banda e pode ser lida com o bebê dormindo no colo. */}
                <div className="rounded-lg bg-raised border border-line/70 aspect-video grid place-items-center">
                  <div className="text-center px-6">
                    <span className="grid place-items-center w-12 h-12 rounded-pill bg-surface shadow-rest mx-auto mb-3">
                      <Play size={18} className="text-muted ml-0.5" />
                    </span>
                    <p className="text-12 text-muted leading-relaxed">
                      A gravação entra na próxima versão. Abaixo, o conteúdo completo em texto.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <CardLabel>Transcrição</CardLabel>
                  {open.transcript.split('\n\n').map((p, i) => (
                    <p key={i} className="text-16 text-ink leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              </>
            )}

            {open.type === 'article' && open.body && (
              <div className="space-y-3">
                {open.body.split('\n\n').map((p, i) => (
                  <p
                    key={i}
                    className="text-16 text-ink leading-relaxed"
                    dangerouslySetInnerHTML={{
                      // Único markdown suportado: **negrito**. O corpo vem do
                      // catálogo em código, nunca de input de usuário.
                      __html: p.replace(/\*\*(.+?)\*\*/g, '<strong class="font-medium">$1</strong>'),
                    }}
                  />
                ))}
              </div>
            )}

            {open.tag === 'so_profissional' ? (
              <Disclaimer
                level="strong"
                text="Este conteúdo é para você reconhecer e relatar, não para tratar em casa. Alongamentos e manobras só sob orientação do seu profissional."
              />
            ) : (
              <Disclaimer level="block" />
            )}
          </article>
        )}
      </Sheet>
    </div>
  );
}
