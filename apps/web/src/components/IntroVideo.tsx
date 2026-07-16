import { useState } from 'react';
import { Play, Stethoscope, X } from 'lucide-react';
import { Card, CardLabel } from '@/components/ui/Card';

/**
 * Vídeo de boas-vindas do ortopedista, no topo da Home.
 *
 * Preencha estes dois campos com o vídeo real do profissional. Enquanto
 * `INTRO_VIDEO_URL` estiver vazio, o card mostra um espaço reservado honesto
 * ("o vídeo entra aqui") em vez de fingir que já existe conteúdo.
 *
 * - INTRO_VIDEO_URL: caminho/URL do vídeo (mp4/webm) OU um embed. Se for um
 *   arquivo, use <video>; se preferir um player externo, troque por um <iframe>.
 * - INTRO_VIDEO_POSTER: imagem de capa (opcional).
 */
export const INTRO_VIDEO_URL = '';
export const INTRO_VIDEO_POSTER = '';
export const INTRO_VIDEO_DOCTOR = 'seu ortopedista';

const DISMISS_KEY = 'simetriapp:introVideoDismissed';

export function IntroVideo() {
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1',
  );
  const [playing, setPlaying] = useState(false);

  if (dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* modo privado: tudo bem, some só nesta sessão */
    }
  };

  return (
    <Card tone="sky" className="relative overflow-hidden !p-0">
      <button
        onClick={close}
        aria-label="Fechar apresentação"
        className="absolute top-2.5 right-2.5 z-10 grid place-items-center w-8 h-8 rounded-pill bg-ink/40 text-white backdrop-blur-sm hover:bg-ink/60 transition-colors"
      >
        <X size={16} />
      </button>

      {INTRO_VIDEO_URL ? (
        <div className="relative aspect-video bg-ink">
          {playing ? (
            <video
              src={INTRO_VIDEO_URL}
              poster={INTRO_VIDEO_POSTER || undefined}
              controls
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <button
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 w-full h-full"
              aria-label="Assistir apresentação do ortopedista"
            >
              {INTRO_VIDEO_POSTER ? (
                <img src={INTRO_VIDEO_POSTER} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-sky/30 to-ink/40" />
              )}
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid place-items-center w-16 h-16 rounded-pill bg-white/90 text-sky-ink shadow-lift transition-transform group-hover:scale-105">
                  <Play size={26} className="translate-x-0.5" fill="currentColor" />
                </span>
              </span>
            </button>
          )}
        </div>
      ) : (
        /* Espaço reservado: onde o vídeo do ortopedista vai entrar. */
        <div className="relative aspect-video bg-sky-soft grid place-items-center border-b border-line">
          <div className="text-center px-6">
            <span className="inline-grid place-items-center w-14 h-14 rounded-pill bg-sky/25 text-sky-ink mb-3">
              <Stethoscope size={24} />
            </span>
            <p className="text-14 font-medium text-sky-ink">O vídeo do ortopedista entra aqui</p>
            <p className="text-12 text-sky-ink/75 mt-1 leading-relaxed">
              Uma apresentação curta explicando o método para os pais.
            </p>
          </div>
        </div>
      )}

      <div className="p-5">
        <CardLabel className="text-sky-ink/70">Comece por aqui</CardLabel>
        <h2 className="text-18 text-sky-ink mt-1">Uma palavra de {INTRO_VIDEO_DOCTOR}</h2>
        <p className="text-14 text-sky-ink/80 leading-relaxed mt-1.5">
          Antes de tirar as fotos, entenda em um minuto como o acompanhamento funciona e por que a
          regularidade importa.
        </p>
      </div>
    </Card>
  );
}
