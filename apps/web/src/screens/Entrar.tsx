import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MailCheck, MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { supabase } from '@/lib/supabase';

/**
 * Saída de emergência da tela de entrada — o mesmo número que já atende na
 * landing. Existe porque dois erros desta tela deixam um cliente que PAGOU sem
 * ter a quem recorrer: o e-mail ainda não liberado (a liberação é manual hoje)
 * e o teto de envio de e-mail do Supabase, que estoura quando várias pessoas
 * compram na mesma hora. Deixe em branco para esconder o botão.
 */
const SUPORTE_WHATSAPP =
  'https://wa.me/5532984865656?text=' +
  encodeURIComponent('Olá! Comprei o SimetriApp e não estou conseguindo entrar no app.');

/**
 * Entrada por link no e-mail. Sem senha para criar, esquecer ou recuperar — e o
 * e-mail já é o mesmo da compra, então a mãe não precisa inventar credencial
 * nenhuma no momento em que só quer ver o app que acabou de pagar.
 *
 * A checagem de acesso é feita por uma função no banco (`email_liberado`), que
 * responde apenas sim ou não: a lista de compradores nunca chega ao navegador.
 */
export function Entrar() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'form' | 'enviando' | 'enviado'>('form');
  const [erro, setErro] = useState<string | null>(null);
  const [ofereceSuporte, setOfereceSuporte] = useState(false);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!supabase) return;

    const endereco = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(endereco)) {
      setErro('Confira o endereço de e-mail.');
      return;
    }

    setEstado('enviando');
    setErro(null);
    setOfereceSuporte(false);

    const { data: liberado, error: erroChecagem } = await supabase.rpc('email_liberado', {
      endereco,
    });

    if (erroChecagem) {
      setEstado('form');
      setErro('Não conseguimos verificar agora. Tente de novo em instantes.');
      setOfereceSuporte(true);
      return;
    }

    if (!liberado) {
      setEstado('form');
      // Erro que um comprador LEGÍTIMO vê enquanto o acesso não foi liberado.
      setErro(
        'Não encontramos uma compra com esse e-mail. Confira se é o mesmo que você usou no pagamento — se for, o acesso pode ainda não ter sido liberado.',
      );
      setOfereceSuporte(true);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: endereco,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setEstado('form');
      // O teto de e-mail do Supabase é do PROJETO, não por destinatário, e
      // devolve 429. "Tente de novo" faz parecer defeito do app, e o cliente
      // insiste — o que só piora o bloqueio.
      const limite =
        (error as { status?: number }).status === 429 ||
        /rate|limit|too many/i.test(error.message ?? '');
      setErro(
        limite
          ? 'Muitos links foram pedidos agora há pouco. Espere uns minutos e tente de novo — ou fale com a gente que a gente resolve na hora.'
          : 'Não conseguimos enviar o link agora. Tente de novo em instantes.',
      );
      setOfereceSuporte(true);
      return;
    }

    setEstado('enviado');
  };

  if (estado === 'enviado') {
    return (
      <div className="min-h-dvh grid place-items-center px-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card tone="sky" className="text-center max-w-[420px]">
            <span className="inline-grid place-items-center w-12 h-12 rounded-pill bg-sky/25 text-sky-ink mb-3">
              <MailCheck size={20} />
            </span>
            <h1 className="text-20 text-sky-ink mb-2">Link enviado</h1>
            <p className="text-14 text-sky-ink/85 leading-relaxed">
              Abra o e-mail que acabamos de mandar para <strong>{email.trim()}</strong> e toque no
              link para entrar. Ele vale por uma hora.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-5"
              onClick={() => setEstado('form')}
            >
              Usar outro e-mail
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid place-items-center px-5">
      <motion.form
        onSubmit={enviar}
        // A validação é nossa: sem isso o navegador barra o envio com a própria
        // mensagem e a explicação em português nunca aparece.
        noValidate
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px]"
      >
        <Card>
          <span className="inline-grid place-items-center w-12 h-12 rounded-pill bg-raised text-muted mb-3">
            <Mail size={20} />
          </span>

          <h1 className="text-24 text-ink mb-1.5">Entrar</h1>
          <p className="text-14 text-muted leading-relaxed mb-5">
            Digite o e-mail que você usou na compra. Enviamos um link e você entra sem precisar de
            senha.
          </p>

          <Field
            label="Seu e-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={erro}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            className="mt-5"
            loading={estado === 'enviando'}
            disabled={estado === 'enviando'}
          >
            {estado === 'enviando' ? 'Enviando…' : 'Receber meu link'}
          </Button>

          {ofereceSuporte && SUPORTE_WHATSAPP && (
            <a
              href={SUPORTE_WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full rounded-pill border border-line px-4 py-3 text-14 font-medium text-ink hover:bg-raised transition-colors"
            >
              <MessageCircle size={16} />
              Falar com a gente no WhatsApp
            </a>
          )}
        </Card>
      </motion.form>
    </div>
  );
}
