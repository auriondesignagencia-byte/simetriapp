/**
 * Sincronização com a nuvem.
 *
 * O estado do app continua sendo um objeto só — o que muda é onde ele mora.
 * Aqui ele vai para a tabela `estado_app`, uma linha por usuário, e as fotos
 * saem de dentro dele: sobem para o Storage e ficam referenciadas por caminho.
 *
 * Por que as fotos não vão no JSON: elas são base64 e pesam ~250 KB cada. Com
 * quatro por semana, o registro do ano passaria de 40 MB — inviável para trafegar
 * a cada gravação. No Storage, cada foto sobe uma vez só.
 *
 * As telas não sabem de nada disso: continuam lendo `imageUrl`. Ao carregar, os
 * caminhos viram URLs assinadas e temporárias; ao salvar, o base64 vira caminho.
 */

import { BUCKET_FOTOS, supabase } from './supabase';

/** Uma foto guardada: ou base64 recém-tirada, ou já no Storage. */
interface ComFoto {
  imageUrl?: string;
  /** Caminho no Storage. Quando existe, `imageUrl` é derivada dele. */
  storagePath?: string;
  angles?: { angle: string; imageUrl?: string; storagePath?: string; takenAt?: string }[];
}

const ehBase64 = (v?: string) => Boolean(v && v.startsWith('data:'));

function base64ParaBlob(dataUrl: string): Blob {
  const [cabecalho, dados] = dataUrl.split(',');
  const tipo = cabecalho.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const binario = atob(dados);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

async function subirFoto(userId: string, dataUrl: string): Promise<string | null> {
  if (!supabase) return null;
  const nome = `${crypto.randomUUID()}.jpg`;
  const caminho = `${userId}/${nome}`;
  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(caminho, base64ParaBlob(dataUrl), { contentType: 'image/jpeg', upsert: false });
  return error ? null : caminho;
}

/** Troca base64 por caminho do Storage, subindo o que ainda não subiu. */
async function externalizarFotos<T extends ComFoto>(userId: string, item: T): Promise<T> {
  const saida: T = { ...item };

  if (ehBase64(saida.imageUrl) && !saida.storagePath) {
    const caminho = await subirFoto(userId, saida.imageUrl as string);
    if (caminho) {
      saida.storagePath = caminho;
      delete saida.imageUrl;
    }
  }

  if (saida.angles?.length) {
    saida.angles = await Promise.all(
      saida.angles.map(async (a) => {
        if (!ehBase64(a.imageUrl) || a.storagePath) return a;
        const caminho = await subirFoto(userId, a.imageUrl as string);
        if (!caminho) return a;
        const { imageUrl: _descartado, ...resto } = a;
        return { ...resto, storagePath: caminho };
      }),
    );
  }

  return saida;
}

/** Caminho do Storage vira URL assinada, para as telas exibirem sem saber de nada. */
async function assinarFotos<T extends ComFoto>(item: T): Promise<T> {
  if (!supabase) return item;
  const saida: T = { ...item };

  if (saida.storagePath && !saida.imageUrl) {
    const { data } = await supabase.storage
      .from(BUCKET_FOTOS)
      .createSignedUrl(saida.storagePath, 60 * 60);
    if (data?.signedUrl) saida.imageUrl = data.signedUrl;
  }

  if (saida.angles?.length) {
    saida.angles = await Promise.all(
      saida.angles.map(async (a) => {
        if (!a.storagePath || a.imageUrl) return a;
        const { data } = await supabase!.storage
          .from(BUCKET_FOTOS)
          .createSignedUrl(a.storagePath, 60 * 60);
        return data?.signedUrl ? { ...a, imageUrl: data.signedUrl } : a;
      }),
    );
  }

  return saida;
}

/** O que a sincronização precisa saber do estado: só onde estão as fotos. */
type EstadoComEntradas = { entries?: ComFoto[] };

/** Lê o estado do usuário e prepara as fotos para exibição. */
export async function baixarEstado<T extends EstadoComEntradas>(
  userId: string,
): Promise<T | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('estado_app')
    .select('dados')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.dados) return null;

  const estado = data.dados as T;
  if (!estado.entries?.length) return estado;

  return { ...estado, entries: await Promise.all(estado.entries.map(assinarFotos)) };
}

/**
 * Grava o estado do usuário. As URLs assinadas são descartadas antes de subir —
 * elas expiram, e guardá-las encheria a linha de lixo.
 */
export async function subirEstado<T extends EstadoComEntradas>(
  userId: string,
  estado: T,
): Promise<boolean> {
  if (!supabase) return false;

  let entries = estado.entries;
  if (entries?.length) {
    entries = await Promise.all(entries.map((e) => externalizarFotos(userId, e)));
    entries = entries.map((e) => {
      const limpo = { ...e };
      if (limpo.storagePath) delete limpo.imageUrl;
      limpo.angles = limpo.angles?.map((a) => {
        if (!a.storagePath) return a;
        const { imageUrl: _expirada, ...resto } = a;
        return resto;
      });
      return limpo;
    });
  }

  const { error } = await supabase
    .from('estado_app')
    .upsert(
      { user_id: userId, dados: { ...estado, entries }, atualizado_em: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  return !error;
}
