// Encriptação dos dados com uma palavra-passe, usando só a Web Crypto API do navegador.
//
// - A chave é derivada da palavra-passe com PBKDF2-SHA256 e um "sal" aleatório. As muitas
//   iterações tornam lento adivinhar a palavra-passe por força bruta.
// - Os dados são encriptados com AES-256-GCM, que também deteta se foram alterados:
//   com a palavra-passe errada, a desencriptação falha em vez de devolver lixo.
// - A palavra-passe nunca é guardada; só a chave fica em memória enquanto a app está aberta.

export const PBKDF2_ITERATIONS = 600_000

/** O que fica guardado no localStorage e nos ficheiros de backup. */
export interface Vault {
  format: 'eurocaixinha-vault'
  version: 1
  iterations: number
  salt: string // base64
  iv: string // base64
  data: string // base64 do texto encriptado
}

export interface UnlockedKey {
  key: CryptoKey
  salt: Uint8Array
  iterations: number
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Palavra-passe errada.')
  }
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), c => c.charCodeAt(0))
}

export async function deriveKey(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<UnlockedKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false, // a chave não pode ser exportada, nem por código da própria página
    ['encrypt', 'decrypt'],
  )
  return { key, salt, iterations }
}

export async function newKey(password: string, iterations = PBKDF2_ITERATIONS): Promise<UnlockedKey> {
  return deriveKey(password, crypto.getRandomValues(new Uint8Array(16)), iterations)
}

export async function encrypt(plaintext: string, k: UnlockedKey): Promise<Vault> {
  // O IV tem de ser diferente em cada encriptação com a mesma chave.
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k.key, new TextEncoder().encode(plaintext))
  return {
    format: 'eurocaixinha-vault',
    version: 1,
    iterations: k.iterations,
    salt: toBase64(k.salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(data)),
  }
}

export async function decrypt(vault: Vault, k: UnlockedKey): Promise<string> {
  try {
    const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(vault.iv) as BufferSource }, k.key, fromBase64(vault.data) as BufferSource)
    return new TextDecoder().decode(data)
  } catch {
    throw new WrongPasswordError()
  }
}

/** Deriva a chave a partir do sal guardado no cofre e desencripta. */
export async function openVault(vault: Vault, password: string): Promise<{ plaintext: string; key: UnlockedKey }> {
  const key = await deriveKey(password, fromBase64(vault.salt), vault.iterations)
  return { plaintext: await decrypt(vault, key), key }
}

export function isVault(value: unknown): value is Vault {
  const v = value as Vault
  return v?.format === 'eurocaixinha-vault' && v.version === 1 && typeof v.data === 'string'
}

/** Mínimo razoável. Uma frase com várias palavras é mais forte e mais fácil de lembrar. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return 'Usa pelo menos 10 caracteres. Uma frase curta funciona bem.'
  if (/^(.)\1+$/.test(password)) return 'Não uses o mesmo caractere repetido.'
  return null
}
