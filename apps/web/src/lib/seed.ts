import {
  calculateSymmetry,
  type Baby,
  type ContentItem,
  type PhotoEntry,
  type Professional,
  type ReferencePoints,
  type Subscription,
  type User,
  type AppNotification,
} from '@simetriapp/shared';
import { generateAnglePhoto, generateBabyAvatar, generateHeadPhoto } from './demoAssets';

/**
 * Série de índices do bebê fictício, semanas 1 a 9.
 *
 * Escrita à mão, não gerada por fórmula, e de propósito: uma curva
 * exponencial perfeita é a assinatura visual de dado falso, e um investidor
 * que já viu um paciente real percebe na hora. Esta tem melhora rápida no
 * início (é o que a reposicionação costuma dar), um platô entre as semanas 5 e
 * 6, e uma PIORA na semana 7 — porque o bebê pegou um resfriado e dormiu a
 * semana toda para o mesmo lado, e é exatamente esse tipo de semana que o app
 * precisa saber exibir sem alarmar ninguém.
 */
const SERIES = [9.4, 8.6, 7.5, 6.4, 5.9, 5.8, 6.2, 5.1, 4.3];

const START_WEEKS_AGO = 9;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 30, 0, 0);
  return d.toISOString();
}

/**
 * Constrói os 4 pontos de referência que PRODUZEM o índice desejado, em vez de
 * anotar o índice ao lado de pontos aleatórios. Assim a tela de detalhe da foto
 * recalcula o índice a partir dos pontos e chega no mesmo número — o dado do
 * demo é internamente consistente, não uma fachada.
 */
function pointsForIndex(target: number, seed: number): ReferencePoints {
  const cx = 0.5;
  const cy = 0.5;
  const rx = 0.27;
  const ry = 0.32;
  const rad = (30 * Math.PI) / 180;
  const dx = Math.sin(rad) * rx;
  const dy = Math.cos(rad) * ry;

  const wobble = (i: number) => (Math.sin(seed * 12.9898 + i * 78.233) * 0.5) * 0.012;

  const frenteEsq = { x: cx - dx + wobble(1), y: cy - dy + wobble(2) };
  const frenteDir = { x: cx + dx + wobble(3), y: cy - dy + wobble(4) };
  const trasEsq = { x: cx - dx + wobble(5), y: cy + dy + wobble(6) };
  const trasDirFull = { x: cx + dx, y: cy + dy };

  // Encolhe a diagonal frenteEsq→trasDir na proporção exata do índice alvo.
  const a = target / 100;
  const trasDir = {
    x: frenteEsq.x + (trasDirFull.x - frenteEsq.x) * (1 - a),
    y: frenteEsq.y + (trasDirFull.y - frenteEsq.y) * (1 - a),
  };

  return { frenteEsq, frenteDir, trasEsq, trasDir };
}

export const DEMO_USER: User = {
  id: 'user_demo',
  email: 'demo@simetriapp.com.br',
  name: 'Marina',
  createdAt: daysAgo(START_WEEKS_AGO * 7 + 2),
  notificationPreferences: {
    weekday: 0,
    time: '10:00',
    pushEnabled: true,
    emailEnabled: true,
  },
};

export const DEMO_BABY: Baby = {
  id: 'baby_demo',
  userId: 'user_demo',
  name: 'Bento',
  sexo: 'menino',
  // ~4 meses e meio: a janela em que o acompanhamento posicional mais rende.
  birthDate: (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 4);
    d.setDate(d.getDate() - 12);
    return d.toISOString().slice(0, 10);
  })(),
  birthWeightG: 3180,
  premature: false,
  multiplePregnancy: false,
  diagnosis: 'plagiocefalia',
  profilePhotoUrl: generateBabyAvatar(7),
  createdAt: daysAgo(START_WEEKS_AGO * 7 + 2),
};

export const DEMO_PROFESSIONAL: Professional = {
  id: 'pro_demo',
  name: 'Dra. Helena Ribeiro',
  email: 'helena@clinicap2s.com.br',
  inviteCode: 'P2S001',
  clinicName: 'Clínica P2S — Fisioterapia Pediátrica',
};

