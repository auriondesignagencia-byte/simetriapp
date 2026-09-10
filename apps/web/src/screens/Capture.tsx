import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  Check,
  ImageOff,
  ImagePlus,
  Plus,
  RotateCcw,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ANGLE_HINTS,
  ANGLE_LABELS,
  ANGLE_ORDER,
  calculateSymmetry,
  DISCLAIMER_INDEX,
  FALLBACK_BOX,
  POINT_HINTS,
  POINT_KEYS,
  POINT_LABELS,
  suggestReferencePoints,
  type AngleKey,
  type AnglePhoto,
  type PointKey,
  type ReferencePoints,
} from '@simetriapp/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Field';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { IndexReadout } from '@/components/IndexReadout';
import { PointEditor } from '@/components/PointEditor';
import { GhostCompare } from '@/components/GhostCompare';
import { useApp, simulatedPhoto, DEMO_MODE } from '@/store/app';
import {
  assessQuality,
  canvasFromFile,
  compressImage,
  detectBox,
  framingFor,
  FRAMING_COPY,
  GUIDE,
  supportsFaceDetection,
  type Box,
  type FramingStatus,
  type QualityReport,
} from '@/lib/vision';
import { cn } from '@/lib/cn';

type Phase =
  | 'checklist'
  | 'camera'
  | 'sem-camera'
  | 'error'
  | 'compare'
  | 'points'
  | 'result'
  | 'angles';

const CHECKS = [
  { key: 'luz', label: 'Ambiente bem iluminado', desc: 'Luz natural ajuda. Evite contraluz.' },
  { key: 'fundo', label: 'Fundo neutro', desc: 'Um lençol liso já resolve.' },
  { key: 'touca', label: 'Sem touca ou gorro', desc: 'Nada cobrindo a cabeça.' },
  { key: 'cabelo', label: 'Cabelo preso ou penteado', desc: 'Para o contorno ficar visível.' },
] as const;

