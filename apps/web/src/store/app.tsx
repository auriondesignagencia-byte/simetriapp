import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  calculateSymmetry,
  currentStreak,
  daysUntilNextPhoto,
  projectPace,
  readTrend,
  weekNumberFor,
  type AnalyticsEvent,
  type AppNotification,
  type Baby,
  type ContentItem,
  type ContentProgress,
  type NotificationPreferences,
  type PhotoEntry,
  type Professional,
  type AnglePhoto,
  type ReferencePoints,
  type Subscription,
  type User,
} from '@simetriapp/shared';
import {
  buildDemoEntries,
  DEMO_BABY,
  DEMO_CONTENT,
  DEMO_NOTIFICATIONS,
  DEMO_PROFESSIONAL,
  DEMO_SUBSCRIPTION,
  DEMO_TREATMENT_START,
  DEMO_USER,
} from '@/lib/seed';
import { generateHeadPhoto } from '@/lib/demoAssets';
import { apagarEstado, carregarEstado, salvarEstado } from '@/lib/persistencia';
import { baixarEstado, subirEstado } from '@/lib/nuvem';
import { NUVEM_ATIVA } from '@/lib/supabase';
import { useSessao } from './sessao';

// Modo demonstração: OPT-IN. Antes o padrão era ligado (`!== 'false'`), e com
// isso a build de produção subia em modo demo — quem abria o app pela primeira
// vez via o bebê fictício, o histórico dele e os atalhos de apresentação, em vez
// do próprio onboarding. Para demonstrar, rode com VITE_DEMO_MODE=true.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export interface AppState {
  onboarded: boolean;
  user: User | null;
  baby: Baby | null;
  professional: Professional | null;
  treatmentStart: string | null;
  entries: PhotoEntry[];
  content: ContentItem[];
  progress: ContentProgress[];
  subscription: Subscription | null;
  notifications: AppNotification[];
  events: { event: AnalyticsEvent; at: string; meta?: Record<string, unknown> }[];
}

const EMPTY: AppState = {
  onboarded: false,
  user: null,
  baby: null,
  professional: null,
  treatmentStart: null,
  entries: [],
  content: DEMO_CONTENT,
  progress: [],
  subscription: null,
  notifications: [],
  events: [],
};

function demoState(): AppState {
  return {
    onboarded: true,
    user: DEMO_USER,
    baby: DEMO_BABY,
    professional: DEMO_PROFESSIONAL,
    treatmentStart: DEMO_TREATMENT_START,
    entries: buildDemoEntries(),
    content: DEMO_CONTENT,
    progress: [{ contentItemId: 'c_berco', viewedAt: new Date().toISOString() }],
    subscription: DEMO_SUBSCRIPTION,
    notifications: DEMO_NOTIFICATIONS,
    events: [],
  };
}

/**
 * O catálogo de conteúdo vem sempre do código, nunca do que foi salvo — senão um
 * usuário antigo fica preso na biblioteca da versão que instalou.
 */
function comCatalogoAtual(estado: AppState): AppState {
  return { ...estado, content: DEMO_CONTENT };
}

interface AppContextValue {
  state: AppState;
  /** true quando nem o IndexedDB nem o localStorage aceitaram gravar. */
  falhaAoSalvar: boolean;
  /** Salvou no aparelho mas ainda não chegou na conta do cliente. */
  falhaAoSincronizar: boolean;
  derived: Derived;
  // ações
  completeOnboarding: (p: {
    user: Pick<User, 'name' | 'email'>;
    baby: Omit<Baby, 'id' | 'userId' | 'createdAt'>;
    professional: Professional | null;
    weekday: number;
    time: string;
  }) => void;
  addEntry: (p: {
    points: ReferencePoints;
    imageUrl: string;
    note?: string | null;
    angles?: AnglePhoto[];
  }) => PhotoEntry;
  updateNotificationPrefs: (patch: Partial<NotificationPreferences>) => void;
  markContentViewed: (id: string) => void;
  setSubscription: (s: Partial<Subscription>) => void;
  markNotificationRead: (id: string) => void;
  track: (event: AnalyticsEvent, meta?: Record<string, unknown>) => void;
  resetToDemo: () => void;
  wipeEverything: () => void;
  /** Só existe para a demo: pula o trial para o dia seguinte ao fim. */
  simulateTrialExpiry: () => void;
}

