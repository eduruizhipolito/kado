import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { Red } from './config';

/**
 * El manifiesto de una tanda. Es publico y se versiona: no contiene ningun
 * codigo ni clave secreta, solo las claves publicas de los Kados y sus balance
 * id, que ya son visibles en la cadena.
 *
 * Los codigos imprimibles salen en un CSV aparte que nunca se commitea.
 */
export type Tanda = {
  id: string;
  evento: string;
  /** Fecha del evento, `YYYY-MM-DD`. */
  fecha: string;
  red: Red;
  activo: { codigo: string; emisor: string | null };
  /** Monto por Kado en unidades del activo, con siete decimales. */
  montoPorKado: string;
  /** Valor en dolares fijado al generar la tanda. Null si el Kado va en XLM sin equivalencia. */
  valorUsd: string | null;
  /** Tasa usada para fijar el valor, en dolares por unidad del activo. */
  tasaUsdPorUnidad: string | null;
  expiraEn: string;
  generadaEn: string;
  hashes: string[];
  kados: { publicKey: string; balanceId: string }[];
};

export const CARPETA_TANDAS = join(process.cwd(), 'tandas');

export function leerTandas(): Tanda[] {
  let archivos: string[];
  try {
    archivos = readdirSync(CARPETA_TANDAS).filter((n) => n.endsWith('.json'));
  } catch {
    return []; // Todavia no se genero ninguna tanda.
  }

  return archivos
    .map((nombre) => JSON.parse(readFileSync(join(CARPETA_TANDAS, nombre), 'utf8')) as Tanda)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/**
 * Encuentra a que tanda pertenece un Kado, a partir de su clave publica.
 *
 * Este es el unico lugar donde el sistema necesita saber algo que no esta en la
 * cadena: cuanto vale el Kado en dolares. El monto on-chain esta en XLM.
 */
export function buscarTandaPorKado(publicKey: string): Tanda | null {
  for (const tanda of leerTandas()) {
    if (tanda.kados.some((k) => k.publicKey === publicKey)) return tanda;
  }
  return null;
}