export function Capture() {
  const navigate = useNavigate();
  const { state, derived, addEntry } = useApp();

  const [phase, setPhase] = useState<Phase>('checklist');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [image, setImage] = useState<string | null>(null);
  const [points, setPoints] = useState<ReferencePoints | null>(null);
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [saved, setSaved] = useState(false);
  // Ângulos complementares desta semana. Documentam a cabeça de todos os lados —
  // não entram no cálculo do índice (só a foto de cima mede).
  const [angles, setAngles] = useState<AnglePhoto[]>([]);
  // Passo do tour guiado: 0..ANGLE_ORDER.length-1 percorre cada ângulo em ordem;
  // === length cai na revisão final (grade do que foi registrado).
  const [angleStep, setAngleStep] = useState(0);
  // Recaptura pontual disparada pela revisão — recaptura só um ângulo e volta.
  const [capturingAngle, setCapturingAngle] = useState<AngleKey | null>(null);

  const putAngle = (angle: AngleKey, url: string) =>
    setAngles((prev) => [
      ...prev.filter((a) => a.angle !== angle),
      { angle, imageUrl: url, takenAt: new Date().toISOString() },
    ]);

  const allChecked = CHECKS.every((c) => checks[c.key]);
  const previous = derived.latest;

  const handleCaptured = useCallback(
    (dataUrl: string, box: Box | null, q: QualityReport) => {
      setQuality(q);
      if (!q.ok) {
        setImage(dataUrl);
        setPhase('error');
        return;
      }
      setImage(dataUrl);
      setPoints(suggestReferencePoints(box ?? FALLBACK_BOX));
      setPhase(previous ? 'compare' : 'points');
    },
    [previous],
  );

  const save = () => {
    if (!points || !image) return;
    addEntry({ points, imageUrl: image, angles });
    setSaved(true);
    setTimeout(() => navigate('/evolucao'), 1500);
  };

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button
          onClick={() => {
            if (capturingAngle) setCapturingAngle(null);
            // No tour guiado, "voltar" recua um ângulo; do primeiro, sai para o resultado.
            else if (phase === 'angles' && angleStep > 0 && angleStep < ANGLE_ORDER.length)
              setAngleStep((s) => s - 1);
            else if (phase === 'angles') setPhase('result');
            else if (phase === 'checklist') navigate(-1);
            else setPhase('checklist');
          }}
          aria-label="Voltar"
          className="p-1.5 -ml-1.5 rounded-pill text-muted hover:bg-raised hover:text-ink transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-20">Foto da semana {(previous?.weekNumber ?? 0) + 1}</h1>
          <p className="text-12 text-muted">{PHASE_LABEL[phase]}</p>
        </div>
      </header>

      {/* Sem AnimatePresence de propósito.
          Com `mode="wait"` + `key={phase}` o nó que saía terminava a animação
          (opacity 0) mas NUNCA era removido do DOM: continuava ocupando o
          layout e, como o modo "wait" espera a remoção, a fase seguinte não
          entrava. O usuário tirava a foto e ficava olhando uma tela vazia —
          o registro da semana morria ali. A entrada agora é uma animação CSS
          (`animate-fade-up`, que já existe no tema), que não precisa
          coreografar saída nenhuma para estar correta. */}
      <div key={phase} className="flex-1 flex flex-col animate-fade-up">
          {phase === 'checklist' && (
            <div className="flex-1 flex flex-col px-5 pb-8">
              <p className="text-16 text-muted leading-relaxed mb-5">
                Quatro coisas rápidas antes de fotografar. Elas são o que faz a foto desta semana
                poder ser comparada com a da semana passada.
              </p>

              <div className="card p-5 space-y-4">
                {CHECKS.map((c, i) => (
                  <div key={c.key}>
                    {i > 0 && <div className="h-px bg-line mb-4" />}
                    <Switch
                      label={c.label}
                      description={c.desc}
                      checked={!!checks[c.key]}
                      onChange={(v) => setChecks({ ...checks, [c.key]: v })}
                    />
                  </div>
                ))}
              </div>

              <Disclaimer className="mt-5" level="block" text={DISCLAIMER_INDEX} />

              <div className="flex-1" />

              <Button
                size="lg"
                fullWidth
                disabled={!allChecked}
                onClick={() => setPhase('camera')}
                className="mt-6"
              >
                <Camera size={18} />
                {allChecked ? 'Abrir câmera' : 'Confirme os 4 itens acima'}
              </Button>
            </div>
          )}

          {phase === 'camera' && (
            <CameraView
              onCaptured={handleCaptured}
              onDenied={() => setPhase('sem-camera')}
              babyName={state.baby?.name ?? 'o bebê'}
            />
          )}

          {/* Sem câmera é uma FASE, não um estado escondido dentro da câmera.
              Enquanto era estado interno, a CameraView continuava montada depois
              da foto: a saída do framer-motion terminava mas o nó nunca saía do
              DOM, e com mode="wait" a fase seguinte nunca entrava — a tela
              simplesmente ficava vazia e o registro da semana morria ali. */}
          {phase === 'sem-camera' && (
            <div className="flex-1 flex flex-col px-5 pb-8">
              <Card tone="sky" className="text-center">
                <span className="inline-grid place-items-center w-12 h-12 rounded-pill bg-sky/25 text-sky-ink mb-3">
                  <Camera size={20} />
                </span>
                <h2 className="text-20 text-sky-ink mb-2">Sem acesso à câmera</h2>
                <p className="text-14 text-sky-ink/85 leading-relaxed">
                  Você pode liberar a câmera nas permissões do navegador, ou escolher uma foto que
                  já tirou. Vale qualquer foto que siga os quatro cuidados da tela anterior.
                </p>
              </Card>

              <div className="flex-1" />

              <div className="space-y-3 mt-6">
                <PickFromGallery
                  onPicked={async (canvas) => {
                    const q = assessQuality(canvas);
                    const url = await compressImage(canvas);
                    handleCaptured(url, null, q);
                  }}
                />

                {/* A foto simulada é material de DEMONSTRAÇÃO. Fora do modo demo
                    não aparece: registro inventado no histórico, no índice e no
                    relatório de uma mãe é pior do que não ter registro. */}
                {DEMO_MODE && (
                  <Button
                    size="lg"
                    fullWidth
                    variant="ghost"
                    onClick={() => {
                      const pts = suggestReferencePoints(FALLBACK_BOX);
                      handleCaptured(simulatedPhoto(pts), FALLBACK_BOX, {
                        ok: true,
                        sharpness: 1,
                        brightness: 0.55,
                        problem: null,
                        hint: null,
                      });
                    }}
                  >
                    <Wand2 size={18} />
                    Usar foto simulada (demo)
                  </Button>
                )}

                <Button variant="ghost" fullWidth onClick={() => setPhase('checklist')}>
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {phase === 'error' && quality && (
            <div className="flex-1 flex flex-col px-5 pb-8">
              <Card tone="terra" className="text-center">
                <span className="inline-grid place-items-center w-12 h-12 rounded-pill bg-terra/15 text-terra-ink mb-3">
                  <ImageOff size={20} />
                </span>
                <h2 className="text-20 text-terra-ink mb-2">
                  {quality.problem === 'borrada'
                    ? 'A foto saiu tremida'
                    : quality.problem === 'escura'
                      ? 'Faltou luz'
                      : 'Luz demais'}
                </h2>
                <p className="text-14 text-terra-ink/85 leading-relaxed">{quality.hint}</p>
              </Card>

              {image && (
                <div className="mt-5 rounded-card overflow-hidden border border-line">
                  <img src={image} alt="Foto capturada" className="w-full aspect-square object-cover" />
                </div>
              )}

              <p className="text-12 text-muted mt-4 leading-relaxed">
                Preferimos te pedir uma foto nova a calcular um número em cima de uma imagem em que
                nem dá pra ver a borda da cabeça direito.
              </p>

              <div className="flex-1" />

              <Button size="lg" fullWidth onClick={() => setPhase('camera')} className="mt-6">
                <RotateCcw size={18} />
                Tentar de novo
              </Button>
            </div>
          )}

          {phase === 'compare' && image && previous && (
            <div className="flex-1 flex flex-col px-5 pb-8">
              <p className="text-16 text-muted leading-relaxed mb-4">
                Arraste para comparar com a semana {previous.weekNumber}. Se o enquadramento estiver
                muito diferente, vale refazer — a comparação entre semanas só funciona se o ângulo
                for parecido.
              </p>

              <GhostCompare current={image} previous={previous.imageUrl} />

              <div className="flex-1" />

              <div className="space-y-3 mt-6">
                <Button size="lg" fullWidth onClick={() => setPhase('points')}>
                  Está parecido, seguir
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setPhase('camera')}>
                  Refazer a foto
                </Button>
              </div>
            </div>
          )}

          {phase === 'points' && image && points && (
            <PointsPhase
              image={image}
              points={points}
              onChange={setPoints}
              onDone={() => setPhase('result')}
            />
          )}

          {phase === 'result' && points && image && (
            <div className="flex-1 flex flex-col px-5 pb-8">
              <AnimatePresence>
                {saved && <SavedOverlay />}
              </AnimatePresence>

              <Card elevation="lift">
                <IndexReadout estimate={calculateSymmetry(points)} />
              </Card>

              <div className="mt-5 rounded-card overflow-hidden border border-line">
                <img src={image} alt="" className="w-full aspect-square object-cover" />
              </div>

              {/* Ângulos complementares: registro visual. A foto de cima acima é a
                  que MEDE; estes só documentam. O card inicia um tour guiado que
                  passa por todos os ângulos, um a um. */}
              <Card
                interactive
                onClick={() => {
                  // Retoma na revisão se já registrou tudo; senão começa o tour.
                  setAngleStep(angles.length >= ANGLE_ORDER.length ? ANGLE_ORDER.length : angles.length);
                  setPhase('angles');
                }}
                className="mt-4 flex items-center gap-3"
              >
                <span className="grid place-items-center w-10 h-10 rounded-pill bg-sky-soft text-sky-ink shrink-0">
                  <Camera size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-14 font-medium text-ink">Fotos de outros ângulos</p>
                  <p className="text-12 text-muted mt-0.5 leading-snug">
                    {angles.length
                      ? `${angles.length} de ${ANGLE_ORDER.length} registrados · toque para continuar`
                      : `Perfil, nuca, de frente — o app guia por todos os ${ANGLE_ORDER.length}`}
                  </p>
                </div>
                <Plus size={18} className="text-muted shrink-0" />
              </Card>

              <div className="flex-1" />

              <div className="space-y-3 mt-6">
                <Button size="lg" fullWidth onClick={save} loading={saved}>
                  <Check size={18} />
                  Salvar a semana {(previous?.weekNumber ?? 0) + 1}
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setPhase('points')}>
                  Ajustar os pontos de novo
                </Button>
              </div>
            </div>
          )}

          {phase === 'angles' &&
            (capturingAngle ? (
              // Recaptura pontual vinda da revisão: um ângulo só, volta à revisão.
              <AngleCapture
                angle={capturingAngle}
                babyName={state.baby?.name ?? 'o bebê'}
                onDone={(url) => {
                  putAngle(capturingAngle, url);
                  setCapturingAngle(null);
                }}
                onCancel={() => setCapturingAngle(null)}
              />
            ) : angleStep < ANGLE_ORDER.length ? (
              // Tour guiado: percorre cada ângulo em ordem, com progresso e "pular".
              <AngleCapture
                key={ANGLE_ORDER[angleStep]}
                angle={ANGLE_ORDER[angleStep]}
                babyName={state.baby?.name ?? 'o bebê'}
                progress={{ current: angleStep + 1, total: ANGLE_ORDER.length }}
                onDone={(url) => {
                  putAngle(ANGLE_ORDER[angleStep], url);
                  setAngleStep((s) => s + 1);
                }}
                onSkip={() => setAngleStep((s) => s + 1)}
                onCancel={() => setPhase('result')}
              />
            ) : (
              // Revisão final: o que foi registrado, com opção de refazer cada um.
              <div className="flex-1 flex flex-col px-5 pb-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="grid place-items-center w-7 h-7 rounded-pill bg-sage/20 text-sage-ink shrink-0">
                    <Check size={15} />
                  </span>
                  <p className="text-16 font-medium text-ink">
                    {angles.length} de {ANGLE_ORDER.length} ângulos registrados
                  </p>
                </div>
                <Disclaimer
                  className="mb-5"
                  level="block"
                  text="Estas fotos são um registro visual. Só a foto de cima entra no cálculo do índice."
                />

                <div className="grid grid-cols-2 gap-3">
                  {ANGLE_ORDER.map((key) => {
                    const taken = angles.find((a) => a.angle === key);
                    return (
                      <button
                        key={key}
                        onClick={() => setCapturingAngle(key)}
                        aria-label={taken ? `Refazer ${ANGLE_LABELS[key]}` : `Registrar ${ANGLE_LABELS[key]}`}
                        className={cn(
                          'relative rounded-card overflow-hidden border text-left transition-colors',
                          taken ? 'border-sage/50' : 'border-line hover:border-sky/50',
                        )}
                      >
                        {taken ? (
                          <img
                            src={taken.imageUrl}
                            alt={ANGLE_LABELS[key]}
                            className="w-full aspect-square object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-raised grid place-items-center">
                            <Plus size={22} className="text-muted" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-ink/55 backdrop-blur-sm px-2.5 py-1.5 flex items-center justify-between gap-2">
                          <span className="text-12 font-medium text-white truncate">
                            {ANGLE_LABELS[key]}
                          </span>
                          {taken && (
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={`Remover ${ANGLE_LABELS[key]}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAngles((prev) => prev.filter((a) => a.angle !== key));
                              }}
                              className="grid place-items-center w-5 h-5 rounded-pill bg-white/20 hover:bg-white/35 shrink-0"
                            >
                              <X size={12} className="text-white" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1" />

                <Button size="lg" fullWidth onClick={() => setPhase('result')} className="mt-6">
                  <Check size={18} />
                  {angles.length ? `Concluir (${angles.length})` : 'Voltar sem anexar'}
                </Button>
              </div>
            ))}
      </div>
    </div>
  );
}

const PHASE_LABEL: Record<Phase, string> = {
  checklist: 'Antes de começar',
  camera: 'Enquadre a cabecinha',
  'sem-camera': 'Escolha uma foto',
  error: 'Precisamos de outra foto',
  compare: 'Confira o alinhamento',
  points: 'Ajuste os pontos',
  result: 'Estimativa desta semana',
  angles: 'Outros ângulos',
};

/* ─────────────────────────── câmera ─────────────────────────── */

/**
 * Escolher uma foto já tirada. É a saída honesta quando a câmera não abre —
 * e a câmera não abrir é comum no público deste app: permissão negada,
 * navegador embutido do Instagram/Facebook (por onde chega o anúncio) e
 * desktop sem webcam.
 */
function PickFromGallery({
  onPicked,
  label = 'Escolher foto da galeria',
}: {
  onPicked: (canvas: HTMLCanvasElement) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setErro(null);
          try {
            onPicked(await canvasFromFile(file));
          } catch {
            setErro('Não consegui abrir essa imagem. Tente outra foto.');
          }
        }}
      />
      <Button size="lg" fullWidth onClick={() => inputRef.current?.click()}>
        <ImagePlus size={18} />
        {label}
      </Button>
      {erro && <p className="text-14 text-terra-ink text-center">{erro}</p>}
    </>
  );
}

function CameraView({
  onCaptured,
  onDenied,
  babyName,
}: {
  onCaptured: (dataUrl: string, box: Box | null, q: QualityReport) => void;
  onDenied: () => void;
  babyName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [busy, setBusy] = useState(false);

  const status: FramingStatus = supportsFaceDetection() ? framingFor(box) : 'sem_deteccao';

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }

        const loop = async () => {
          if (cancelled || !videoRef.current) return;
          setBox(await detectBox(videoRef.current));
          // ~5 fps é suficiente para uma dica textual. Rodar a 60 esquenta o
          // celular no colo de quem está com um bebê nele.
          raf = window.setTimeout(loop, 200);
        };
        if (supportsFaceDetection()) loop();
      } catch {
        onDenied();
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = async () => {
    const video = videoRef.current;
    if (!video) return;
    setBusy(true);

    const canvas = document.createElement('canvas');
    const side = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      side,
      side,
    );

    const q = assessQuality(canvas);
    const url = await compressImage(canvas);
    setBusy(false);
    onCaptured(url, box, q);
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative flex-1 bg-ink overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!ready && <div className="absolute inset-0 skeleton rounded-none" />}

        {/* Overlay-guia: círculo + linha horizontal. Estático de propósito — ele
            AJUDA a enquadrar, não afirma que mediu ângulo nenhum. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <mask id="cut">
              <rect width="100" height="100" fill="white" />
              <ellipse
                cx={GUIDE.cx * 100}
                cy={GUIDE.cy * 100}
                rx={GUIDE.r * 100}
                ry={GUIDE.r * 118}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100" height="100" fill="rgb(0 0 0 / 0.45)" mask="url(#cut)" />
        </svg>

        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
        >
          <ellipse
            cx={GUIDE.cx * 100}
            cy={GUIDE.cy * 100}
            rx={GUIDE.r * 100}
            ry={GUIDE.r * 118}
            fill="none"
            stroke={status === 'ideal' ? 'rgb(122 155 118)' : 'rgb(255 255 255 / 0.85)'}
            strokeWidth="0.6"
            strokeDasharray={status === 'ideal' ? undefined : '3 2'}
            className="transition-all duration-300"
          />
          <line
            x1={(GUIDE.cx - GUIDE.r) * 100}
            y1={GUIDE.cy * 100}
            x2={(GUIDE.cx + GUIDE.r) * 100}
            y2={GUIDE.cy * 100}
            stroke="rgb(255 255 255 / 0.6)"
            strokeWidth="0.3"
            strokeDasharray="2 2"
          />
        </svg>

        <div className="absolute inset-x-0 top-4 flex justify-center px-5">
          <motion.div
            layout
            className={cn(
              'rounded-pill px-4 py-2 backdrop-blur-md',
              status === 'ideal' ? 'bg-sage/90' : 'bg-ink/70',
            )}
          >
            <p className="text-14 font-medium text-white text-center">{FRAMING_COPY[status]}</p>
          </motion.div>
        </div>

        <div className="absolute inset-x-0 bottom-4 px-5">
          <p className="text-12 text-white/70 text-center leading-relaxed">
            Fotografe {babyName} de cima, com a câmera paralela ao chão.
          </p>
        </div>
      </div>

      <div className="px-5 py-5 flex items-center justify-center gap-6 bg-canvas">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={shoot}
          disabled={!ready || busy}
          aria-label="Capturar foto"
          className={cn(
            'relative grid place-items-center w-18 h-18 rounded-pill',
            'ring-4 ring-line disabled:opacity-40 transition-opacity',
          )}
          style={{ width: 72, height: 72 }}
        >
          <span className="absolute inset-1.5 rounded-pill bg-amber shadow-lift" />
          <Camera size={24} className="relative text-white" />
        </motion.button>
      </div>
    </div>
  );
}

/* ─────────────────────── captura de ângulo ─────────────────────── */

/**
 * Captura LIVRE, para os ângulos complementares. Diferente do CameraView de
 * cima: sem detecção de cabeça, sem trava de enquadramento, sem "de cima" — só
 * a dica do ângulo e o disparo. Estas fotos documentam, não medem, então não
 * faz sentido impor a mesma régua da foto que vira índice.
 */
function AngleCapture({
  angle,
  babyName,
  onDone,
  onCancel,
  progress,
  onSkip,
}: {
  angle: AngleKey;
  babyName: string;
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
  /** Presente só no tour guiado — mostra "1 de 6" e habilita pular. */
  progress?: { current: number; total: number };
  onSkip?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setDenied(true);
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = async () => {
    const video = videoRef.current;
    if (!video) return;
    setBusy(true);
    const canvas = document.createElement('canvas');
    const side = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      side,
      side,
    );
    const url = await compressImage(canvas);
    setBusy(false);
    onDone(url);
  };

  if (denied) {
    return (
      <div className="flex-1 flex flex-col px-5 pb-8">
        <Card tone="sky" className="text-center">
          <span className="inline-grid place-items-center w-12 h-12 rounded-pill bg-sky/25 text-sky-ink mb-3">
            <Camera size={20} />
          </span>
          <h2 className="text-20 text-sky-ink mb-2">Sem acesso à câmera</h2>
          <p className="text-14 text-sky-ink/85 leading-relaxed">
            Libere a câmera nas permissões, ou escolha uma foto que já tirou deste ângulo.
          </p>
        </Card>
        <div className="flex-1" />
        <div className="space-y-3 mt-6">
          <PickFromGallery
            onPicked={async (canvas) => onDone(await compressImage(canvas))}
          />

          {DEMO_MODE && (
            <Button size="lg" fullWidth variant="ghost" onClick={() => onDone(simulatedAngle(angle))}>
              <Wand2 size={18} />
              Usar foto simulada (demo)
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={onSkip ?? onCancel}>
            {onSkip ? 'Pular este ângulo' : 'Cancelar'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative flex-1 bg-ink overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        {!ready && <div className="absolute inset-0 skeleton rounded-none" />}

        <div className="absolute inset-x-0 top-4 flex flex-col items-center gap-2 px-5">
          {progress && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: progress.total }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-pill transition-all',
                    i + 1 === progress.current
                      ? 'w-5 bg-white'
                      : i + 1 < progress.current
                        ? 'w-1.5 bg-white/80'
                        : 'w-1.5 bg-white/30',
                  )}
                />
              ))}
            </div>
          )}
          <div className="rounded-pill px-4 py-2 backdrop-blur-md bg-ink/70">
            <p className="text-14 font-medium text-white text-center">
              {ANGLE_LABELS[angle]}
              {progress && (
                <span className="text-white/70 font-normal">
                  {' · '}
                  {progress.current} de {progress.total}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-4 px-5">
          <p className="text-12 text-white/75 text-center leading-relaxed">
            {babyName}: {ANGLE_HINTS[angle]}
          </p>
        </div>
      </div>

      <div className="px-5 py-5 bg-canvas">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onCancel}
            className="text-14 text-muted hover:text-ink transition-colors w-14 text-left"
          >
            {progress ? 'Sair' : 'Cancelar'}
          </button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={shoot}
            disabled={!ready || busy}
            aria-label={`Capturar ${ANGLE_LABELS[angle]}`}
            className="relative grid place-items-center rounded-pill ring-4 ring-line disabled:opacity-40 transition-opacity"
            style={{ width: 72, height: 72 }}
          >
            <span className="absolute inset-1.5 rounded-pill bg-sky shadow-lift" />
            <Camera size={24} className="relative text-white" />
          </motion.button>
          {onSkip ? (
            <button
              onClick={onSkip}
              className="text-14 text-muted hover:text-ink transition-colors w-14 text-right"
            >
              Pular
            </button>
          ) : (
            <span className="w-14" />
          )}
        </div>
        {onSkip && (
          <p className="text-11 text-muted text-center mt-3">
            Pode pular os que não conseguir agora e voltar depois.
          </p>
        )}
      </div>
    </div>
  );
}

/** Placeholder de demo para um ângulo, quando não há câmera. Deixa claro que é
 *  simulado — não finge ser uma foto real da cabeça do bebê. */
function simulatedAngle(angle: AngleKey): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#eef4f8"/>
    <circle cx="200" cy="175" r="88" fill="#d7e6ef"/>
    <path d="M200 90 a85 85 0 0 1 0 170" fill="#c2d8e6"/>
    <text x="200" y="330" text-anchor="middle" font-family="system-ui" font-size="22" fill="#3d6074">${ANGLE_LABELS[angle]}</text>
    <text x="200" y="358" text-anchor="middle" font-family="system-ui" font-size="14" fill="#6b8ba0">foto simulada (demo)</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* ─────────────────────────── pontos ─────────────────────────── */

function PointsPhase({
  image,
  points,
  onChange,
  onDone,
}: {
  image: string;
  points: ReferencePoints;
  onChange: (p: ReferencePoints) => void;
  onDone: () => void;
}) {
  const [active, setActive] = useState<PointKey>('frenteEsq');
  const [touched, setTouched] = useState<Set<PointKey>>(new Set());

  const estimate = calculateSymmetry(points);
  const allTouched = POINT_KEYS.every((k) => touched.has(k));

  return (
    <div className="flex-1 flex flex-col px-5 pb-8">
      <Card tone="sky" className="mb-4 flex items-start gap-3">
        <Sparkles size={16} className="text-sky-ink mt-0.5 shrink-0" />
        <p className="text-14 text-sky-ink leading-relaxed">
          O app <strong>sugeriu</strong> uma posição inicial para os 4 pontos. Ela é um chute
          educado — quem confirma é você. Arraste cada um até a borda da cabecinha.
        </p>
      </Card>

      <PointEditor
        image={image}
        points={points}
        active={active}
        onActiveChange={setActive}
        onChange={(p, key) => {
          onChange(p);
          setTouched((t) => new Set(t).add(key));
        }}
      />

      <div className="mt-4 flex gap-1.5">
        {POINT_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setActive(k)}
            className={cn(
              'flex-1 h-1.5 rounded-pill transition-colors',
              active === k ? 'bg-amber' : touched.has(k) ? 'bg-sage' : 'bg-line',
            )}
            aria-label={POINT_LABELS[k]}
          />
        ))}
      </div>

      <div className="mt-3">
        <p className="text-14 font-medium text-ink">{POINT_LABELS[active]}</p>
        <p className="text-14 text-muted leading-relaxed mt-0.5">{POINT_HINTS[active]}</p>
      </div>

      <Card className="mt-5">
        <IndexReadout estimate={estimate} size="sm" />
      </Card>

      <div className="flex-1" />

      <Button size="lg" fullWidth onClick={onDone} className="mt-6">
        {allTouched ? 'Confirmar estimativa' : 'Usar a sugestão do app'}
      </Button>
      {!allTouched && (
        <p className="text-12 text-muted text-center mt-3 leading-relaxed">
          Você ainda não ajustou todos os pontos. A estimativa fica mais confiável se você conferir
          cada um.
        </p>
      )}
    </div>
  );
}

function SavedOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-canvas/90 backdrop-blur-sm"
    >
      <div className="text-center px-8">
        {/* Check que se desenha. Nada de confete: o tom é cuidado, não vitória. */}
        <motion.svg
          viewBox="0 0 64 64"
          className="w-20 h-20 mx-auto mb-5"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <motion.circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="rgb(var(--sage))"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
          <motion.path
            d="M 20 33 L 28 41 L 44 24"
            fill="none"
            stroke="rgb(var(--sage))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
          />
        </motion.svg>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-24 mb-2">Semana registrada</h2>
          <p className="text-14 text-muted leading-relaxed">
            Mais um ponto na curva de vocês.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
