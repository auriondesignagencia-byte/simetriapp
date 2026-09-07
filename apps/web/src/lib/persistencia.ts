/**
 * Persistência do estado do app.
 *
 * Antes o estado inteiro vivia no localStorage — e as fotos vão dentro dele, em
 * base64. O localStorage tem ~5 MB por origem (medido: 4,7 MB no Chrome). Cada
 * semana guarda a foto principal mais até três ângulos, algo perto de 1 MB, o que
 * estourava o limite por volta da semana 5. Pior: o `setItem` falhava em silêncio,
 * então a mãe registrava a semana, via tudo certo na tela, fechava o app e perdia.
 *
 * O IndexedDB não tem esse teto (é da ordem de centenas de MB, proporcional ao
 * disco livre). Continua tudo no aparelho, sem servidor e sem login.
 *
 * O localStorage segue como plano B: se o IndexedDB não estiver disponível
 * (navegador antigo, modo privado de alguns browsers), o app volta a funcionar
 * como antes em vez de simplesmente não salvar.
 */

const DB_NAME = 'simetriapp';
const DB_VERSION = 1;
const STORE = 'estado';
const CHAVE = 'atual';

/** Chave antiga, do tempo em que tudo cabia no localStorage. */
export const CHAVE_LEGADO = 'simetriapp.state.v1';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function temIndexedDB(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Lê o estado salvo. Na primeira execução depois da migração, encontra os dados
 * antigos no localStorage, copia para o IndexedDB e limpa a chave antiga — quem
 * já usava o app não perde nada.
 */
export async function carregarEstado<T>(): Promise<T | null> {
  if (temIndexedDB()) {
    try {
      const db = await abrir();
      const doIdb = await new Promise<T | undefined>((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(CHAVE);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      });
      if (doIdb) return doIdb;

      const legado = lerLegado<T>();
      if (legado) {
        await salvarEstado(legado);
        try {
          localStorage.removeItem(CHAVE_LEGADO);
        } catch {
          /* se não der para limpar, tudo bem: o IndexedDB já tem a cópia boa */
        }
        return legado;
      }
      return null;
    } catch {
      /* IndexedDB indisponível ou bloqueado: segue para o plano B */
    }
  }
  return lerLegado<T>();
}

function lerLegado<T>(): T | null {
  try {
    const raw = localStorage.getItem(CHAVE_LEGADO);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Grava o estado. Retorna `false` quando não conseguiu gravar em lugar nenhum —
 * quem chama decide o que dizer ao usuário. Falhar em silêncio foi exatamente o
 * que fez o app perder registros antes.
 */
export async function salvarEstado(estado: unknown): Promise<boolean> {
  if (temIndexedDB()) {
    try {
      const db = await abrir();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(estado, CHAVE);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      return true;
    } catch {
      /* cai no plano B */
    }
  }

  try {
    localStorage.setItem(CHAVE_LEGADO, JSON.stringify(estado));
    return true;
  } catch {
    return false;
  }
}

/**
 * Direito ao esquecimento: apaga dos DOIS lugares. Se limpasse só o localStorage,
 * o histórico continuaria no IndexedDB e voltaria na próxima abertura — uma
 * promessa de privacidade quebrada.
 */
export async function apagarEstado(): Promise<void> {
  if (temIndexedDB()) {
    try {
      const db = await abrir();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(CHAVE);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      /* segue para limpar o legado de qualquer forma */
    }
  }
  try {
    localStorage.removeItem(CHAVE_LEGADO);
  } catch {
    /* nada mais a fazer */
  }
}
