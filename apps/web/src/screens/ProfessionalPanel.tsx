import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  CircleAlert,
  LogOut,
  Search,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  bandFor,
  BAND_COPY,
  DIAGNOSTICO_LABELS,
  formatDateBR,
  readTrend,
  type Diagnostico,
  type PatientSummary,
} from '@simetriapp/shared';
import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { Field } from '@/components/ui/Field';
import { SymmetryChart } from '@/components/SymmetryChart';
import { DEMO_OTHER_PATIENTS } from '@/lib/seed';
import { useApp } from '@/store/app';
import { cn } from '@/lib/cn';

const INACTIVE_DAYS = 14;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

/**
 * Aderência = registros feitos sobre semanas DECORRIDAS desde a primeira foto,
 * contadas até hoje — não até a última foto. A diferença importa: medir contra a
 * última foto faz quem abandonou há um mês aparecer com 100%, porque o próprio
 * abandono some da conta. O silêncio recente é justamente o que este painel
 * precisa enxergar.
 */
function adherenceOf(firstPhotoAt: string, registros: number): number {
  const weeksElapsed = Math.floor(daysSince(firstPhotoAt) / 7) + 1;
  if (weeksElapsed <= 0) return 1;
  return Math.min(1, registros / weeksElapsed);
}

export function ProfessionalPanel() {
  const navigate = useNavigate();
  const { state } = useApp();

  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pro = state.professional;

  const patients = useMemo<PatientSummary[]>(() => {
    const list: PatientSummary[] = [];

    // O bebê da própria conta entra no painel — é o que prova o vínculo de ponta
    // a ponta: a foto que a mãe tirou no app aparece aqui, sem passo intermediário.
    if (state.baby && state.entries.length) {
      const entries = [...state.entries]
        .sort((a, b) => a.weekNumber - b.weekNumber)
        .map((e) => ({
          weekNumber: e.weekNumber,
          asymmetryIndex: e.asymmetryIndex,
          takenAt: e.takenAt,
        }));
      const last = entries[entries.length - 1];
      const months = Math.floor(
        (Date.now() - new Date(state.baby.birthDate).getTime()) / (30.44 * 86_400_000),
      );

      list.push({
        babyId: state.baby.id,
        babyName: state.baby.name,
        guardianName: state.user?.name ?? 'Responsável',
        ageMonths: months,
        diagnosis: state.baby.diagnosis,
        entries,
        latestIndex: last.asymmetryIndex,
        lastActivityAt: last.takenAt,
        daysInactive: daysSince(last.takenAt),
        adherence: adherenceOf(entries[0].takenAt, entries.length),
      });
    }

    for (const p of DEMO_OTHER_PATIENTS) {
      const entries = p.series.map((asymmetryIndex, i) => ({
        weekNumber: i + 1,
        asymmetryIndex,
        takenAt: iso(p.daysAgo + (p.series.length - 1 - i) * 7),
      }));
      const last = entries[entries.length - 1];

      list.push({
        babyId: `demo_${p.name}`,
        babyName: p.name,
        guardianName: p.guardian,
        ageMonths: p.months,
        diagnosis: p.diagnosis as Diagnostico,
        entries,
        latestIndex: last.asymmetryIndex,
        lastActivityAt: last.takenAt,
        daysInactive: p.daysAgo,
        adherence: adherenceOf(entries[0].takenAt, entries.length),
      });
    }

    // Quem sumiu vem primeiro. O profissional abre este painel para descobrir de
    // quem ele precisa cobrar — não para admirar quem já está indo bem.
    return list.sort((a, b) => (b.daysInactive ?? 0) - (a.daysInactive ?? 0));
  }, [state.baby, state.entries, state.user]);

  const filtered = patients.filter(
    (p) =>
      p.babyName.toLowerCase().includes(query.toLowerCase()) ||
      p.guardianName.toLowerCase().includes(query.toLowerCase()),
  );

  const selected = patients.find((p) => p.babyId === selectedId) ?? null;
  const inactive = patients.filter((p) => (p.daysInactive ?? 0) >= INACTIVE_DAYS);

  /* Login ------------------------------------------------------------------ */
  if (!authed) {
    return (
      <div className="min-h-dvh bg-canvas grid place-items-center px-5 py-10">
        <div className="w-full max-w-sm">
          <button
            onClick={() => navigate('/perfil')}
            className="text-12 text-muted hover:text-ink inline-flex items-center gap-1.5 mb-6 transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar ao app
          </button>

          <Card elevation="float">
            <span className="grid place-items-center w-11 h-11 rounded-pill bg-sage-soft text-sage-ink mb-4">
              <Stethoscope size={19} />
            </span>
            <h1 className="text-24">Painel do profissional</h1>
            <p className="text-14 text-muted leading-relaxed mt-2 mb-6">
              Acompanhe a evolução dos pacientes entre as consultas. Entre com o código da sua
              clínica.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim().toUpperCase() === (pro?.inviteCode ?? 'P2S001')) {
                  setAuthed(true);
                  setError(null);
                } else {
                  setError('Código não encontrado.');
                }
              }}
            >
              <Field
                label="Código da clínica"
                placeholder="P2S001"
                value={code}
                error={error}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(null);
                }}
              />
              <Button type="submit" fullWidth className="mt-4">
                Entrar
              </Button>
            </form>

            <p className="text-12 text-muted mt-4 text-center">
              Demonstração: use <strong className="text-ink font-medium">{pro?.inviteCode ?? 'P2S001'}</strong>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  /* Detalhe do paciente ----------------------------------------------------- */
  if (selected) {
    const trend = readTrend(selected.entries);
    const band = bandFor(selected.latestIndex ?? 0);

    return (
      <div className="min-h-dvh bg-canvas">
        <PanelHeader proName={pro?.name} onExit={() => setAuthed(false)} />

        <main className="mx-auto max-w-5xl px-6 py-8">
          <button
            onClick={() => setSelectedId(null)}
            className="text-12 text-muted hover:text-ink inline-flex items-center gap-1.5 mb-6 transition-colors"
          >
            <ArrowLeft size={14} />
            Todos os pacientes
          </button>

          <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-32">{selected.babyName}</h1>
              <p className="text-14 text-muted mt-1">
                {selected.ageMonths} meses · responsável: {selected.guardianName} ·{' '}
                {DIAGNOSTICO_LABELS[selected.diagnosis]}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-40 leading-none text-ink tabular-nums">
                {selected.latestIndex?.toFixed(1)}
                <span className="text-16 text-muted ml-1">%</span>
              </p>
              <p className="text-12 text-muted mt-1">{BAND_COPY[band].label}</p>
            </div>
          </header>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2 !p-0 overflow-hidden">
              <div className="px-4 pt-5 pb-2">
                <SymmetryChart
                  points={selected.entries.map((e, i) => ({ ...e, id: `p${i}` }))}
                  variant="full"
                />
              </div>
              <div className="px-5 pb-5">
                <Disclaimer level="block" />
              </div>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardLabel>Tendência</CardLabel>
                <p className="text-16 font-medium text-ink mt-1.5">{trend.headline}</p>
                <p className="text-14 text-muted leading-relaxed mt-1">{trend.detail}</p>
              </Card>

              <Card>
                <CardLabel>Aderência</CardLabel>
                <p className="font-display text-32 text-ink mt-1.5 tabular-nums">
                  {Math.round(selected.adherence * 100)}%
                </p>
                <p className="text-14 text-muted leading-relaxed mt-1">
                  {selected.entries.length} registro{selected.entries.length === 1 ? '' : 's'} nas{' '}
                  {Math.floor(daysSince(selected.entries[0].takenAt) / 7) + 1} semanas desde a
                  primeira foto.
                </p>
              </Card>

              <Card tone={(selected.daysInactive ?? 0) >= INACTIVE_DAYS ? 'terra' : 'plain'}>
                <CardLabel
                  className={(selected.daysInactive ?? 0) >= INACTIVE_DAYS ? 'text-terra-ink/70' : ''}
                >
                  Última foto
                </CardLabel>
                <p
                  className={cn(
                    'text-16 font-medium mt-1.5',
                    (selected.daysInactive ?? 0) >= INACTIVE_DAYS ? 'text-terra-ink' : 'text-ink',
                  )}
                >
                  {selected.lastActivityAt ? formatDateBR(selected.lastActivityAt) : '—'}
                </p>
                <p
                  className={cn(
                    'text-14 leading-relaxed mt-1',
                    (selected.daysInactive ?? 0) >= INACTIVE_DAYS
                      ? 'text-terra-ink/80'
                      : 'text-muted',
                  )}
                >
                  {(selected.daysInactive ?? 0) >= INACTIVE_DAYS
                    ? `Sem registro há ${selected.daysInactive} dias. Vale um contato.`
                    : `Há ${selected.daysInactive} dias. A família está em dia.`}
                </p>
              </Card>
            </div>
          </div>

          <section className="mt-6">
            <CardLabel className="mb-3">Registros</CardLabel>
            <Card className="!p-0 overflow-x-auto">
              <table className="w-full text-14">
                <thead>
                  <tr className="text-left text-12 uppercase tracking-[0.08em] text-muted border-b border-line">
                    <th className="py-3 px-5 font-medium">Semana</th>
                    <th className="py-3 px-5 font-medium">Data</th>
                    <th className="py-3 px-5 font-medium">Índice</th>
                    <th className="py-3 px-5 font-medium">Leitura</th>
                  </tr>
                </thead>
                <tbody>
                  {[...selected.entries].reverse().map((e) => (
                    <tr key={e.weekNumber} className="border-b border-line/50 last:border-0">
                      <td className="py-3 px-5 text-ink tabular-nums">{e.weekNumber}</td>
                      <td className="py-3 px-5 text-muted">{formatDateBR(e.takenAt)}</td>
                      <td className="py-3 px-5 text-ink tabular-nums font-medium">
                        {e.asymmetryIndex.toFixed(1)}%
                      </td>
                      <td className="py-3 px-5 text-muted">{BAND_COPY[bandFor(e.asymmetryIndex)].label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <p className="text-12 text-muted leading-relaxed mt-3">
              O painel mostra a série e as datas. As anotações pessoais do responsável e os dados de
              conta dele não são compartilhados.
            </p>
          </section>
        </main>
      </div>
    );
  }

  /* Lista ------------------------------------------------------------------- */
  return (
    <div className="min-h-dvh bg-canvas">
      <PanelHeader proName={pro?.name} onExit={() => setAuthed(false)} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-32">Pacientes</h1>
            <p className="text-14 text-muted mt-1">
              {patients.length} em acompanhamento
              {inactive.length > 0 && ` · ${inactive.length} sem registro recente`}
            </p>
          </div>

          <label className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por bebê ou responsável"
              aria-label="Buscar paciente"
              className="w-full h-11 pl-10 pr-4 rounded-pill bg-surface border border-line text-14 text-ink placeholder:text-muted focus:border-amber transition-colors"
            />
          </label>
        </header>

        {inactive.length > 0 && (
          <Card tone="terra" className="mb-5 flex items-start gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-pill bg-terra/20 text-terra-ink shrink-0">
              <CircleAlert size={17} />
            </span>
            <div>
              <p className="text-14 font-medium text-terra-ink">
                {inactive.length} famíli{inactive.length === 1 ? 'a parou' : 'as pararam'} de
                registrar
              </p>
              <p className="text-14 text-terra-ink/80 leading-relaxed mt-0.5">
                {inactive.map((p) => p.babyName).join(', ')} — mais de {INACTIVE_DAYS} dias sem foto.
                Abandono silencioso é o que faz o acompanhamento posicional falhar.
              </p>
            </div>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const alert = (p.daysInactive ?? 0) >= INACTIVE_DAYS;
            const trend = readTrend(p.entries);
            const band = bandFor(p.latestIndex ?? 0);
            const bandTone =
              band === 'proxima' ? 'sage' : band === 'intermediaria' ? 'amber' : 'terra';

            return (
              <Card
                key={p.babyId}
                interactive
                onClick={() => setSelectedId(p.babyId)}
                elevation={alert ? 'lift' : 'rest'}
                className="flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-16 font-display font-medium text-ink truncate">
                      {p.babyName}
                    </p>
                    <p className="text-12 text-muted truncate">
                      {p.ageMonths} meses · {p.guardianName}
                    </p>
                  </div>
                  <Badge tone={bandTone as 'sage' | 'amber' | 'terra'}>
                    {p.latestIndex?.toFixed(1)}%
                  </Badge>
                </div>

                <div className="h-14 -mx-1">
                  <SymmetryChart
                    points={p.entries.map((e, i) => ({ ...e, id: `${p.babyId}_${i}` }))}
                    variant="mini"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className={cn('text-12', alert ? 'text-terra-ink font-medium' : 'text-muted')}>
                    {alert
                      ? `${p.daysInactive} dias sem foto`
                      : `${trend.headline} · ${Math.round(p.adherence * 100)}% de aderência`}
                  </span>
                  <ArrowUpRight size={15} className="text-muted shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <Card className="text-center py-12">
            <span className="grid place-items-center w-12 h-12 rounded-pill bg-raised text-muted mx-auto mb-4">
              <Users size={18} />
            </span>
            <p className="text-14 text-muted">Nenhum paciente encontrado para "{query}".</p>
          </Card>
        )}

        <Disclaimer
          level="block"
          className="mt-6"
          text="Os índices vêm de fotos 2D marcadas pela própria família. São um sinal de acompanhamento entre consultas, não uma medição craniométrica — a avaliação continua sendo sua."
        />
      </main>
    </div>
  );
}

function PanelHeader({ proName, onExit }: { proName?: string; onExit: () => void }) {
  const navigate = useNavigate();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto max-w-5xl px-6 h-16 flex items-center gap-3">
        <span className="grid place-items-center w-9 h-9 rounded-pill bg-sage-soft text-sage-ink shrink-0">
          <Stethoscope size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-14 font-medium text-ink truncate">{proName ?? 'Profissional'}</p>
          <p className="text-12 text-muted">Simetriapp · painel clínico</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          Ver app da família
        </Button>
        <Button variant="ghost" size="sm" onClick={onExit} aria-label="Sair">
          <LogOut size={15} />
        </Button>
      </div>
    </header>
  );
}
