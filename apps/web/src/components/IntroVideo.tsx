import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { Card, CardLabel } from '@/components/ui/Card';

/**
 * Vídeo de boas-vindas do Dr. Diego, no topo da Home.
 *
 * O arquivo é VERTICAL (9:16, gravado no celular). Por isso o card não mostra
 * o vídeo embutido num quadro 16:9 — mostra uma miniatura em pé e abre o player
 * em tela cheia, que é onde 9:16 cabe sem cortar o rosto nem sobrar tarja.
 *
 * Para trocar o vídeo: substitua os dois arquivos em `public/videos/` e ajuste
 * a duração abaixo. Com `INTRO_VIDEO_URL` vazio o card simplesmente não aparece.
 */
export const INTRO_VIDEO_URL = '/videos/apresentacao-dr-diego.mp4';
export const INTRO_VIDEO_POSTER = '/videos/apresentacao-dr-diego.jpg';
/** Mesmo frame do poster, recortado mais perto do rosto: numa miniatura de
 *  84px o enquadramento aberto do vídeo vira um borrão. */
export const INTRO_VIDEO_CAPA = '/videos/apresentacao-dr-diego-capa.jpg';
export const INTRO_VIDEO_DOCTOR = 'Dr. Diego de Castro';
export const INTRO_VIDEO_DURACAO = '2 min';

const DISMISS_KEY = 'simetriapp:introVideoDismissed';

export function IntroVideo() {
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1',
  );
  const [playing, setPlaying] = useState(false);

  // Esc fecha e o body trava enquanto o player está aberto — mesmo contrato do
  // Sheet. Sem a trava, arrastar sobre o vídeo no iOS rola a Home por trás.
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPlaying(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [playing]);

  if (dismissed || !INTRO_VIDEO_URL) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* modo privado: tudo bem, some só nesta sessão */
    }
  };

  return (
    <>
      <Card tone="sky" className="relative !p-0">
        <button
          onClick={() => setPlaying(true)}
          className="group w-full flex items-center gap-4 p-4 pr-11 text-left rounded-card"
          aria-label={`Assistir a apresentação de ${INTRO_VIDEO_DOCTOR}, ${INTRO_VIDEO_DURACAO}`}
        >
          <span className="relative shrink-0 w-[84px] aspect-[9/16] rounded-lg overflow-hidden bg-ink/10 shadow-rest">
            <img
              src={INTRO_VIDEO_CAPA}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid place-items-center w-9 h-9 rounded-pill bg-white/90 text-sky-ink shadow-lift transition-transform duration-200 group-hover:scale-110">
                <Play size={15} className="translate-x-[1px]" fill="currentColor" />
              </span>
            </span>
          </span>

          <span className="min-w-0">
            <CardLabel className="text-sky-ink/70">Comece por aqui</CardLabel>
            <span className="block text-16 font-display font-medium text-sky-ink mt-1">
              Uma palavra do {INTRO_VIDEO_DOCTOR}
            </span>
            <span className="block text-14 text-sky-ink/80 leading-relaxed mt-1.5">
              Como o acompanhamento funciona e como preparar a foto da semana.
            </span>
            <span className="inline-flex items-center gap-1.5 text-12 font-medium text-sky-ink/70 mt-2.5">
              <Play size={11} fill="currentColor" />
              Assistir · {INTRO_VIDEO_DURACAO}
            </span>
          </span>
        </button>

        <button
          onClick={close}
          aria-label="Fechar apresentação"
          className="absolute top-2.5 right-2.5 grid place-items-center w-8 h-8 rounded-pill text-sky-ink/55 hover:bg-sky/20 hover:text-sky-ink transition-colors"
        >
          <X size={16} />
        </button>
      </Card>

      <AnimatePresence>
        {playing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Apresentação de ${INTRO_VIDEO_DOCTOR}`}
            className="fixed inset-0 z-50 bg-ink/95 backdrop-blur-sm flex items-center justify-center p-3"
          >
            <button
              onClick={() => setPlaying(false)}
              aria-label="Fechar vídeo"
              className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-10 grid place-items-center w-10 h-10 rounded-pill bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 transition-colors"
            >
              <X size={18} />
            </button>

            {/* object-contain + limite de altura: o vídeo em pé aparece inteiro
                em qualquer tela, sem corte e sem esticar. */}
            <video
              src={INTRO_VIDEO_URL}
              poster={INTRO_VIDEO_POSTER}
              controls
              autoPlay
              playsInline
              controlsList="nodownload"
              onEnded={() => setPlaying(false)}
              className="max-h-full max-w-full w-auto rounded-lg bg-black"
              style={{ aspectRatio: '9 / 16' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