export const DEMO_TREATMENT_START = daysAgo(START_WEEKS_AGO * 7);

export function buildDemoEntries(): PhotoEntry[] {
  return SERIES.map((target, i) => {
    const week = i + 1;
    const points = pointsForIndex(target, week);
    const est = calculateSymmetry(points);

    return {
      id: `photo_${week}`,
      babyId: DEMO_BABY.id,
      imageUrl: generateHeadPhoto(est.asymmetryIndex, week),
      takenAt: daysAgo((START_WEEKS_AGO - i) * 7),
      referencePoints: points,
      asymmetryIndex: est.asymmetryIndex,
      widthLengthRatio: est.widthLengthRatio,
      band: est.band,
      weekNumber: week,
      note:
        week === 7
          ? 'Semana difícil, ele ficou resfriado e dormiu bastante do mesmo lado.'
          : week === 1
            ? 'Primeira foto, logo depois da consulta com a Dra. Helena.'
            : null,
      // Numa semana mostramos os ângulos complementares, para o demo exibir o
      // registro visual além da vista de cima que produz o índice.
      angles:
        week === 9
          ? (['lateral_esq', 'lateral_dir', 'posterior'] as const).map((angle) => ({
              angle,
              imageUrl: generateAnglePhoto(angle, week),
              takenAt: daysAgo((START_WEEKS_AGO - i) * 7),
            }))
          : undefined,
    };
  });
}

export const DEMO_CONTENT: ContentItem[] = [
  {
    id: 'c_tummy',
    title: 'Tempo de barriga para baixo, sem choro',
    summary:
      'O jeito de introduzir o tummy time em bebês que odeiam ficar de bruços — em blocos de 40 segundos, não de 10 minutos.',
    type: 'video',
    ageRangeMin: 0,
    ageRangeMax: 6,
    tag: 'pode_fazer',
    mediaUrl: null,
    durationSec: 214,
    transcript:
      'A gente não começa pelo chão. Começa no seu peito, com você reclinada, o bebê de bruços sobre você, olhando pro seu rosto. Ele levanta a cabeça porque quer te ver — e é justamente esse movimento que fortalece a musculatura do pescoço.\n\nQuarenta segundos já valem. Depois aumenta. O erro mais comum é colocar no tapete direto, o bebê odiar, e a família desistir do tummy time achando que "esse bebê não gosta". Ele não gosta do tapete. Ele gosta de você.',
    body: null,
    accent: 'sage',
  },
  {
    id: 'c_berco',
    title: 'Alternar o lado do berço muda mais do que parece',
    summary:
      'Bebês viram a cabeça para onde está o estímulo. Se o berço não muda de lado, a cabeça também não.',
    type: 'article',
    ageRangeMin: 0,
    ageRangeMax: 8,
    tag: 'pode_fazer',
    mediaUrl: null,
    durationSec: null,
    transcript: '',
    body: 'Seu bebê vira a cabeça para onde tem coisa interessante acontecendo: a porta do quarto, a janela, você.\n\nSe o berço fica sempre na mesma posição, ele passa oito, dez horas por noite com a cabeça girada para o mesmo lado — e é ali, no ponto de apoio, que o osso mais macio vai cedendo.\n\n**O que fazer:** a cada semana, inverta a posição em que você deita o bebê no berço (cabeça onde antes ficavam os pés). O berço não sai do lugar, o quarto continua igual — mas o lado "interessante" passa a ser o outro, e ele vira a cabeça para o lado oposto sozinho, sem você precisar forçar nada.\n\nÉ a intervenção mais barata que existe no acompanhamento posicional, e a mais esquecida.',
    accent: 'sky',
  },
  {
    id: 'c_torcicolo',
    title: 'Quando a cabecinha não é só posição — sinais de torcicolo',
    summary:
      'Se o bebê resiste a virar para um lado específico, isso muda o plano de tratamento. Não é algo para resolver em casa.',
    type: 'video',
    ageRangeMin: 1,
    ageRangeMax: 12,
    tag: 'so_profissional',
    mediaUrl: null,
    durationSec: 168,
    transcript:
      'Existe uma diferença entre o bebê que PREFERE um lado e o bebê que NÃO CONSEGUE ir para o outro. O segundo caso costuma ser torcicolo muscular congênito, e alongar o pescoço de um bebê por conta própria, com base num vídeo da internet, é como esticar um músculo lesionado sem saber onde está a lesão.\n\nO sinal que você pode observar em casa é simples: ofereça um estímulo (seu rosto, um chocalho) do lado que ele evita. Se ele acompanha com os olhos mas não gira o pescoço, ou se gira e volta rápido como se incomodasse — anote e leve para o profissional. Não force o movimento.\n\nEsse vídeo é para você identificar e RELATAR, não para você tratar.',
    body: null,
    accent: 'amber',
  },
  {
    id: 'c_colo',
    title: 'Colo, carrinho e bebê-conforto: onde a cabeça descansa',
    summary:
      'O tempo somado em superfícies duras é o que pesa. Um mapa rápido do dia do seu bebê.',
    type: 'article',
    ageRangeMin: 2,
    ageRangeMax: 10,
    tag: 'pode_fazer',
    mediaUrl: null,
    durationSec: null,
    transcript: '',
    body: 'Faça uma conta rápida de um dia comum: quantas horas a cabeça do seu bebê passou apoiada numa superfície firme?\n\nBerço. Bebê-conforto no carro. Bebê-conforto que virou cadeirinha dentro de casa. Carrinho. Tapete de atividades. Somado, é fácil passar de 16 horas.\n\n**A regra prática:** o bebê-conforto é equipamento de segurança do carro, não é cadeira de estar. Quando chegar em casa, tire ele de lá.\n\nCada hora que sai da superfície dura e vai pro colo, pro sling ou pro tummy time é uma hora que o crânio não está sendo pressionado sempre no mesmo ponto. Você não precisa eliminar as superfícies firmes — precisa quebrar a monotonia delas.',
    accent: 'sage',
  },
];

