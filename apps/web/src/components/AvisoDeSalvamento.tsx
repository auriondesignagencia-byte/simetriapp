import { CloudOff, TriangleAlert } from 'lucide-react';
import { useApp } from '@/store/app';

/**
 * O aviso de que algo NÃO foi salvo.
 *
 * `falhaAoSalvar` e `falhaAoSincronizar` já existiam no contexto, mas nenhuma
 * tela os lia — ou seja, as duas falhas eram mudas. Num produto que pede uma
 * foto por semana durante meses, perder registro em silêncio é o pior defeito
 * possível: a mãe só descobre quando abre o histórico e ele está vazio.
 *
 * Dois estados, dois riscos diferentes:
 *  · falhaAoSalvar     → nem no aparelho ficou. Grave: perde ao fechar o app.
 *  · falhaAoSincronizar→ está no aparelho, não na conta. Perde se trocar de
 *                        celular ou limpar os dados do navegador.
 *
 * O tom é o do resto do app: diz o que aconteceu e o que fazer, sem alarme.
 */
export function AvisoDeSalvamento() {
  const { falhaAoSalvar, falhaAoSincronizar } = useApp();

  if (!falhaAoSalvar && !falhaAoSincronizar) return null;

  const grave = falhaAoSalvar;

  return (
    <div
      role="status"
      className={
        'mx-5 mt-4 flex items-start gap-3 rounded-card border p-4 ' +
        (grave ? 'border-terra/25 bg-terra-soft' : 'border-sky/25 bg-sky-soft')
      }
    >
      <span
        className={
          'grid place-items-center w-9 h-9 rounded-pill shrink-0 ' +
          (grave ? 'bg-terra/20 text-terra-ink' : 'bg-sky/25 text-sky-ink')
        }
      >
        {grave ? <TriangleAlert size={17} /> : <CloudOff size={17} />}
      </span>

      <div className={grave ? 'text-terra-ink' : 'text-sky-ink'}>
        {grave ? (
          <>
            <p className="text-14 font-medium">Não conseguimos guardar este registro</p>
            <p className="text-14 opacity-85 leading-relaxed mt-1">
              O espaço do navegador pode estar cheio ou bloqueado. Evite fechar o app e libere
              espaço no aparelho — assim que der certo, este aviso some sozinho.
            </p>
          </>
        ) : (
          <>
            <p className="text-14 font-medium">Salvo neste aparelho, ainda não na sua conta</p>
            <p className="text-14 opacity-85 leading-relaxed mt-1">
              Suas fotos e registros estão seguros aqui e continuamos tentando enviar. Enquanto
              este aviso estiver na tela, evite limpar os dados do navegador ou trocar de celular.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
