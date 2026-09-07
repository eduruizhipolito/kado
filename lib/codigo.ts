import { scryptSync } from 'node:crypto';

import { Keypair } from '@stellar/stellar-sdk';

import { ALFABETO, LARGO_CODIGO, TAMANO_GRUPO } from './constantes';

/**
 * El codigo impreso es el Kado. No hay base de datos que lo respalde: el codigo
 * deriva el keypair, y el keypair encuentra su claimable balance en Horizon.
 */
export { ALFABETO, LARGO_CODIGO } from './constantes';

/**
 * Parametros de scrypt. El costo esta del lado del servidor, una vez por
 * apertura, asi que puede ser alto: encarece un ataque por enumeracion sin
 * que el asistente note nada.
 */
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, largoClave: 32 } as const;

/** Genera un codigo nuevo con entropia criptografica. */
export function generarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LARGO_CODIGO));
  let codigo = '';
  // El sesgo de tomar el modulo sobre 256 con un alfabeto de 32 es nulo:
  // 256 es multiplo exacto de 32.
  for (const byte of bytes) codigo += ALFABETO[byte % ALFABETO.length];
  return codigo;
}

/**
 * Normaliza lo que el asistente tipeo. Acepta minusculas, espacios y guiones, y
 * corrige las confusiones clasicas de lectura: O por 0, I y L por 1.
 * Devuelve `null` si no queda un codigo valido.
 */
export function normalizarCodigo(entrada: string): string | null {
  const limpio = entrada
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');

  if (limpio.length !== LARGO_CODIGO) return null;
  for (const caracter of limpio) {
    if (!ALFABETO.includes(caracter)) return null;
  }
  return limpio;
}

/** Formatea para imprimir: `K4D0-7BQX-M2VN`. */
export function formatearCodigo(codigo: string): string {
  const grupos: string[] = [];
  for (let i = 0; i < codigo.length; i += TAMANO_GRUPO) {
    grupos.push(codigo.slice(i, i + TAMANO_GRUPO));
  }
  return grupos.join('-');
}

/**
 * Deriva el keypair del Kado a partir del codigo. Deterministico: el mismo
 * codigo y la misma sal dan siempre la misma cuenta.
 *
 * Cambiar `sal` invalida todos los codigos ya impresos.
 */
export function keypairDesdeCodigo(codigo: string, sal: string): Keypair {
  const semilla = scryptSync(codigo, sal, SCRYPT.largoClave, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    // scrypt con N alto necesita mas memoria que el limite por defecto de Node.
    maxmem: 256 * 1024 * 1024,
  });
  return Keypair.fromRawEd25519Seed(semilla);
}