export interface Derived {
  hasAccess: boolean;
  trialDaysLeft: number | null;
  daysUntilPhoto: number;
  isPhotoDay: boolean;
  streak: number;
  trend: ReturnType<typeof readTrend>;
  projection: ReturnType<typeof projectPace>;
  latest: PhotoEntry | null;
  unreadCount: number;
  /** Conteúdos liberados pela idade atual do bebê. */
  availableContent: ContentItem[];
}

const Ctx = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { sessao } = useSessao();
  const userId = sessao?.user.id ?? null;

  const [state, setState] = useState<AppState>(EMPTY);
  // O armazenamento é assíncrono: até ele responder não dá para saber se existe
  // histórico salvo. Renderizar antes disso mandaria quem já usa o app direto
  // para o onboarding.
  const [hidratado, setHidratado] = useState(false);
  const [falhaAoSalvar, setFalhaAoSalvar] = useState(false);
  const [falhaAoSincronizar, setFalhaAoSincronizar] = useState(false);
  // Sobe quando uma tentativa falha, para reagendar a próxima.
  const [tentativaNuvem, setTentativaNuvem] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setHidratado(false);

    (async () => {
      const local = await carregarEstado<AppState>();

      // Com conta, a nuvem é a fonte da verdade: é ela que faz o histórico
      // sobreviver à troca de aparelho. O que está no aparelho vira cache.
      if (userId) {
        const daNuvem = await baixarEstado<AppState>(userId);
        if (cancelado) return;

        if (daNuvem) {
          setState(comCatalogoAtual(daNuvem));
        } else if (local?.onboarded) {
          // Primeira entrada com conta em um aparelho que já tinha histórico:
          // sobe o que existe em vez de descartar.
          setState(comCatalogoAtual(local));
          void subirEstado(userId, local);
        } else if (DEMO_MODE) {
          setState(demoState());
        }
        setHidratado(true);
        return;
      }

      if (cancelado) return;
      if (local) setState(comCatalogoAtual(local));
      // Em modo demo, sem nada salvo, o app já nasce populado — é o requisito de
      // "ver o produto completo sem tirar foto nenhuma".
      else if (DEMO_MODE) setState(demoState());
      setHidratado(true);
    })();

    return () => {
      cancelado = true;
    };
  }, [userId]);

  useEffect(() => {
    // Antes de hidratar, gravar sobrescreveria o histórico com o estado vazio.
    if (!hidratado) return;

    // O aparelho grava na hora: é o que garante o app funcionando sem rede.
    void salvarEstado(state).then((ok) => setFalhaAoSalvar(!ok));

    if (!userId) return;
    // A nuvem espera a digitação parar. Sem isso, cada tecla no campo de nota
    // viraria uma gravação — e um upload de foto junto.
    // O resultado do envio PRECISA ser lido. Enquanto era `void subirEstado(...)`,
    // uma falha de rede, de sessão expirada ou de upload de foto passava em
    // silêncio: a mãe via a foto na tela achando que estava na conta dela,
    // quando na verdade só existia no IndexedDB daquele aparelho.
    const janela = setTimeout(() => {
      void subirEstado(userId, state).then((ok) => setFalhaAoSincronizar(!ok));
    }, 1200);
    return () => clearTimeout(janela);
  }, [state, hidratado, userId, tentativaNuvem]);

  // Retentativa enquanto não subir. Rede de celular cai o tempo todo — desistir
  // na primeira falha deixaria a semana registrada só no aparelho.
  useEffect(() => {
    if (!falhaAoSincronizar || !userId) return;
    const t = setTimeout(() => setTentativaNuvem((n) => n + 1), 20_000);
    return () => clearTimeout(t);
  }, [falhaAoSincronizar, userId]);

  const track = useCallback((event: AnalyticsEvent, meta?: Record<string, unknown>) => {
    setState((s) => ({
      ...s,
      events: [...s.events, { event, at: new Date().toISOString(), meta }],
    }));
  }, []);

  const completeOnboarding: AppContextValue['completeOnboarding'] = useCallback(
    ({ user, baby, professional, weekday, time }) => {
      const now = new Date().toISOString();
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);

      setState((s) => ({
        ...s,
        onboarded: true,
        treatmentStart: now,
        user: {
          id: 'user_local',
          email: user.email,
          name: user.name,
          createdAt: now,
          notificationPreferences: {
            weekday,
            time,
            pushEnabled: true,
            emailEnabled: true,
          },
        },
        baby: { ...baby, id: 'baby_local', userId: 'user_local', createdAt: now },
        professional,
        subscription: {
          id: 'sub_local',
          userId: 'user_local',
          status: 'trialing',
          plan: 'premium',
          // Trial de 14 dias, sem cartão. Nada capado durante o trial.
          trialEndsAt: trialEnds.toISOString(),
          currentPeriodEnd: null,
          graceEndsAt: null,
          cancelAtPeriodEnd: false,
        },
        notifications: [
          {
            id: `n_${Date.now()}`,
            type: 'sistema',
            title: `Tudo pronto para acompanhar ${baby.name}`,
            body: professional
              ? `${professional.name} vai poder ver a evolução das fotos que você registrar.`
              : 'Sua primeira foto começa a construir a curva de evolução.',
            sentAt: now,
            readAt: null,
          },
        ],
        events: [...s.events, { event: 'cadastro_completo' as const, at: now }],
      }));
    },
    [],
  );

  const addEntry: AppContextValue['addEntry'] = useCallback(
    ({ points, imageUrl, note, angles }) => {
      const est = calculateSymmetry(points);
      const takenAt = new Date().toISOString();

      let created!: PhotoEntry;
      setState((s) => {
        const start = s.treatmentStart ?? takenAt;
        const week = Math.max(
          weekNumberFor(start, takenAt),
          // Duas fotos na mesma semana não podem colidir no gráfico. Se já existe
          // registro para esta semana, a nova entra como a semana seguinte —
          // um pai ansioso que tira 3 fotos no domingo não deve quebrar a curva.
          s.entries.length ? Math.max(...s.entries.map((e) => e.weekNumber)) + 1 : 1,
        );

        created = {
          id: `photo_${Date.now()}`,
          babyId: s.baby?.id ?? 'baby_local',
          imageUrl,
          takenAt,
          referencePoints: points,
          asymmetryIndex: est.asymmetryIndex,
          widthLengthRatio: est.widthLengthRatio,
          band: est.band,
          weekNumber: week,
          note: note ?? null,
          angles: angles && angles.length ? angles : undefined,
        };

        const isFirst = s.entries.length === 0;
        return {
          ...s,
          entries: [...s.entries, created],
          treatmentStart: s.treatmentStart ?? takenAt,
          events: [
            ...s.events,
            {
              event: (isFirst ? 'primeira_foto' : 'foto_semanal') as AnalyticsEvent,
              at: takenAt,
              meta: { week, index: est.asymmetryIndex },
            },
          ],
        };
      });

      return created;
    },
    [],
  );

  const updateNotificationPrefs: AppContextValue['updateNotificationPrefs'] = useCallback(
    (patch) => {
      setState((s) =>
        s.user
          ? {
              ...s,
              user: {
                ...s.user,
                notificationPreferences: { ...s.user.notificationPreferences, ...patch },
              },
            }
          : s,
      );
    },
    [],
  );

  const markContentViewed = useCallback((id: string) => {
    setState((s) => {
      if (s.progress.some((p) => p.contentItemId === id)) return s;
      return {
        ...s,
        progress: [...s.progress, { contentItemId: id, viewedAt: new Date().toISOString() }],
        events: [
          ...s.events,
          { event: 'conteudo_assistido' as const, at: new Date().toISOString(), meta: { id } },
        ],
      };
    });
  }, []);

  const setSubscription = useCallback((patch: Partial<Subscription>) => {
    setState((s) => (s.subscription ? { ...s, subscription: { ...s.subscription, ...patch } } : s));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    }));
  }, []);

  const resetToDemo = useCallback(() => setState(demoState()), []);

  const wipeEverything = useCallback(() => {
    // Direito ao esquecimento: sai do storage de verdade, não vira flag.
    void apagarEstado();
    setState(EMPTY);
  }, []);

  const simulateTrialExpiry = useCallback(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setState((s) => ({
      ...s,
      subscription: s.subscription
        ? { ...s.subscription, status: 'expired', trialEndsAt: yesterday.toISOString() }
        : s.subscription,
      events: [...s.events, { event: 'trial_expirado' as const, at: new Date().toISOString() }],
    }));
  }, []);

  const derived = useMemo<Derived>(() => {
    const sub = state.subscription;
    const trialDaysLeft =
      sub?.trialEndsAt && sub.status === 'trialing'
        ? Math.max(
            0,
            Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86_400_000),
          )
        : null;

    // Acesso sempre liberado dentro do app. A cobrança e o controle de acesso
    // acontecem no checkout externo (Cakto): quem está com o app, já pagou ou
    // está no período de teste. Não faz sentido cobrar de novo para abrir módulo.
    const hasAccess = true;

    const sorted = [...state.entries].sort((a, b) => a.weekNumber - b.weekNumber);
    const latest = sorted.length ? sorted[sorted.length - 1] : null;

    const points = sorted.map((e) => ({
      weekNumber: e.weekNumber,
      asymmetryIndex: e.asymmetryIndex,
    }));

    const days = state.treatmentStart
      ? daysUntilNextPhoto(latest?.takenAt ?? null, state.treatmentStart)
      : 0;

    const ageMonths = state.baby
      ? Math.floor(
          (Date.now() - new Date(state.baby.birthDate).getTime()) / (30.44 * 86_400_000),
        )
      : 0;

    return {
      hasAccess,
      trialDaysLeft,
      daysUntilPhoto: days,
      isPhotoDay: days <= 0,
      streak: currentStreak(sorted.map((e) => e.weekNumber)),
      trend: readTrend(points),
      projection: projectPace(points),
      latest,
      unreadCount: state.notifications.filter((n) => !n.readAt).length,
      availableContent: state.content.filter(
        (c) => ageMonths >= c.ageRangeMin && ageMonths <= c.ageRangeMax,
      ),
    };
  }, [state]);

  const value = useMemo(
    () => ({
      state,
      derived,
      falhaAoSalvar,
      falhaAoSincronizar,
      completeOnboarding,
      addEntry,
      updateNotificationPrefs,
      markContentViewed,
      setSubscription,
      markNotificationRead,
      track,
      resetToDemo,
      wipeEverything,
      simulateTrialExpiry,
    }),
    [
      state,
      derived,
      completeOnboarding,
      addEntry,
      updateNotificationPrefs,
      markContentViewed,
      setSubscription,
      markNotificationRead,
      track,
      resetToDemo,
      wipeEverything,
      simulateTrialExpiry,
    ],
  );

  // Segura a primeira pintura até saber o que há salvo. São poucos milissegundos
  // de leitura local; sem isso, quem já tem histórico veria o onboarding piscar
  // antes de o app se dar conta de que ela não é uma usuária nova.
  if (!hidratado) return null;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return ctx;
}

/** Foto simulada para o fluxo de captura quando não há câmera (desktop/demo). */
export function simulatedPhoto(points: ReferencePoints): string {
  return generateHeadPhoto(calculateSymmetry(points).asymmetryIndex, Date.now() % 997);
}
