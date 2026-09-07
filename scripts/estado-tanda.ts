/**
 * Estado de una tanda: que Kados siguen disponibles y cuales ya se abrieron.
 *
 *   npx tsx --env-file-if-exists=.env scripts/estado-tanda.ts --tanda 2026-09-08-demo
 *
 * Cruza el CSV local de codigos (tandas/<id>.codigos.csv) con el estado on-chain
 * de cada Kado. El CSV nunca se versiona: este script corre solo en la maquina
 * del organizador, la unica que tiene los codigos impresos. Sin el CSV igual
 * funciona, mostrando la clave publica en vez del codigo.
 *
 * Sin --tanda, lista las tandas que hay en tandas/.
 *
 * Banderas:
 *   --markdown   imprime la tabla de los codigos DISPONIBLES, lista para pegar
 *                en el README como el bloque de codigos de la demo.
 *   --n <N>      cuantos codigos incluir en la salida --markdown (por defecto 10).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RED } from '@/lib/config';
import { leerEstado, type EstadoKado } from '@/lib/stellar';
import { CARPETA_TANDAS, leerTandas, type Tanda } from '@/lib/tanda';

// --------------------------------------------------------------- argumentos

function argumentos(): Map<string, string> {
  const mapa = new Map<string, string>();
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue;
    const clave = args[i].slice(2);
    const valor = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'si';
    mapa.set(clave, valor);
  }
  return mapa;
}

const args = argumentos();
const idTanda = args.get('tanda');

// ------------------------------------------------------------- listar tandas

if (!idTanda) {
  const tandas = leerTandas();
  if (tandas.length === 0) {
    console.log('No hay tandas en tandas/. Genera una con: npm run generar-tanda');
    process.exit(0);
  }
  console.log('Tandas disponibles (pasa --tanda <id>):\n');
  for (const t of tandas) {
    console.log(`  ${t.id}   ${t.evento}  ·  ${t.kados.length} Kados  ·  ${t.red}`);
  }
  process.exit(0);
}

// ------------------------------------------------------------- leer manifiesto

const rutaManifiesto = join(CARPETA_TANDAS, `${idTanda}.json`);
let manifiesto: Tanda;
try {
  manifiesto = JSON.parse(readFileSync(rutaManifiesto, 'utf8')) as Tanda;
} catch {
  console.error(`No se pudo leer ${rutaManifiesto}. Corre el script sin --tanda para ver las que hay.`);
  process.exit(1);
}

if (manifiesto.red !== RED) {
  console.error(
    `La tanda es de ${manifiesto.red} y el entorno apunta a ${RED}. ` +
      `Ajusta KADO_RED en .env para consultarla.`,
  );
  process.exit(1);
}

// Mapa clave publica -> codigo impreso, si el CSV esta.
const codigoPorClave = new Map<string, string>();
try {
  const lineas = readFileSync(join(CARPETA_TANDAS, `${idTanda}.codigos.csv`), 'utf8')
    .trim()
    .split('\n')
    .slice(1);
  for (const linea of lineas) {
    const [, impreso, , publicKey] = linea.split(',');
    if (publicKey) codigoPorClave.set(publicKey.trim(), impreso.trim());
  }
} catch {
  console.log(`(sin ${idTanda}.codigos.csv: se muestran las claves publicas en vez de los codigos)\n`);
}

// --------------------------------------------------------------- estado on-chain

/** Cuantas cuentas se consultan a la vez sin castigar el limite de Horizon. */
const CONCURRENCIA = 8;

type Fila = { etiqueta: string; estado: EstadoKado['estado'] };

const filas: Fila[] = [];
for (let i = 0; i < manifiesto.kados.length; i += CONCURRENCIA) {
  const lote = manifiesto.kados.slice(i, i + CONCURRENCIA);
  const estados = await Promise.all(
    lote.map(async (k): Promise<EstadoKado['estado']> => {
      try {
        return (await leerEstado(k.publicKey)).estado;
      } catch {
        // Si Horizon no responde para un Kado, no se cae el reporte entero.
        return 'inexistente';
      }
    }),
  );
  lote.forEach((k, j) => {
    filas.push({
      etiqueta:
        codigoPorClave.get(k.publicKey) ?? `${k.publicKey.slice(0, 6)}…${k.publicKey.slice(-4)}`,
      estado: estados[j],
    });
  });
}

const nombre: Record<EstadoKado['estado'], string> = {
  disponible: 'disponible',
  abierto: 'abierto',
  vencido: 'vencido',
  inexistente: 'sin crear',
};

// --------------------------------------------------------------- salida markdown

if (args.has('markdown')) {
  const n = Number(args.get('n') ?? 10);
  const disponibles = filas.filter((f) => f.estado === 'disponible').slice(0, n);
  console.log(
    `Bloque para el README — ${disponibles.length} codigos disponibles de ${manifiesto.evento}:\n`,
  );
  console.log('| Código |');
  console.log('|---|');
  for (const f of disponibles) console.log(`| \`${f.etiqueta}\` |`);
  if (disponibles.length < n) {
    console.log(`\n(quedan ${disponibles.length} disponibles, pediste ${n}: genera otra tanda)`);
  }
  process.exit(0);
}

// --------------------------------------------------------------- salida tabla

const ancho = Math.max(6, ...filas.map((f) => f.etiqueta.length));

console.log(`${manifiesto.evento}  ·  ${manifiesto.red}  ·  vence ${manifiesto.expiraEn.slice(0, 10)}`);
console.log(`${manifiesto.kados.length} Kados\n`);
console.log(`${'CÓDIGO'.padEnd(ancho)}  ESTADO`);
for (const f of filas) console.log(`${f.etiqueta.padEnd(ancho)}  ${nombre[f.estado]}`);

const cuenta = (e: EstadoKado['estado']) => filas.filter((f) => f.estado === e).length;
const partes = [`${cuenta('disponible')} disponibles`, `${cuenta('abierto')} abiertos`];
if (cuenta('vencido')) partes.push(`${cuenta('vencido')} vencidos`);
if (cuenta('inexistente')) partes.push(`${cuenta('inexistente')} sin crear`);
console.log(`\nResumen: ${partes.join(', ')}`);

const abiertos = filas.filter((f) => f.estado === 'abierto');
if (abiertos.length > 0 && codigoPorClave.size > 0) {
  console.log(`Ya abiertos: ${abiertos.map((f) => f.etiqueta).join(', ')}`);
}