export const DEMO_SUBSCRIPTION: Subscription = {
  id: 'sub_demo',
  userId: 'user_demo',
  status: 'trialing',
  plan: 'premium',
  trialEndsAt: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString();
  })(),
  currentPeriodEnd: null,
  graceEndsAt: null,
  cancelAtPeriodEnd: false,
};

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'marco',
    title: 'Dois meses acompanhando o Bento',
    body: 'Vocês dois chegaram até aqui juntos. Nove semanas de registro, sem falhar.',
    sentAt: daysAgo(2),
    readAt: null,
  },
  {
    id: 'n2',
    type: 'lembrete_semanal',
    title: 'Hora da foto do Bento',
    body: 'É domingo — o dia que você escolheu. Leva um minuto.',
    sentAt: daysAgo(7),
    readAt: daysAgo(7),
  },
  {
    id: 'n3',
    type: 'sistema',
    title: 'Dra. Helena vinculou o Bento ao acompanhamento dela',
    body: 'Agora ela consegue ver a evolução das fotos que você registra.',
    sentAt: daysAgo(60),
    readAt: daysAgo(59),
  },
];

/** Pacientes extras, só para o painel do profissional não parecer vazio. */
export const DEMO_OTHER_PATIENTS = [
  { name: 'Alice', guardian: 'Camila S.', months: 3, series: [7.8, 7.1, 6.9, 6.2], daysAgo: 5, diagnosis: 'plagiocefalia' as const },
  { name: 'Théo', guardian: 'Rafael M.', months: 6, series: [5.2, 4.8, 4.9, 4.1, 3.6], daysAgo: 3, diagnosis: 'braquicefalia' as const },
  // Inativa há 3 semanas: o painel EXISTE para o profissional pescar esta linha.
  { name: 'Cecília', guardian: 'Juliana P.', months: 5, series: [8.9, 8.4, 8.6], daysAgo: 23, diagnosis: 'plagiocefalia' as const },
  { name: 'Miguel', guardian: 'Denise A.', months: 2, series: [6.4, 6.0], daysAgo: 9, diagnosis: 'sem_diagnostico' as const },
];
