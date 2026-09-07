/**
 * Constantes de los codigos, sin ninguna dependencia. Existe aparte de
 * `lib/codigo.ts` para que el navegador pueda usarlas sin arrastrar
 * `node:crypto` ni el SDK de Stellar al bundle del asistente.
 */

/**
 * Alfabeto Crockford base32, sin las letras que se confunden al leer un papel
 * en una sala mal iluminada: no hay I, L, O ni U.
 */
export const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 12 caracteres de 32 simbolos = 60 bits de entropia. */
export const LARGO_CODIGO = 12;

/** Se imprime en grupos de cuatro para que se pueda dictar y tipear. */
export const TAMANO_GRUPO = 4;
