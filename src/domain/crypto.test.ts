import { describe, expect, it } from 'vitest'
import { decrypt, encrypt, isVault, newKey, openVault, passwordProblem, WrongPasswordError } from './crypto'

// Poucas iterações só para os testes serem rápidos; a app usa PBKDF2_ITERATIONS.
const FAST = 1_000

describe('cofre encriptado', () => {
  it('encripta e desencripta com a mesma palavra-passe', async () => {
    const key = await newKey('uma frase secreta', FAST)
    const vault = await encrypt('{"salario":1800}', key)
    expect(isVault(vault)).toBe(true)
    expect(vault.data).not.toContain('salario')
    const { plaintext } = await openVault(vault, 'uma frase secreta')
    expect(plaintext).toBe('{"salario":1800}')
  })

  it('recusa a palavra-passe errada', async () => {
    const vault = await encrypt('dados', await newKey('palavra certa', FAST))
    await expect(openVault(vault, 'palavra errada')).rejects.toBeInstanceOf(WrongPasswordError)
  })

  it('usa um IV diferente em cada gravação', async () => {
    const key = await newKey('uma frase secreta', FAST)
    const a = await encrypt('igual', key)
    const b = await encrypt('igual', key)
    expect(a.iv).not.toBe(b.iv)
    expect(a.data).not.toBe(b.data)
  })

  it('deteta dados alterados', async () => {
    const key = await newKey('uma frase secreta', FAST)
    const vault = await encrypt('dados importantes', key)
    const bytes = atob(vault.data).split('')
    bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 1)
    await expect(decrypt({ ...vault, data: btoa(bytes.join('')) }, key)).rejects.toBeInstanceOf(WrongPasswordError)
  })

  it('cada palavra-passe nova tem um sal novo', async () => {
    const a = await encrypt('x', await newKey('mesma palavra', FAST))
    const b = await encrypt('x', await newKey('mesma palavra', FAST))
    expect(a.salt).not.toBe(b.salt)
  })
})

describe('passwordProblem', () => {
  it('exige pelo menos 10 caracteres', () => {
    expect(passwordProblem('curta')).not.toBeNull()
    expect(passwordProblem('aaaaaaaaaaaa')).not.toBeNull()
    expect(passwordProblem('cafe com leite')).toBeNull()
  })
})
