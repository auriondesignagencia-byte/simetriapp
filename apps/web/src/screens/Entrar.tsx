import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MailCheck } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { supabase } from '@/lib/supabase';

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

    const { data: liberado, error: erroChecagem } = await supabase.rpc('email_liberado', {
      endereco,
    });

    if (erroChecagem) {
      setEstado('form');
      setErro('Não conseguimos verificar agora. Tente de novo em instantes.');
      return;
    }

    if (!liberado) {
      setEstado('form');
      setErro(
        'Não encontramos uma compra com esse e-mail. Use o mesmo endereço que você usou para comprar, ou fale com a gente.',
      );
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: endereco,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setEstado('form');
      setErro('Não conseguimos enviar o link agora. Tente de novo em instantes.');
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
        </Card>
      </motion.form>
    </div>
  );
}
